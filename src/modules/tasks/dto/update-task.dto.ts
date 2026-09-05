import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, Length, Matches, ValidateIf } from 'class-validator';

export class UpdateTaskDto {
  @ApiPropertyOptional({
    example: 'Review invoicing pull request',
    maxLength: 120,
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Length(1, 120)
  @Matches(/\S/, { message: 'title must contain a non-whitespace character' })
  title?: string;

  @ApiPropertyOptional({
    type: String,
    example: 'Focus on transaction boundaries',
    maxLength: 500,
    nullable: true,
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  @Length(1, 500)
  description?: string | null;
}
