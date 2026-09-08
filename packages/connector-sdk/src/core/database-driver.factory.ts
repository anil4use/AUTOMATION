export interface SSHTunnelConfig {
  enabled: boolean;
  host: string;
  port?: number;
  username: string;
  authMethod?: 'password' | 'key';
  password?: string;
  privateKey?: string;
  passphrase?: string;
  remoteHost?: string;
  remotePort?: number;
}

export interface SSLConfig {
  enabled: boolean;
  mode?: 'disable' | 'require' | 'verify-ca' | 'verify-full';
  caCert?: string;
  clientCert?: string;
  clientKey?: string;
  rejectUnauthorized?: boolean;
}

export interface DatabaseConnectionConfig {
  connectionId?: string;
  dbType?: 'postgresql' | 'mysql' | 'mongodb' | 'redis' | 'dynamodb' | 'mssql' | 'sqlite' | string;
  connectionMethod?: 'uri' | 'fields' | 'ssh_tunnel' | 'ssl' | 'socket' | 'read_replica';
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  schema?: string;
  authDatabase?: string;
  authMechanism?: string;
  dbIndex?: number;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsRegion?: string;
  endpointUrl?: string;
  sshTunnel?: SSHTunnelConfig;
  ssl?: SSLConfig;
  allowedStatements?: string[];
}

interface PoolRecord {
  pool: any;
  tunnel?: any;
  localPort?: number;
  lastUsedAt: number;
  dbType: string;
}

const poolMap = new Map<string, PoolRecord>();
const MAX_ACTIVE_TUNNELS = 20;
let activeTunnelCount = 0;

/**
 * Safely dynamic load Node.js database driver modules without breaking browser client bundles.
 */
function safeRequire(moduleName: string): any {
  if (typeof window !== 'undefined') {
    throw new Error(`Database driver '${moduleName}' cannot be executed in the browser.`);
  }
  try {
    const getReq = new Function('name', 'return require(name)');
    return getReq(moduleName);
  } catch (err: any) {
    throw new Error(`Failed to load database driver '${moduleName}': ${err?.message || err}`);
  }
}

// Idle pool sweeper (only active in Node.js server environments)
if (typeof window === 'undefined') {
  setInterval(() => {
    const now = Date.now();
    const TEN_MINUTES = 10 * 60 * 1000;
    for (const [connId, record] of poolMap.entries()) {
      if (now - record.lastUsedAt > TEN_MINUTES) {
        destroyPool(connId).catch(err => console.error(`[DatabaseFactory] Error sweeping pool ${connId}:`, err));
      }
    }
  }, 60000);
}

/**
 * Destroys a pool and any associated SSH tunnel.
 */
export async function destroyPool(connectionId: string): Promise<void> {
  const record = poolMap.get(connectionId);
  if (!record) return;

  try {
    if (record.pool) {
      if (typeof record.pool.end === 'function') await record.pool.end();
      else if (typeof record.pool.close === 'function') await record.pool.close();
      else if (typeof record.pool.disconnect === 'function') await record.pool.disconnect();
    }
  } catch (err) {
    console.error(`[DatabaseFactory] Error closing pool for ${connectionId}:`, err);
  }

  if (record.tunnel) {
    try {
      if (typeof record.tunnel.close === 'function') record.tunnel.close();
      activeTunnelCount = Math.max(0, activeTunnelCount - 1);
    } catch (err) {
      console.error(`[DatabaseFactory] Error closing SSH tunnel for ${connectionId}:`, err);
    }
  }

  poolMap.delete(connectionId);
}

/**
 * Graceful Process Shutdown Handler
 */
async function gracefulShutdown() {
  console.log('[DatabaseFactory] Gracefully terminating database pools and SSH tunnels...');
  const connIds = Array.from(poolMap.keys());
  for (const connId of connIds) {
    await destroyPool(connId);
  }
  console.log('[DatabaseFactory] All database connections and SSH tunnels closed.');
}

