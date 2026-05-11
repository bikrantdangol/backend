/**
 * ZKTeco Scheduler — zkScheduler.js
 *
 * Runs a background cron job that pulls attendance logs from the
 * device every ZK_SYNC_INTERVAL_MINUTES (default: 5).
 *
 * Install: npm install node-cron
 * Called once from server.js after DB connects.
 */

const cron = require("node-cron");
const { syncAttendanceLogs } = require("./zkService");

const INTERVAL = parseInt(process.env.ZK_SYNC_INTERVAL_MINUTES) || 5;

let _job = null;

/**
 * Starts the cron job.
 * Safe to call multiple times — won't start a second job.
 */
const startSyncScheduler = () => {
  if (_job) return;

  // node-cron syntax: every N minutes → "*/{N} * * * *"
  const cronExpr = `*/${INTERVAL} * * * *`;

  _job = cron.schedule(cronExpr, async () => {
    console.log(`[ZK Cron] Running scheduled sync...`);
    try {
      const { synced, skipped } = await syncAttendanceLogs();
      console.log(`[ZK Cron] Done — synced: ${synced}, skipped: ${skipped}`);
    } catch (err) {
      console.error(`[ZK Cron] Sync failed: ${err.message}`);
      // Don't throw — cron will retry on next tick
    }
  });

  console.log(
    `[ZK Cron] Scheduler started — syncing every ${INTERVAL} minute(s)`,
  );
};

/**
 * Stops the cron job gracefully.
 * Call on server shutdown if needed.
 */
const stopSyncScheduler = () => {
  if (_job) {
    _job.stop();
    _job = null;
    console.log("[ZK Cron] Scheduler stopped");
  }
};

module.exports = { startSyncScheduler, stopSyncScheduler };
