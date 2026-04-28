import { Injectable } from '@nestjs/common';
import { ExpensesService } from '../expenses/expenses.service';
import { BudgetsService } from '../budgets/budgets.service';
import { RedisService } from '../common/redis.service';

@Injectable()
export class DashboardService {
  constructor(
    private expensesService: ExpensesService,
    private budgetsService: BudgetsService,
    private redisService: RedisService,
  ) {}

  async getSummary(userId: string, month: number, year: number) {
    const cacheKey = `dashboard:${userId}:${month}:${year}`;

    // Check cache first
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      console.log(`Cache HIT: ${cacheKey}`);
      return JSON.parse(cached);
    }

    console.log(`Cache MISS: ${cacheKey} → fetching from DB`);

    // Fetch from DB
    const [monthlyTotal, categoryTotals, last6Months, budgets] =
      await Promise.all([
        this.expensesService.getMonthlyTotal(userId, month, year),
        this.expensesService.getCategoryTotals(userId, month, year),
        this.expensesService.getLast6MonthsTotals(userId),
        this.budgetsService.findAll(userId, month, year),
      ]);

    const totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0);

    const data = {
      monthlyTotal,
      totalBudget,
      remaining: Math.max(0, totalBudget - monthlyTotal),
      budgetUsedPercent:
        totalBudget > 0 ? Math.round((monthlyTotal / totalBudget) * 100) : 0,
      categoryTotals,
      last6Months,
      budgets,
    };

    // Cache for 5 minutes
    await this.redisService.setex(cacheKey, 300, JSON.stringify(data));

    return data;
  }

  // Call this when expenses or budgets change
  async invalidateDashboardCache(userId: string): Promise<void> {
    await this.redisService.delPattern(`dashboard:${userId}:*`);
    console.log(`Cache invalidated for user: ${userId}`);
  }
}
