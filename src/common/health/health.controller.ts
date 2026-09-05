import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Public } from '../decorators/public.decorator';
import { ErrorResponseDto } from '../dto/error-response.dto';
import { HealthResponseDto } from './health-response.dto';
import { HealthService } from './health.service';

@ApiTags('health')
@Public()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  @ApiOperation({ summary: 'Check whether the process can answer' })
  @ApiOkResponse({ type: HealthResponseDto })
  live(): HealthResponseDto {
    return this.healthService.live();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Check whether dependencies are ready' })
  @ApiOkResponse({ type: HealthResponseDto })
  @ApiServiceUnavailableResponse({ type: ErrorResponseDto })
  async ready(): Promise<HealthResponseDto> {
    return this.healthService.ready();
  }
}
