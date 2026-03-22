import { IsNumber, IsInt, IsUUID, Min, Max } from 'class-validator';

export class CreateBudgetDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsInt()
  @Min(2024)
  year: number;

  @IsUUID()
  categoryId: string;
}
