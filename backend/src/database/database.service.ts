import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: Pool;
  private readonly schema: string;

  constructor(private readonly config: ConfigService) {
    this.schema = this.config.get<string>('DB_SCHEMA', 'wsDb');
    const sslMode = this.config.get<string>('DB_SSLMODE', 'require');
    const ssl =
      sslMode === 'require' ? { rejectUnauthorized: false } : undefined;

    this.pool = new Pool({
      host: this.config.get<string>('DB_HOST'),
      port: Number(this.config.get<string>('DB_PORT', '5432')),
      user: this.config.get<string>('DB_USER'),
      password: this.config.get<string>('DB_PASSWORD'),
      database: this.config.get<string>('DB_NAME'),
      ssl,
      max: Number(this.config.get<string>('DB_POOL_MAX', '10')),
    });

    this.pool.on('connect', (client) => {
      void client.query(`SET search_path TO "${this.schema}"`);
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      this.logger.log('Initializing database schema and tables...');
      
      await this.pool.query(`CREATE SCHEMA IF NOT EXISTS "${this.schema}"`);
      await this.pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS groups (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          leader_name text,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `);

      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email text NOT NULL UNIQUE,
          name text NOT NULL,
          role text NOT NULL DEFAULT 'member',
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `);

      await this.pool.query(
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text',
      );

      await this.pool.query(
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES groups(id) ON DELETE SET NULL',
      );

      await this.pool.query(
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false',
      );

      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS submissions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
          title text NOT NULL,
          file_url text,
          submitted_at timestamptz NOT NULL DEFAULT now(),
          uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL
        )
      `);

      await this.pool.query(
        'CREATE INDEX IF NOT EXISTS submissions_group_id_idx ON submissions(group_id)',
      );
      await this.pool.query(
        'CREATE INDEX IF NOT EXISTS submissions_uploaded_by_idx ON submissions(uploaded_by)',
      );

      // Seed groups only if they don't exist
      const groupCount = await this.pool.query('SELECT COUNT(*) FROM groups');
      if (Number(groupCount.rows[0].count) === 0) {
        await this.pool.query(`
          INSERT INTO groups (name, leader_name) VALUES
          ('Web Server Team', 'John Doe'),
          ('Database Server Team', 'Jane Smith'),
          ('Mail Server Team', 'Mike Johnson'),
          ('Red Team', 'Sarah Williams'),
          ('Blue Team', 'David Brown'),
          ('Purple Team', 'Emma Davis')
        `);
        this.logger.log('Seeded sample groups');
      } else {
        this.logger.log('Groups already exist, skipping seed');
      }

      // Create default owner account if it doesn't exist
      const ownerCheck = await this.pool.query(
        "SELECT COUNT(*) FROM users WHERE email = 'visal.prv@gmail.com'"
      );
      if (Number(ownerCheck.rows[0].count) === 0) {
        const hashedPassword = await bcrypt.hash('3Eb@bbN#3l*#$x@A', 10);
        await this.pool.query(
          `INSERT INTO users (email, name, role, password_hash, is_approved) 
           VALUES ('visal.prv@gmail.com', 'Visal (Owner)', 'owner', $1, true)`,
          [hashedPassword]
        );
        this.logger.log('Created default owner account (visal.prv@gmail.com)');
      } else {
        this.logger.log('Owner account already exists');
      }

      this.logger.log(`Successfully initialized database schema "${this.schema}"`);
    } catch (error) {
      this.logger.error('Database initialization error:', error instanceof Error ? error.message : String(error));
      this.logger.warn('Continuing with partial initialization. Some features may not work.');
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  getPool(): Pool {
    return this.pool;
  }

  async query<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
    const result = await this.pool.query(text, params);
    return result.rows as T[];
  }
}
