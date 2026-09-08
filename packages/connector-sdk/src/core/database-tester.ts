import { createDatabaseClient, DatabaseConnectionConfig } from './database-driver.factory';

export interface TestConnectionResult {
  success: boolean;
  pingMs?: number;
  version?: string;
  code?: string;
  error?: string;
}

/**
 * Standardized Error Code Mapper for Database Drivers
 */
export function mapDatabaseDriverError(err: any): { code: string; message: string } {
  const errMsg = err?.message || String(err);
  const errCode = err?.code || '';
  const upperMsg = errMsg.toUpperCase();

  if (errCode === 'ECONNREFUSED' || upperMsg.includes('ECONNREFUSED') || upperMsg.includes('COULD NOT CONNECT')) {
    return { code: 'ECONNREFUSED', message: 'Could not reach the host. Check host address and port.' };
  }

  if (errCode === 'ETIMEDOUT' || upperMsg.includes('ETIMEDOUT') || upperMsg.includes('TIMED OUT')) {
    return { code: 'ETIMEDOUT', message: 'Connection timed out. Check firewall and IP whitelist.' };
  }

  if (
    upperMsg.includes('AUTHENTICATION') ||
    upperMsg.includes('ACCESS DENIED') ||
    upperMsg.includes('PASSWORD') ||
    upperMsg.includes('AUTH') ||
    errCode === '28P01' || // PG invalid password
    errCode === 'ER_ACCESS_DENIED_ERROR'
  ) {
    return { code: 'AUTH_ERROR', message: 'Authentication failed. Check your username and password.' };
  }

  if (upperMsg.includes('DOES NOT EXIST') || upperMsg.includes('UNKNOWN DATABASE') || errCode === '3D000') {
    return { code: 'DB_NOT_FOUND', message: `Database does not exist on this server.` };
  }

  if (upperMsg.includes('SSL') || upperMsg.includes('CERTIFICATE') || upperMsg.includes('TLS')) {
    return { code: 'SSL_ERROR', message: 'SSL error. Check your SSL mode and certificate.' };
  }

  if (upperMsg.includes('SSH TUNNEL FAILED') || upperMsg.includes('SSH BASTION')) {
    return { code: 'SSH_TUNNEL_FAILED', message: 'SSH tunnel failed. Check SSH host and credentials.' };
  }

  if (upperMsg.includes('SSH_TUNNEL_LOST') || upperMsg.includes('SSH TUNNEL CLOSED')) {
    return { code: 'SSH_TUNNEL_LOST', message: 'SSH tunnel lost. The step will retry automatically.' };
  }

  if (upperMsg.includes('PERMISSION DENIED') || upperMsg.includes('INSUFFICIENT PRIVILEGE') || errCode === '42501') {
    return { code: 'PERMISSION_DENIED', message: 'Permission denied. The user lacks required access.' };
  }

  return { code: 'UNKNOWN_ERROR', message: errMsg };
}

/**
 * Executes a mandatory pre-save live test ping against the target database.
 */
export async function testDatabaseConnection(config: DatabaseConnectionConfig): Promise<TestConnectionResult> {
  const startTime = Date.now();
  let clientWrapper: any = null;

  try {
    // Instantiate database client & SSH tunnel if configured
    clientWrapper = await createDatabaseClient(config);
    const { client, dbType } = clientWrapper;

    let version = 'unknown';

    // Perform database-specific ping test query
    if (dbType === 'postgresql') {
      const res = await client.query('SELECT version() as ver');
      version = res.rows?.[0]?.ver || 'PostgreSQL';
    } else if (dbType === 'mysql') {
      const [rows] = await client.query('SELECT VERSION() as ver');
      version = (rows as any)?.[0]?.ver || 'MySQL';
    } else if (dbType === 'mongodb') {
      const pingRes = await client.db(config.database || 'admin').command({ ping: 1 });
      if (!pingRes.ok && pingRes.ok !== 1) throw new Error('MongoDB ping failed');
      version = 'MongoDB Server';
    } else if (dbType === 'redis') {
      const pong = await client.ping();
      if (pong !== 'PONG') throw new Error(`Redis ping returned unexpected: ${pong}`);
      version = 'Redis Cache';
    } else if (dbType === 'mssql') {
      const res = await client.query`SELECT @@VERSION as ver`;
      version = res.recordset?.[0]?.ver || 'MSSQL';
    } else if (dbType === 'sqlite') {
      const res = client.prepare('SELECT sqlite_version() as ver').get();
      version = res?.ver || 'SQLite';
    } else if (dbType === 'dynamodb') {
      await client.listTables({ Limit: 1 });
      version = 'AWS DynamoDB';
    } else {
      throw new Error(`Unsupported database type for testing: ${dbType}`);
    }

    const pingMs = Date.now() - startTime;

    return {
      success: true,
      pingMs,
      version: version.split('\n')[0],
    };
  } catch (err: any) {
    const { code, message } = mapDatabaseDriverError(err);
    return {
      success: false,
      code,
      error: message,
    };
  } finally {
    if (clientWrapper && clientWrapper.closeTempConnection) {
      await clientWrapper.closeTempConnection();
    }
  }
}
