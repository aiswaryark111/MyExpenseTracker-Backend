import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { ExpensesModule } from '../expenses/expenses.module';
import { BudgetsModule } from '../budgets/budgets.module';

@Module({
  imports: [ExpensesModule, BudgetsModule],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
