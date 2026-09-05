import { plainToInstance, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  validateSync,
} from 'class-validator';

const NODE_ENV_VALUES = ['development', 'test', 'production'] as const;
const AUTH_ALGORITHMS = ['RS256', 'ES256'] as const;

export type NodeEnvironment = (typeof NODE_ENV_VALUES)[number];
export type AuthAlgorithm = (typeof AUTH_ALGORITHMS)[number];
export type AuthEnabled = 'true' | 'false';

export class EnvironmentVariables {
  @IsIn(NODE_ENV_VALUES)
  NODE_ENV!: NodeEnvironment;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT!: number;

  @IsString()
  @IsNotEmpty()
  TRUST_PROXY!: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_HOST!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  DATABASE_PORT!: number;

  @IsString()
  @IsNotEmpty()
  DATABASE_USERNAME!: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_PASSWORD!: string;

  @Matches(/^[a-z_][a-z0-9_]*$/)
  DATABASE_NAME!: string;

  @Matches(/^[a-z_][a-z0-9_]*$/)
  DATABASE_SCHEMA!: string;

  @IsUrl({ require_tld: false })
  AUTH_ISSUER!: string;

  @IsString()
  @IsNotEmpty()
  AUTH_AUDIENCE!: string;

  @IsUrl({ require_tld: false })
  AUTH_JWKS_URI!: string;

  @IsIn(AUTH_ALGORITHMS)
  AUTH_ALGORITHM!: AuthAlgorithm;

  @IsString()
  @IsNotEmpty()
  AUTH_CLIENT_ID!: string;

  @IsIn(['true', 'false'])
  AUTH_ENABLED!: AuthEnabled;

  @IsOptional()
  @IsIn(['true'])
  OPENAPI_GENERATION?: 'true';
}

export function validateEnvironment(
  rawEnvironment: Record<string, unknown>,
): EnvironmentVariables {
  const environment = plainToInstance(EnvironmentVariables, rawEnvironment, {
    enableImplicitConversion: false,
  });
  const errors = validateSync(environment, {
    skipMissingProperties: false,
    whitelist: true,
  });

  if (errors.length > 0) {
    const fields = errors.map((error) => error.property).join(', ');
    throw new Error(`Invalid environment configuration: ${fields}`);
  }

  return environment;
}

export function readEnvironment(): EnvironmentVariables {
  return validateEnvironment(process.env);
}
