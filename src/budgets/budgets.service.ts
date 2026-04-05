import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Budget } from './budget.entity';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { Expense } from 'src/expenses/expense.entity';

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(Budget)
    private budgetsRepository: Repository<Budget>,
    @InjectRepository(Expense)
    private expensesRepository: Repository<Expense>,
  ) {}

  // Get all budgets for a given month/year with spent amounts
  async findAll(userId: string, month: number, year: number) {
    const budgets = await this.budgetsRepository
      .createQueryBuilder('budget')
      .leftJoinAndSelect('budget.category', 'category')
      .andWhere('budget.userId = :userId', { userId })
      .andWhere('budget.month = :month', { month })
      .andWhere('budget.year = :year', { year })
      .getMany();

    // For each budget, calculate how much has been spent
    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        // const spentResult = await this.budgetsRepository
        //   .createQueryBuilder('budget')
        //   .select('SUM(expense.amount)', 'spent')
        //   .from('expenses', 'expense')
        //   .andWhere('expense.userId = :userId', { userId })
        //   .andWhere('expense.categoryId = :categoryId', {
        //     categoryId: budget.categoryId,
        //   })
        //   .andWhere('EXTRACT(MONTH FROM expense.date) = :month', { month })
        //   .andWhere('EXTRACT(YEAR FROM expense.date) = :year', { year })
        const spentResult = await this.expensesRepository
          .createQueryBuilder('expense')
          .select('SUM(expense.amount)', 'spent')
          .andWhere('expense.userId = :userId', { userId })
          .andWhere('expense.categoryId = :categoryId', {
            categoryId: budget.categoryId,
          })
          .andWhere('EXTRACT(MONTH FROM expense.date) = :month', { month })
          .andWhere('EXTRACT(YEAR FROM expense.date) = :year', { year })
          .getRawOne();
        console.log(spentResult, 'spentResult');
        const spent = parseFloat(spentResult?.spent) || 0;
        const percentage =
          budget.amount > 0
            ? Math.round((spent / Number(budget.amount)) * 100)
            : 0;

        return {
          ...budget,
          spent,
          percentage,
          remaining: Math.max(0, Number(budget.amount) - spent),
          isOverBudget: spent > Number(budget.amount),
        };
      }),
    );
    // console.log(budgetsWithSpent, 'srs');

    return budgetsWithSpent;
  }

  async create(userId: string, dto: CreateBudgetDto): Promise<Budget> {
    // Check if budget already exists for this category/month/year
    const existing = await this.budgetsRepository.findOne({
      where: {
        userId,
        categoryId: dto.categoryId,
        month: dto.month,
        year: dto.year,
      },
    });

    if (existing) {
      // Update instead of creating duplicate
      Object.assign(existing, { amount: dto.amount });
      return this.budgetsRepository.save(existing);
    }

    const budget = this.budgetsRepository.create({ ...dto, userId });
    return this.budgetsRepository.save(budget);
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateBudgetDto,
  ): Promise<Budget> {
    const budget = await this.budgetsRepository.findOne({ where: { id } });
    if (!budget) throw new NotFoundException('Budget not found');
    if (budget.userId !== userId) throw new ForbiddenException();

    Object.assign(budget, dto);
    return this.budgetsRepository.save(budget);
  }

  async remove(id: string, userId: string): Promise<void> {
    const budget = await this.budgetsRepository.findOne({ where: { id } });
    if (!budget) throw new NotFoundException('Budget not found');
    if (budget.userId !== userId) throw new ForbiddenException();
    await this.budgetsRepository.remove(budget);
  }

  // Used by alerts in Phase 8
  async getBudgetStatus(
    userId: string,
    categoryId: string,
    month: number,
    year: number,
  ) {
    const budget = await this.budgetsRepository.findOne({
      where: { userId, categoryId, month, year },
    });

    if (!budget) return null;

    const spentResult = await this.budgetsRepository
      .createQueryBuilder('budget')
      .select('SUM(expense.amount)', 'spent')
      .from('expenses', 'expense')
      .where('expense.userId = :userId', { userId })
      .andWhere('expense.categoryId = :categoryId', { categoryId })
      .andWhere('EXTRACT(MONTH FROM expense.date) = :month', { month })
      .andWhere('EXTRACT(YEAR FROM expense.date) = :year', { year })
      .getRawOne();

    const spent = parseFloat(spentResult?.spent) || 0;
    const percentage = Math.round((spent / Number(budget.amount)) * 100);

    return {
      budget,
      spent,
      percentage,
      remaining: Math.max(0, Number(budget.amount) - spent),
      isOverBudget: spent > Number(budget.amount),
      isNearLimit: percentage >= 80 && percentage < 100,
    };
  }
}
