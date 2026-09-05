import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthRepository {
  constructor(private readonly dataSource: DataSource) {}

  async ping(): Promise<void> {
    await this.dataSource.query('SELECT 1');
  }
}
