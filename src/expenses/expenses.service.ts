import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private expensesRepository: Repository<Expense>,
  ) {}

  async create(userId: string, dto: CreateExpenseDto): Promise<Expense> {
    const expense = this.expensesRepository.create({
      ...dto,
      userId,
    });
    return this.expensesRepository.save(expense);
  }

  async findAll(userId: string, query: QueryExpenseDto) {
    const {
      categoryId,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20,
    } = query;

    const qb = this.expensesRepository
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.category', 'category')
      .where('expense.userId = :userId', { userId })
      .orderBy('expense.date', 'DESC')
      .addOrderBy('expense.createdAt', 'DESC');

    if (categoryId) {
      qb.andWhere('expense.categoryId = :categoryId', { categoryId });
    }

    if (startDate) {
      qb.andWhere('expense.date >= :startDate', { startDate });
    }

    if (endDate) {
      qb.andWhere('expense.date <= :endDate', { endDate });
    }

    if (search) {
      qb.andWhere('LOWER(expense.description) LIKE LOWER(:search)', {
        search: `%${search}%`,
      });
    }

    const total = await qb.getCount();
    const expenses = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data: expenses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, userId: string): Promise<Expense> {
    const expense = await this.expensesRepository.findOne({
      where: { id },
      relations: ['category'],
    });

    if (!expense) throw new NotFoundException('Expense not found');
    if (expense.userId !== userId) throw new ForbiddenException();

    return expense;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateExpenseDto,
  ): Promise<Expense> {
    const expense = await this.findOne(id, userId);
    Object.assign(expense, dto);
    return this.expensesRepository.save(expense);
  }

  async remove(id: string, userId: string): Promise<void> {
    const expense = await this.findOne(id, userId);
    await this.expensesRepository.remove(expense);
  }

  // Used by dashboard and analytics
  async getMonthlyTotal(userId: string, month: number, year: number) {
    const result = await this.expensesRepository
      .createQueryBuilder('expense')
      .select('SUM(expense.amount)', 'total')
      .where('expense.userId = :userId', { userId })
      .andWhere('EXTRACT(MONTH FROM expense.date) = :month', { month })
      .andWhere('EXTRACT(YEAR FROM expense.date) = :year', { year })
      .getRawOne();

    return parseFloat(result.total) || 0;
  }

  async getCategoryTotals(userId: string, month: number, year: number) {
    return this.expensesRepository
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.category', 'category')
      .select('category.id', 'categoryId')
      .addSelect('category.name', 'categoryName')
      .addSelect('category.icon', 'categoryIcon')
      .addSelect('SUM(expense.amount)', 'total')
      .where('expense.userId = :userId', { userId })
      .andWhere('EXTRACT(MONTH FROM expense.date) = :month', { month })
      .andWhere('EXTRACT(YEAR FROM expense.date) = :year', { year })
      .groupBy('category.id')
      .addGroupBy('category.name')
      .addGroupBy('category.icon')
      .orderBy('total', 'DESC')
      .getRawMany();
  }

  async getLast6MonthsTotals(userId: string) {
    const results: Array<{ month: string; year: number; total: number }> = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      const total = await this.getMonthlyTotal(userId, month, year);
      results.push({
        month: date.toLocaleString('default', { month: 'short' }),
        year,
        total,
      });
    }

    return results;
  }

  // Daily spending pattern for a given month
  async getDailySpending(userId: string, month: number, year: number) {
    const result = await this.expensesRepository
      .createQueryBuilder('expense')
      .select('EXTRACT(DOW FROM expense.date)', 'dayOfWeek')
      .addSelect('SUM(expense.amount)', 'total')
      .where('expense.userId = :userId', { userId })
      .andWhere('EXTRACT(MONTH FROM expense.date) = :month', { month })
      .andWhere('EXTRACT(YEAR FROM expense.date) = :year', { year })
      .groupBy('EXTRACT(DOW FROM expense.date)')
      .orderBy('EXTRACT(DOW FROM expense.date)', 'ASC')
      .getRawMany();

    // Map 0-6 (Sun-Sat) to day names
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayMap: Record<string, number> = {};
    result.forEach((r) => {
      dayMap[days[parseInt(r.dayOfWeek)]] = parseFloat(r.total) || 0;
    });

    return days.map((day) => ({ day, total: dayMap[day] ?? 0 }));
  }

  // Month over month comparison
  async getMonthComparison(userId: string) {
    const now = new Date();
    type MonthData = {
      label: string;
      month: number;
      year: number;
      total: number;
    };

    // Type the array
    const months: MonthData[] = [];

    for (let i = 2; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const total = await this.getMonthlyTotal(userId, month, year);

      months.push({
        label: date.toLocaleString('default', {
          month: 'long',
          year: 'numeric',
        }),
        month,
        year,
        total,
      });
    }

    // Calculate % change
    return months.map((m, i) => ({
      ...m,
      change:
        i === 0 || months[i - 1].total === 0
          ? null
          : Math.round(
              ((m.total - months[i - 1].total) / months[i - 1].total) * 100,
            ),
    }));
  }

  // All expenses for CSV export
  async getAllForExport(userId: string, month?: number, year?: number) {
    const qb = this.expensesRepository
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.category', 'category')
      .where('expense.userId = :userId', { userId })
      .orderBy('expense.date', 'DESC');

    if (month && year) {
      qb.andWhere('EXTRACT(MONTH FROM expense.date) = :month', {
        month,
      }).andWhere('EXTRACT(YEAR FROM expense.date) = :year', { year });
    }

    return qb.getMany();
  }
}
