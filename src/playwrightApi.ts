import { v4 as uuidv4 } from 'uuid';
import { spawn, spawnSync } from 'child_process';
import { updateRunStatus, RunStatus } from './statusStore';
import { logger } from './logger';
import { promises as fs } from 'fs';
import { readFileSync } from 'fs';

const DEFAULT_JSON_REPORT_FILE_NAME = 'test-results.json';
const REPORTS_DIR = 'reports';
const REPORT_FILE_SUFFIX = '-test-results.json';

export interface TestFilters {
  tags?: string[];
  filePaths?: string[];
  testName?: string;
}

function getProjectDir() {
  if (!process.env.PROJECT_DIR) throw new Error('Missing project folder');
  logger.debug(`Project directory: ${process.env.PROJECT_DIR}`);
  return process.env.PROJECT_DIR;
}

export async function runTests(filters: TestFilters): Promise<string> {
  const projectDir = getProjectDir();
  const runId = uuidv4();
  updateRunStatus(runId, 'queued');
  const command = `cmd.exe`;
  const args = ['/c', 'npx', 'playwright', 'test'];
  if (filters.tags) args.push(`--grep @${filters.tags.join('|@')}`);
  if (filters.filePaths) args.push(...filters.filePaths);
  if (filters.testName) { args.push(`-g ${filters.testName}`); }
  args.push('--reporter=json');
  logger.debug(`Running tests with command: ${command} ${args.join(' ')}`);

  const pwProcess = spawn(command, args, {
    cwd: projectDir,
    env: { ...process.env, PW_OUTPUT_DIR: `reports/${runId}` }
  });

  pwProcess.on('spawn', () => updateRunStatus(runId, 'running'));
  pwProcess.on('close', (code) => {
    const status: RunStatus['status'] = code === 0 ? 'passed' : 'failed';
    updateRunStatus(runId, status);
    copyReport(runId);
  });

  return runId;
}

async function copyReport(runId: string) {
  logger.debug(`Copying report files for run ${runId}`);
  const projectDir = getProjectDir();
  const source_file = `${projectDir}/${DEFAULT_JSON_REPORT_FILE_NAME}`;
  const destination_file = `${REPORTS_DIR}/${runId}${REPORT_FILE_SUFFIX}`;
  logger.debug(`Copying ${source_file} to ${destination_file}`);
  try {
    await fs.mkdir(REPORTS_DIR, { recursive: true });
    await fs.copyFile(source_file, destination_file);
  } catch (error) {
    logger.error('Failed to copy report files', error);
  }
}


export async function listTests(filters: TestFilters) {
  const projectDir = getProjectDir();
  try {
    await fs.access(projectDir);
  } catch (error) {
    logger.error(`Directory ${projectDir} does not exist`);
    throw error;
  }
  const command = `cmd.exe`;
  const args = ['/c', 'npx', 'playwright', 'test'];
  if (filters.tags) args.push(`--grep @${filters.tags.join('|@')}`);
  if (filters.filePaths) args.push(...filters.filePaths);
  if (filters.testName) { args.push(`-g ${filters.testName}`); }
  args.push('--list');
  logger.debug(`Listing tests with command: ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: projectDir,
    encoding: 'utf-8'
  });
  logger.debug('Playwright test list output', result);
  if (result.error) {
    logger.error('Command failed:', result.error);
    throw result.error;
  }
  // 👇 Check Playwright's stderr output
  if (result.stderr) {
    logger.error('Playwright stderr:', result.stderr);
  }


  // Parse output into structured format
  return parseTestList(result.stdout);
}

export function getRunReport(runId: string) {
  const report_file = `${REPORTS_DIR}/${runId}${REPORT_FILE_SUFFIX}`;
  logger.debug(`Getting run ${runId} report from ${report_file}`);
  try {
    return readFileSync(report_file, 'utf8');
  } catch {
    return null;
  }
}

function parseTestList(output: string) {
  logger.debug('Parsing test list');
  if (!output) {
    logger.debug('Empty test list');
    return [];
  }

  return output.split('\n').filter(line => line.startsWith('  '));
}