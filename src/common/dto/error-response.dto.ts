import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

export class FieldErrorDto {
  @ApiProperty({ example: 'INVALID_VALUE' })
  code!: string;

  @ApiProperty({ example: 'Value is invalid' })
  message!: string;
}

@ApiExtraModels(FieldErrorDto)
export class ErrorResponseDto {
  @ApiProperty({ example: 422 })
  statusCode!: number;

  @ApiProperty({ example: 'VALIDATION_FAILED' })
  code!: string;

  @ApiProperty({ example: 'The request contains invalid fields' })
  message!: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: {
      type: 'array',
      items: { $ref: '#/components/schemas/FieldErrorDto' },
    },
  })
  fieldErrors?: Record<string, FieldErrorDto[]>;

  @ApiProperty({
    format: 'uuid',
    example: 'c9f624bc-5bca-43e6-a165-09944200471d',
  })
  requestId!: string;
}
