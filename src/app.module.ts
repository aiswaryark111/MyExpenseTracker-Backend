import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users/users.entity';
import { Expense } from './expenses/expense.entity';
import { Category } from './categories/category.entity';
import { Budget } from './budgets/budget.entity';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ExpensesModule } from './expenses/expenses.module';
import { CategoriesModule } from './categories/categories.module';
import { BudgetsModule } from './budgets/budgets.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UploadModule } from './upload/upload.module';
import { PaymentsModule } from './payments/payments.module';
import { RedisModule } from './common/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: parseInt(config.get<string>('DB_PORT') ?? '5432'),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),
        entities: [User, Expense, Category, Budget],
        synchronize: true, // auto-creates tables (dev only!)
        ssl:
          config.get('NODE_ENV') === 'production'
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),

    UsersModule,
    RedisModule,
    AuthModule,
    ExpensesModule,
    CategoriesModule,
    BudgetsModule,
    DashboardModule,
    UploadModule,
    PaymentsModule,
  ],
})
export class AppModule {}
