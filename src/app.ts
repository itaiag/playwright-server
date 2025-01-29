import express from 'express';
import { gitPullHandler } from './githandler'
import { runTests, listTests, getRunReport } from './playwrightApi';
import { getRunStatus } from './statusStore';
import { configureEnv } from './config';
import { logger } from './logger';

configureEnv(); // Load environment variables
const app = express();
app.use(express.json());

// // 3.1 Source Control Endpoints
app.post('/project/update', async (req, res) => {
  try {
    const result = await gitPullHandler();
    res.status(200).json(result);
  } catch (error) {
    logger.error('Git update failed', error);
    res.status(500).json({ error: 'Git update failed' });
  }
});

// // 3.2 Test Execution Endpoints
app.post('/tests/run', async (req, res) => {
  const { tags, filePaths, testName } = req.body;
  const runId = await runTests({ tags, filePaths, testName });
  res.status(202).json({ runId, status: 'queued' });
});

// // 3.3 Test Discovery
app.get('/tests/list', async (req, res) => {
  logger.debug('Listing tests', req.body);
  const { tags, filePaths, testName } = req.body;
  const tests = await listTests({ tags, filePaths, testName });
  res.json(tests);
});

// // 3.4 Status & Reporting
app.get('/tests/run/:runId/status', (req, res) => {
  logger.debug('Getting run status', req.params.runId);
  const status = getRunStatus(req.params.runId);
  res.json(status);
});


app.get('/tests/run/:runId/report', (req, res) => {
  const report = getRunReport(req.params.runId);
  report ? res.json(report) : res.status(404).send('Report not found');
});

// // Server setup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});