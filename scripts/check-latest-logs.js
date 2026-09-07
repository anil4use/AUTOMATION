const mongoose = require('mongoose');

async function main() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/automation_platform';
  await mongoose.connect(mongoUri);

  const db = mongoose.connection.db;
  const logsCol = db.collection('executionlogs');

  const logs = await logsCol.find().sort({ createdAt: -1 }).limit(5).toArray();
  console.log('--- LATEST 5 EXECUTION LOGS ---');
  logs.forEach(l => {
    console.log(`Log ID: ${l._id} | Workflow: ${l.workflowName} | Status: ${l.status} | Error: ${l.error || 'None'}`);
    if (l.nodeResults) {
      Object.keys(l.nodeResults).forEach(k => {
        const nr = l.nodeResults[k];
        console.log(`  - Node ${k} (${nr.connectorId}): ${nr.status} | Error: ${nr.output?.error || 'None'}`);
      });
    }
  });
  process.exit(0);
}

main().catch(console.error);
