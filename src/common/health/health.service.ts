import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { HealthRepository } from '../../database/repositories/health.repository';

@Injectable()
export class HealthService {
  constructor(private readonly healthRepository: HealthRepository) {}

  live(): HealthResponseDtoResult {
    return { status: 'ok' };
  }

  async ready(): Promise<HealthResponseDtoResult> {
    try {
      await this.healthRepository.ping();
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException({
        code: 'SERVICE_NOT_READY',
        message: 'The service is not ready',
      });
    }
  }
}

type HealthResponseDtoResult = {
  status: 'ok';
};
