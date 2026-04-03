import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/users.entity';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY')!,
      { apiVersion: '2026-03-25.dahlia' },
    );
  }

  // Create Stripe Checkout Session
  async createCheckoutSession(user: User): Promise<string> {
    let customerId = user.stripeCustomerId;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
      });
      customerId = customer.id;

      // Save to DB
      await this.usersRepository.update(user.id, {
        stripeCustomerId: customerId,
      });
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: this.configService.get<string>('STRIPE_PRICE_ID'),
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${this.configService.get('FRONTEND_URL')}/upgrade/success`,
      cancel_url: `${this.configService.get('FRONTEND_URL')}/upgrade`,
    });

    return session.url!;
  }

  // Create Billing Portal Session (manage/cancel subscription)
  async createPortalSession(user: User): Promise<string> {
    if (!user.stripeCustomerId) {
      throw new BadRequestException('No subscription found');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${this.configService.get('FRONTEND_URL')}/dashboard`,
    });

    return session.url;
  }

  // Handle Stripe Webhooks
  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.configService.get<string>('STRIPE_WEBHOOK_SECRET')!,
      );
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutCompleted(session);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionCancelled(subscription);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await this.handlePaymentFailed(invoice);
        break;
      }
    }
  }

  private async handleCheckoutCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const customerId = session.customer as string;

    // Find user by stripeCustomerId and flip isPremium
    await this.usersRepository.update(
      { stripeCustomerId: customerId },
      { isPremium: true },
    );
  }

  private async handleSubscriptionCancelled(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const customerId = subscription.customer as string;

    // Remove premium when subscription ends
    await this.usersRepository.update(
      { stripeCustomerId: customerId },
      { isPremium: false },
    );
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;

    // Remove premium on failed payment
    await this.usersRepository.update(
      { stripeCustomerId: customerId },
      { isPremium: false },
    );
  }

  // Get current subscription status
  async getSubscriptionStatus(user: User) {
    if (!user.stripeCustomerId) {
      return { isPremium: false, subscription: null };
    }

    const subscriptions = await this.stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'active',
      limit: 1,
    });

    const active = subscriptions.data[0];

    return {
      isPremium: user.isPremium,
      subscription: active
        ? {
            id: active.id,
            status: active.status,
            currentPeriodEnd: new Date(
              active.items.data[0].current_period_end * 1000,
            ).toLocaleDateString('en-IE'),
          }
        : null,
    };
  }
}
