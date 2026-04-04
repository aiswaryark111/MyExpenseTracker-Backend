import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('expenses')
export class ExpensesController {
  constructor(private expensesService: ExpensesService) {}

  @Post()
  create(@Request() req, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(req.user.id, dto);
  }

  @Get()
  findAll(@Request() req, @Query() query: QueryExpenseDto) {
    return this.expensesService.findAll(req.user.id, query);
  }

  @Get('monthly-total')
  getMonthlyTotal(
    @Request() req,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.expensesService.getMonthlyTotal(
      req.user.id,
      parseInt(month),
      parseInt(year),
    );
  }

  @Get('category-totals')
  getCategoryTotals(
    @Request() req,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.expensesService.getCategoryTotals(
      req.user.id,
      parseInt(month),
      parseInt(year),
    );
  }

  @Get('last-6-months')
  getLast6Months(@Request() req) {
    return this.expensesService.getLast6MonthsTotals(req.user.id);
  }

  @Get('daily-spending')
  getDailySpending(
    @Request() req,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.expensesService.getDailySpending(
      req.user.id,
      parseInt(month),
      parseInt(year),
    );
  }

  @Get('month-comparison')
  getMonthComparison(@Request() req) {
    return this.expensesService.getMonthComparison(req.user.id);
  }

  @Get('export')
  async exportCsv(
    @Request() req,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const expenses = await this.expensesService.getAllForExport(
      req.user.id,
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined,
    );

    // Build CSV string
    const headers = 'Date,Description,Category,Amount\n';
    const rows = expenses
      .map(
        (e) =>
          `${e.date},"${e.description || ''}","${e.category?.name || ''}",${e.amount}`,
      )
      .join('\n');

    return { csv: headers + rows };
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.expensesService.findOne(id, req.user.id);
  }

  @Put(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.expensesService.remove(id, req.user.id);
  }
}
