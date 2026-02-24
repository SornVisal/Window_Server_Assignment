import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database/database.service';

@Injectable()
export class AppService {
  constructor(private readonly database: DatabaseService) {}

  async getDbHealth(): Promise<{
    ok: boolean;
    schema: string;
    timestamp: string;
  }> {
    const pool = this.database.getPool();
    const result = await pool.query<{ schema: string; timestamp: string }>(
      'select current_schema as schema, now() as timestamp',
    );
    return {
      ok: true,
      schema: String(result.rows[0]?.schema ?? ''),
      timestamp: String(result.rows[0]?.timestamp ?? ''),
    };
  }
}
