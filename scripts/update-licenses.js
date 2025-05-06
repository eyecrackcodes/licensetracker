// Script to run license update manually
require('@babel/register')({
  presets: ['@babel/preset-env', '@babel/preset-typescript'],
  extensions: ['.ts', '.tsx', '.js', '.jsx']
});

// Set environment variables for SureLC API
process.env.SURELC_USERNAME = 'jonathan.kaiser@luminarylife.com';
process.env.SURELC_PASSWORD = 'uav@e$f!#9K6S8L';

// Import functions directly from the data service
const { syncAllProducersLicenses } = require('../src/services/dataService');
const { database } = require('../src/firebase');
const { ref, set, serverTimestamp } = require('firebase/database');

console.log('Starting manual license update...');

// Run the license update directly without using the scheduledTasks module
async function runUpdate() {
  try {
    // Record task start
    await set(ref(database, 'system/tasks/licenseUpdate'), {
      status: 'running',
      startTime: serverTimestamp(),
    });

    // Run the sync
    const result = await syncAllProducersLicenses();
    
    // Log the results
    console.log('License update completed:');
    console.log(`- Producers processed: ${result.producersProcessed}`);
    console.log(`- Licenses updated: ${result.licensesUpdated}`);
    console.log(`- Licenses added: ${result.licensesAdded}`);
    
    if (result.errors.length > 0) {
      console.warn('Errors encountered:');
      result.errors.forEach(error => console.warn(`- ${error}`));
    }

    // Record task completion
    await set(ref(database, 'system/tasks/licenseUpdate'), {
      status: 'completed',
      endTime: serverTimestamp(),
      result: {
        producersProcessed: result.producersProcessed,
        licensesUpdated: result.licensesUpdated,
        licensesAdded: result.licensesAdded,
        hasErrors: result.errors.length > 0,
        errorCount: result.errors.length,
      },
    });

    console.log('License update completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('License update failed:', error);
    
    // Record task failure
    await set(ref(database, 'system/tasks/licenseUpdate'), {
      status: 'failed',
      endTime: serverTimestamp(),
      error: error instanceof Error ? error.message : String(error),
    });
    
    process.exit(1);
  }
}

runUpdate(); 