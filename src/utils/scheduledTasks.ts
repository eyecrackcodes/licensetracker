import * as dataService from '../services/dataService';
import { ref, set, serverTimestamp } from 'firebase/database';
import { database } from '../firebase';

/**
 * Updates all producer licenses from SureLC
 * This can be called by a scheduler (e.g. cron job, Firebase Cloud Functions, GitHub Actions)
 */
export const runLicenseUpdate = async (): Promise<void> => {
  console.log('Starting scheduled license update from SureLC...');
  
  try {
    // Record task start
    await set(ref(database, 'system/tasks/licenseUpdate'), {
      status: 'running',
      startTime: serverTimestamp(),
    });

    // Run the sync
    const result = await dataService.syncAllProducersLicenses();
    
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
      startTime: serverTimestamp(),
      endTime: serverTimestamp(),
      result: {
        producersProcessed: result.producersProcessed,
        licensesUpdated: result.licensesUpdated,
        licensesAdded: result.licensesAdded,
        hasErrors: result.errors.length > 0,
        errorCount: result.errors.length,
      },
    });
  } catch (error) {
    console.error('Fatal error in license update task:', error);
    
    // Record task failure
    await set(ref(database, 'system/tasks/licenseUpdate'), {
      status: 'failed',
      startTime: serverTimestamp(),
      endTime: serverTimestamp(),
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export default {
  runLicenseUpdate,
}; 