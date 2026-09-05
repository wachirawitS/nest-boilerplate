import { ConsoleLogger } from '@nestjs/common';

import { readEnvironment } from './environment';

export function createApplicationLogger(): ConsoleLogger {
  const environment = readEnvironment();

  return new ConsoleLogger({
    json: environment.NODE_ENV === 'production',
    colors: environment.NODE_ENV !== 'production',
  });
}
