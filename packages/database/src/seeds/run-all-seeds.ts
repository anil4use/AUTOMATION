import mongoose from 'mongoose';
import { seedFieldCatalog } from './seed-field-catalog';
import { seedCoercionRules } from './seed-coercion-rules';
import { seedSynonymGroups } from './seed-synonym-groups';

export async function runAllSeeds(options: { connector?: string; force?: boolean; dryRun?: boolean } = {}) {
  console.log('🚀 Starting AutoFlow Smart Mapping Database Seed...');
  
  console.log('\n--- 1. Seeding Coercion Rules ---');
  await seedCoercionRules(options);

  console.log('\n--- 2. Seeding Synonym Groups ---');
  await seedSynonymGroups(options);

  console.log('\n--- 3. Seeding Field Catalog from Connector Manifests ---');
  await seedFieldCatalog(options);

  console.log('\n🎉 All Smart Mapping Seeds Completed Successfully!');
}

if (require.main === module) {
  const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/autoflow';
  mongoose.connect(MONGO_URI).then(async () => {
    const isDryRun = process.argv.includes('--dry-run');
    const isForce = process.argv.includes('--force');
    const connArg = process.argv.find(arg => arg.startsWith('--connector='));
    const connector = connArg ? connArg.split('=')[1] : undefined;

    await runAllSeeds({ connector, force: isForce, dryRun: isDryRun });
    await mongoose.disconnect();
  }).catch(err => {
    console.error('❌ Failed to run seeds:', err);
    process.exit(1);
  });
}
