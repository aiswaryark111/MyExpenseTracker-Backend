import {
  IsNumber,
  IsString,
  IsDateString,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class CreateExpenseDto {
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  date: string;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsString()
  receiptUrl?: string;
}
