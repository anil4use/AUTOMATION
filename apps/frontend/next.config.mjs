import webpack from 'webpack';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@automation/shared-types'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Mark Node-only packages as external / fallback false so they are never bundled for the browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        module: false,
        playwright: false,
        'playwright-core': false,
        process: false,
        'node:process': false,
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

      // Externalize heavy Node-only DB/cache/automation packages
      const nodeOnlyPackages = [
        'playwright',
        'playwright-core',
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

    // Fix node: scheme (e.g. node:process, node:fs, node:crypto) for Webpack 5
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
        resource.request = resource.request.replace(/^node:/, '');
      })
    );

    return config;
  },
};

export default nextConfig;