if (typeof process !== 'undefined' && process.on) {
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

/**
 * Creates an SSH tunnel if enabled in configuration.
 */
async function setupSSHTunnelIfNeeded(config: DatabaseConnectionConfig): Promise<{ tunnel?: any; targetHost: string; targetPort: number }> {
  if (!config.sshTunnel || !config.sshTunnel.enabled) {
    return {
      targetHost: config.host || 'localhost',
      targetPort: config.port || 5432,
    };
  }

  if (activeTunnelCount >= MAX_ACTIVE_TUNNELS) {
    throw new Error(`Maximum active SSH tunnels limit (${MAX_ACTIVE_TUNNELS}) reached. Try again later.`);
  }

  const localPort = Math.floor(Math.random() * (25000 - 15000 + 1)) + 15000;
  const sshHost = config.sshTunnel.host;
  const sshPort = config.sshTunnel.port || 22;
  const remoteHost = config.sshTunnel.remoteHost || config.host || '127.0.0.1';
  const remotePort = config.sshTunnel.remotePort || config.port || 5432;

  const tunnelConfig = {
    username: config.sshTunnel.username,
    password: config.sshTunnel.password,
    privateKey: config.sshTunnel.privateKey,
    passphrase: config.sshTunnel.passphrase,
    host: sshHost,
    port: sshPort,
    dstHost: remoteHost,
    dstPort: remotePort,
    localHost: '127.0.0.1',
    localPort: localPort,
  };

  const tunnelSSH = safeRequire('tunnel-ssh');
  return new Promise((resolve, reject) => {
    tunnelSSH(tunnelConfig, (error: any, server: any) => {
      if (error) {
        return reject(new Error(`SSH_TUNNEL_FAILED: ${error.message || String(error)}`));
      }
      activeTunnelCount++;
      resolve({
        tunnel: server,
        targetHost: '127.0.0.1',
        targetPort: localPort,
      });
    });
  });
}

/**
 * Factory for creating temporary or pooled database client connections.
 */
export async function createDatabaseClient(config: DatabaseConnectionConfig): Promise<{ client: any; dbType: string; closeTempConnection?: () => Promise<void> }> {
  const { dbType } = config;
  const { tunnel, targetHost, targetPort } = await setupSSHTunnelIfNeeded(config);

  try {
    if (dbType === 'postgresql') {
      const pg = safeRequire('pg');
      const PGClient = pg.Client || pg;
      const sslOption = config.ssl && config.ssl.enabled
        ? {
            rejectUnauthorized: config.ssl.rejectUnauthorized ?? true,
            ca: config.ssl.caCert,
            cert: config.ssl.clientCert,
            key: config.ssl.clientKey,
          }
        : false;

      let client: any;
      if (config.connectionString) {
        client = new PGClient({ connectionString: config.connectionString, ssl: sslOption });
      } else {
        client = new PGClient({
          host: targetHost,
          port: targetPort,
          database: config.database,
          user: config.username,
          password: config.password,
          ssl: sslOption,
        });
      }

      await client.connect();

      return {
        client,
        dbType,
        closeTempConnection: async () => {
          await client.end();
          if (tunnel) tunnel.close();
        },
      };
    }

    if (dbType === 'mysql') {
      const mysql = safeRequire('mysql2/promise');
      let connection: any;

      if (config.connectionString) {
        connection = await mysql.createConnection(config.connectionString);
      } else {
        connection = await mysql.createConnection({
          host: targetHost,
          port: targetPort,
          database: config.database,
          user: config.username,
          password: config.password,
          ssl: config.ssl && config.ssl.enabled ? { rejectUnauthorized: config.ssl.rejectUnauthorized ?? true } : undefined,
        });
      }

      return {
        client: connection,
        dbType,
        closeTempConnection: async () => {
          await connection.end();
          if (tunnel) tunnel.close();
        },
      };
    }

    if (dbType === 'mongodb') {
      const { MongoClient } = safeRequire('mongodb');
      const uri = config.connectionString || `mongodb://${encodeURIComponent(config.username || '')}:${encodeURIComponent(config.password || '')}@${targetHost}:${targetPort}/${config.database || 'admin'}`;
      const mongoClient = new MongoClient(uri);
      await mongoClient.connect();

      return {
        client: mongoClient,
        dbType,
        closeTempConnection: async () => {
          await mongoClient.close();
          if (tunnel) tunnel.close();
        },
      };
    }

    if (dbType === 'redis') {
      const RedisMod = safeRequire('ioredis');
      const Redis = RedisMod.default || RedisMod;
      let redisClient: any;

      if (config.connectionString) {
        redisClient = new Redis(config.connectionString);
      } else {
        redisClient = new Redis({
          host: targetHost,
          port: targetPort,
          password: config.password,
          db: config.dbIndex || 0,
          username: config.username,
        });
      }

      return {
        client: redisClient,
        dbType,
        closeTempConnection: async () => {
          await redisClient.quit();
          if (tunnel) tunnel.close();
        },
      };
    }

    if (dbType === 'mssql') {
      const mssql = safeRequire('mssql');
      const mssqlConfig: any = config.connectionString
        ? config.connectionString
        : {
            server: targetHost,
            port: targetPort,
            database: config.database,
            user: config.username,
            password: config.password,
            options: { encrypt: config.ssl?.enabled ?? false, trustServerCertificate: !(config.ssl?.rejectUnauthorized ?? true) },
          };

      const connPool = await mssql.connect(mssqlConfig);
      return {
        client: connPool,
        dbType,
        closeTempConnection: async () => {
          await connPool.close();
          if (tunnel) tunnel.close();
        },
      };
    }

    if (dbType === 'dynamodb') {
      const { DynamoDB } = safeRequire('@aws-sdk/client-dynamodb');
      const dynamo = new DynamoDB({
        region: config.awsRegion || 'us-east-1',
        credentials: config.awsAccessKeyId ? { accessKeyId: config.awsAccessKeyId, secretAccessKey: config.awsSecretAccessKey || '' } : undefined,
        endpoint: config.endpointUrl,
      });

      return {
        client: dynamo,
        dbType,
        closeTempConnection: async () => {
          if (tunnel) tunnel.close();
        },
      };
    }

    throw new Error(`Unsupported database type: ${dbType}`);
  } catch (err) {
    if (tunnel) tunnel.close();
    throw err;
  }
}

/**
 * Retrieve or create a persistent database connection pool keyed by connectionId.
 */
export async function getOrCreatePool(config: DatabaseConnectionConfig): Promise<any> {
  const connId = config.connectionId || 'temp_pool_' + Date.now();

  if (poolMap.has(connId)) {
    const record = poolMap.get(connId)!;
    record.lastUsedAt = Date.now();
    return record.pool;
  }

  const { dbType } = config;
  const { tunnel, targetHost, targetPort } = await setupSSHTunnelIfNeeded(config);

  let pool: any;

  if (dbType === 'postgresql') {
    const pg = safeRequire('pg');
    const PGPool = pg.Pool || pg;
    pool = new PGPool({
      host: targetHost,
      port: targetPort,
      database: config.database,
      user: config.username,
      password: config.password,
      connectionString: config.connectionString,
      max: 5,
      idleTimeoutMillis: 600000,
    });
  } else if (dbType === 'mysql') {
    const mysql = safeRequire('mysql2/promise');
    pool = mysql.createPool({
      host: targetHost,
      port: targetPort,
      database: config.database,
      user: config.username,
      password: config.password,
      connectionLimit: 5,
    });
  } else if (dbType === 'mongodb') {
    const { MongoClient } = safeRequire('mongodb');
    const uri = config.connectionString || `mongodb://${encodeURIComponent(config.username || '')}:${encodeURIComponent(config.password || '')}@${targetHost}:${targetPort}/${config.database || 'admin'}`;
    pool = new MongoClient(uri, { maxPoolSize: 5 });
    await pool.connect();
  } else if (dbType === 'redis') {
    const RedisMod = safeRequire('ioredis');
    const Redis = RedisMod.default || RedisMod;
    pool = config.connectionString
      ? new Redis(config.connectionString)
      : new Redis({ host: targetHost, port: targetPort, password: config.password, db: config.dbIndex || 0 });
  } else if (dbType === 'dynamodb') {
    const { DynamoDB } = safeRequire('@aws-sdk/client-dynamodb');
    pool = new DynamoDB({
      region: config.awsRegion || 'us-east-1',
      credentials: config.awsAccessKeyId ? { accessKeyId: config.awsAccessKeyId, secretAccessKey: config.awsSecretAccessKey || '' } : undefined,
      endpoint: config.endpointUrl,
    });
  } else {
    throw new Error(`Unsupported pool database type: ${dbType}`);
  }

  poolMap.set(connId, {
    pool,
    tunnel,
    lastUsedAt: Date.now(),
    dbType: dbType || 'unknown',
  });

  return pool;
}
