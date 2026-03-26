import { Injectable } from '@nestjs/common';
import { ExpensesService } from '../expenses/expenses.service';
import { BudgetsService } from '../budgets/budgets.service';

@Injectable()
export class DashboardService {
  constructor(
    private expensesService: ExpensesService,
    private budgetsService: BudgetsService,
  ) {}

  async getSummary(userId: string, month: number, year: number) {
    const [monthlyTotal, categoryTotals, last6Months, budgets] =
      await Promise.all([
        this.expensesService.getMonthlyTotal(userId, month, year),
        this.expensesService.getCategoryTotals(userId, month, year),
        this.expensesService.getLast6MonthsTotals(userId),
        this.budgetsService.findAll(userId, month, year),
      ]);

    const totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0);

    return {
      monthlyTotal,
      totalBudget,
      remaining: Math.max(0, totalBudget - monthlyTotal),
      budgetUsedPercent:
        totalBudget > 0 ? Math.round((monthlyTotal / totalBudget) * 100) : 0,
      categoryTotals,
      last6Months,
      budgets,
    };
  }
}
