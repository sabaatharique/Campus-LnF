const express = require('express');
const cors = require('cors');
const pool = require('./db');
const lostRoutes = require('./routes/lostReportRoutes');
const foundRoutes = require('./routes/foundReportRoutes');
const claimRoutes = require('./routes/claimRequestRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const archiveRoutes = require('./routes/archiveRoutes');
const userRoutes = require('./routes/userRoutes');
const statsRoutes = require('./routes/statsRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/lost', lostRoutes);
app.use('/api/found', foundRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/archive', archiveRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// BACKGROUND TASK: Auto-archive inactive reports
const runAutoArchive = async () => {
  try {
    console.log('[SCHEDULED TASK] Running auto-archive procedure...');
    await pool.query('CALL auto_archive_inactive_reports()');
    console.log('[SCHEDULED TASK] Auto-archive completed successfully.');
  } catch (err) {
    console.error('[SCHEDULED TASK] Error running auto-archive:', err.message);
  }
};

// Run once on startup
runAutoArchive();

// Run every 24 hours
setInterval(runAutoArchive, 24 * 60 * 60 * 1000);

app.listen(3000, () => console.log('Server running on port 3000'));