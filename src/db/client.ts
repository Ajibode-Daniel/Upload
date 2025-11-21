import { Pool, PoolClient } from 'pg';
import { databaseConfig } from '../config/database.config';
import { logger } from '../utils/logger';

class DatabaseClient {
  private pool: Pool;
  private static instance: DatabaseClient;

  private constructor() {
    this.pool = new Pool(databaseConfig);
    this.setupListeners();
  }

  public static getInstance(): DatabaseClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new DatabaseClient();
    }
    return DatabaseClient.instance;
  }

  private setupListeners(): void {
    this.pool.on('connect', () => {
      logger.info('New database connection established');
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected database error', { error: err.message });
    });
  }

  public async query(text: string, params?: any[]) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      logger.error('Database query error', { text, error });
      throw error;
    }
  }

  public async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database pool closed');
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}

export const db = DatabaseClient.getInstance();