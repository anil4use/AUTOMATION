# AutoFlow — Enterprise Database Connector Architecture Guide

**Version**: 1.0.0  
**Last Updated**: 2026-09-08  
**Status**: Production Ready & Fully Verified  

---

## 📌 Executive Summary

The AutoFlow Enterprise Database Connector Subsystem provides flexible, secure, multi-environment database connectivity across **10 database engines** and **6 connection methods**. It bridges visual workflow automation with enterprise data infrastructure, enabling developers to query, insert, update, aggregate, and manage relational and NoSQL databases safely within workflow executions.

---

## 🗄️ Supported Database Engines & Capabilities

| Database Engine | Category | Connection Schemes Supported | Key Operations / Actions |
| :--- | :--- | :--- | :--- |
| **PostgreSQL** | Relational | `postgresql://`, `postgres://` | Custom Query, Select, Insert, Update, Delete, Upsert, Transactions, Table Inspection |
| **MySQL** | Relational | `mysql://` | Custom Query, Select, Insert, Update, Delete, Table Inspection |
| **MongoDB** | NoSQL | `mongodb://`, `mongodb+srv://` | Find Documents, Insert One/Many, Update One/Many, Delete One/Many, Aggregate Pipeline, Collection Inspection |
| **Redis** | In-Memory | `redis://`, `rediss://` | Get, Set, Del, Publish/Subscribe, Key Search, List Push/Pop, Hash Get/Set, Key Eviction |
| **DynamoDB** | Managed Cloud | Cloud Credentials & Region | PutItem, GetItem, Query, Scan, UpdateItem, DeleteItem, Table Operations |
| **SQL Server (MSSQL)** | Relational | Host/Port, SSL, SSH | Custom Query (`@p1` params), Select, Insert, Update, Stored Procedures |
| **Supabase** | Managed Cloud | API Key & JWT | REST Query, Table Insert, Function Invocation |
| **PlanetScale** | Managed Cloud | Connection String & SSL | Serverless MySQL Query, Branch Execution |
| **Neon Postgres** | Managed Cloud | Connection String & SSL | Serverless Postgres Query, Branch Management |
| **SQLite** | Local File | File Path | File DB Query, In-Memory Execution |

---

## 🔌 Connection Methods

1. **Individual Host & Port Fields**: Manual configuration of host (`localhost`, `10.0.0.1`), port, database name, username, and password.
2. **Connection URI / String**: Full URI string parsing (e.g. `mongodb+srv://usr:pwd@cluster.mongodb.net/dbname`, `postgresql://user:pass@localhost:5432/app`).
3. **SSH Tunnel Forwarding**: Forward connections through a bastion host using password or private key authentication (allocates dynamic local ports in range `15000–25000`).
4. **SSL / TLS Certificates**: Encrypted TLS connections supporting CA Root Certificates, Client Certificates, Client Keys, and `rejectUnauthorized` configuration.
5. **Unix Domain Socket**: Direct local IPC socket connections (e.g. `/var/run/postgresql/.s.PGSQL.5432`).
6. **Read Replicas**: Separate host & port routing for read queries (`SELECT`) vs primary write connections.

---

## 🛡️ Security & Guard Mechanisms

### 1. Dialect-Aware Parameterization (`query-sanitizer.ts`)
Prevents SQL injection vulnerabilities by converting workflow interpolation tokens `{{variable.path}}` into dialect-specific parameter placeholders:
- **PostgreSQL**: `SELECT * FROM users WHERE email = $1 AND status = $2`
- **MySQL**: `SELECT * FROM users WHERE email = ?`
- **SQL Server**: `SELECT * FROM users WHERE email = @p1`

### 2. Automated `LIMIT` Capping
Protects background worker processes from out-of-memory crashes by capping query result sets:
- **Default Cap**: 10,000 rows.
- **Maximum Ceiling**: 50,000 rows.
- **Inner Subquery Preservation**: Subqueries with existing `LIMIT` clauses are preserved without corruption.

### 3. Statement Permission Guard (`allowedStatements`)
Restricts execution privileges based on user configuration:
- Read-only connections can be locked to `['SELECT']`.
- Destructive operations (`DROP`, `TRUNCATE`, `ALTER`) are blocked unless explicitly authorized.

### 4. Production FLUSHDB Protection Lock
Destructive actions like Redis `FLUSHDB` or database flushing require both:
1. Exact string confirmation (`confirmFlush === 'FLUSH'`).
2. Hard block on production connections (`environmentTag === 'production'`).

---

## ⚡ Connection Pool Lifecycle & SSH Tunnel Manager

```
  ┌──────────────────────────────────────────────────────────────────┐
  │                 In-Memory Connection Pool Map                    │
  │                  (Key: organizationId:connectionId)              │
  └──────────────────────────────────────────────────────────────────┘
                                  │
      ┌───────────────────────────┴───────────────────────────┐
      ▼                                                       ▼
┌──────────────┐                                       ┌──────────────┐
│ Active Pool  │                                       │ SSH Tunnel   │
│ Max 5 Conns  │ ◄────── 10-Min Idle Eviction Sweeper ──► │ Local Port   │
│ Lazy Rebuild │                                       │ 15000-25000  │
└──────────────┘                                       └──────────────┘
```

- **10-Minute Eviction Sweeper**: Unused connection pools are automatically closed after 10 minutes of inactivity.
- **Credential Update Teardown**: Calling `destroyPool(connectionId)` ensures stale credentials or closed tunnels are destroyed instantly when saved connections are updated or deleted.
- **Process Teardown Hooks**: Registers `SIGINT` and `SIGTERM` listeners to close open pools and SSH tunnels gracefully on server shutdown.

---

## 🎨 UI & Frontend Workflow (`DatabaseConnectModal.tsx`)

The frontend modal guides users through a safe connection process:
1. **Select Engine**: Visual grid of 10 supported database engines with relational/NoSQL badges.
2. **Select Connection Method**: Toggle between Individual Fields, Connection URI, SSH Tunnel, SSL/TLS, Unix Socket, or Read Replica.
3. **Configure & Mask**: All sensitive inputs (passwords, private keys, SSL certs) display masked placeholders `••••••` when editing.
4. **Environment Tagging**: Select Local, Development, Staging, Beta, or Production (Production triggers prominent warning badges).
5. **Mandatory Verification**: The **Save Connection** button remains disabled until **Test Connection** (`POST /v1/connectors/test-connection`) returns a successful live ping response.

---

## 🧪 Verification & Test Coverage

The subsystem has been verified against 8 automated test suites (`scratch/test_database_connectors.js`):
1. **Test 1**: Parameterizer Dialect Translation (`$1, ?, @p1`).
2. **Test 2**: Regex `LIMIT` Capper (10,000 default & ceiling).
3. **Test 3**: Statement Permission Guard (`allowedStatements`).
4. **Test 4**: Standardized Error Code Mapping (`ECONNREFUSED`, `AUTH_ERROR`, `DB_NOT_FOUND`).
5. **Test 5**: Database Action Executions & Mock Outputs.
6. **Test 6**: Redis `FLUSHDB` Production Protection Lock.
7. **Test 7**: Database Pool Teardown & Lifecycle.
8. **Test 8**: SSH Private Key Auth & Dynamic Tunnel Forwarding.
