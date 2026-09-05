import {
  HttpStatus,
  UnprocessableEntityException,
  ValidationPipe,
} from '@nestjs/common';
import type { ValidationError } from 'class-validator';

type FieldError = {
  code: string;
  message: string;
};

function collectFieldErrors(
  errors: ValidationError[],
  prefix = '',
): Record<string, FieldError[]> {
  const fieldErrors: Record<string, FieldError[]> = {};

  for (const error of errors) {
    const path = prefix ? `${prefix}.${error.property}` : error.property;
    const constraints = Object.entries(error.constraints ?? {}).map(
      ([code, message]) => ({ code: code.toUpperCase(), message }),
    );

    if (constraints.length > 0) {
      fieldErrors[path] = constraints;
    }

    Object.assign(fieldErrors, collectFieldErrors(error.children ?? [], path));
  }

  return fieldErrors;
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    exceptionFactory: (errors) =>
      new UnprocessableEntityException({
        code: 'VALIDATION_FAILED',
        message: 'The request contains invalid fields',
        fieldErrors: collectFieldErrors(errors),
      }),
  });
}
