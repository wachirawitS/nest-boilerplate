import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, Length, Matches, ValidateIf } from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ example: 'Review pull request', maxLength: 120 })
  @IsString()
  @Length(1, 120)
  @Matches(/\S/, { message: 'title must contain a non-whitespace character' })
  title!: string;

  @ApiPropertyOptional({ example: 'Check module boundaries', maxLength: 500 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Length(1, 500)
  description?: string;
}
