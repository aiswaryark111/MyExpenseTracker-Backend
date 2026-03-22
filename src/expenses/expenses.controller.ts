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
