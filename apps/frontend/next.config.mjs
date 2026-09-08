/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@automation/shared-types'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Mark Node-only packages as external so they are never bundled for the browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        dgram: false,
        child_process: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        util: false,
        buffer: false,
        events: false,
        timers: false,
        'timers/promises': false,
        'util/types': false,
        'cpu-features': false,
        'ssh2': false,
      };

      // Externalize heavy Node-only DB/cache driver packages
      const nodeOnlyPackages = [
        'ioredis',
        'mongodb',
        'mongoose',
        'pg',
        'pg-native',
        'mysql2',
        'mssql',
        'tedious',
        'oracledb',
        'sqlite3',
        'cassandra-driver',
        'redis',
        'dynamoose',
        'ssh2',
        '@aws-sdk/client-dynamodb',
        '@aws-sdk/lib-dynamodb',
      ];

      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        ({ request }, callback) => {
          if (nodeOnlyPackages.some(pkg => request === pkg || request?.startsWith(pkg + '/'))) {
            return callback(null, 'commonjs ' + request);
          }
          callback();
        },
      ];
    }

    // Handle node: URI scheme for both server and client
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /node_modules\/(ioredis|mongodb|pg|mysql2|mssql|tedious)\/.*\.js$/,
      use: 'null-loader',
      issuer: {
        // Only apply null-loader when imported from browser-side code
        not: /[\\/]server[\\/]/,
      },
    });

    return config;
  },
};

export default nextConfig;


