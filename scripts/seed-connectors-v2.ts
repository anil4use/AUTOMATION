import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../apps/backend/.env') });

import { connectDatabase } from '../apps/backend/src/config/database';
import { ConnectorSeederService } from '../apps/backend/src/modules/connectors/connector-seeder.service';
import { logger } from '../apps/backend/src/config/logger';

async function runSeeder() {
  try {
    logger.info('🚀 Starting AutoFlow V2 Connector Platform CLI Seeder Script...');
    await connectDatabase();
    const summary = await ConnectorSeederService.seedAllConnectors();
    console.log('\n==================================================');
    console.log('🎉 AutoFlow V2 Connector Seeding Summary Report');
    console.log('==================================================');
    console.log(`- Categories Seeded: ${summary.categoriesCount}`);
    console.log(`- Connectors Seeded: ${summary.connectorsCount}`);
    console.log(`- Actions Seeded:    ${summary.actionsCount}`);
    console.log(`- Auth Specs Seeded: ${summary.authSpecsCount}`);
    console.log(`- Features Seeded:   ${summary.featuresCount}`);
    console.log(`- Test Specs Seeded: ${summary.testsCount}`);
    console.log(`- Timestamp:         ${summary.timestamp}`);
    console.log('==================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeder script failed:', err);
    process.exit(1);
  }
}

runSeeder();
