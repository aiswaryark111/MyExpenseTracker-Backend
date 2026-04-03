import {
  Controller,
  Post,
  Get,
  Req,
  Res,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import type { Response } from 'express';
import type { RawBodyRequest } from '@nestjs/common';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  // Create checkout session — redirect to Stripe
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('checkout')
  async createCheckout(@Req() req, @Res() res: Response) {
    const url = await this.paymentsService.createCheckoutSession(req.user);
    return res.json({ url });
  }

  // Open Stripe billing portal to manage subscription
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('portal')
  async createPortal(@Req() req, @Res() res: Response) {
    const url = await this.paymentsService.createPortalSession(req.user);
    return res.json({ url });
  }

  // Get subscription status
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('status')
  getStatus(@Req() req) {
    return this.paymentsService.getSubscriptionStatus(req.user);
  }

  // Stripe webhook — must be raw body, no auth guard
  @Post('webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    await this.paymentsService.handleWebhook(req.rawBody!, signature);
    return { received: true };
  }
}
