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
import { ApiBearerAuth } from '@nestjs/swagger';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('budgets')
export class BudgetsController {
  constructor(private budgetsService: BudgetsService) {}

  @Get()
  findAll(
    @Request() req,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const now = new Date();
    return this.budgetsService.findAll(
      req.user.id,
      parseInt(month) || now.getMonth() + 1,
      parseInt(year) || now.getFullYear(),
    );
  }

  @Post()
  create(@Request() req, @Body() dto: CreateBudgetDto) {
    return this.budgetsService.create(req.user.id, dto);
  }

  @Put(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.budgetsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.budgetsService.remove(id, req.user.id);
  }
}
