import { v4 as uuidv4 } from 'uuid';
import { spawn, spawnSync } from 'child_process';
import { updateRunStatus, RunStatus } from './statusStore';
import { logger } from './logger';
import { promises as fs } from 'fs';

export interface TestFilters {
  tags?: string[];
  filePaths?: string[];
  testName?: string;
}

export async function runTests(filters: TestFilters): Promise<string> {
  if (!process.env.PROJECT_DIR) throw new Error('Missing project folder');
  const projectDir = process.env.PROJECT_DIR;
  logger.debug(`Project directory: ${projectDir}`);
  
  const runId = uuidv4();
  updateRunStatus(runId, 'queued');
  const command = `cmd.exe`;
  const args = ['/c','npx','playwright', 'test'];
  if (filters.tags) args.push(`--grep @${filters.tags.join('|@')}`);
  if (filters.filePaths) args.push(...filters.filePaths);
  if (filters.testName) {args.push(`-g ${filters.testName}`);}
  logger.debug(`Running tests with command: ${command} ${args.join(' ')}`); 
  
  const pwProcess = spawn(command, args, {
    cwd: projectDir,
    env: { ...process.env, PW_OUTPUT_DIR: `reports/${runId}` }
  });

  pwProcess.on('spawn', () => updateRunStatus(runId, 'running'));
  
  pwProcess.on('close', (code) => {
    const status: RunStatus['status'] = code === 0 ? 'passed' : 'failed';
    updateRunStatus(runId, status);
  });

  return runId;
}


export async function listTests(filters: TestFilters) {
  if (!process.env.PROJECT_DIR) throw new Error('Missing project folder');
  const projectDir = process.env.PROJECT_DIR;
  try {
    await fs.access(projectDir);
  } catch (error) {
    logger.error(`Directory ${projectDir} does not exist`);
    throw error;
  }
  const command = `cmd.exe`;
  const args = ['/c','npx','playwright','test'];
  if (filters.tags) args.push(`--grep @${filters.tags.join('|@')}`);
  if (filters.filePaths) args.push(...filters.filePaths);
  if (filters.testName) {args.push(`-g ${filters.testName}`);}
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

function parseTestList(output: string) {
  logger.debug('Parsing test list');
  if (!output) {
    logger.debug('Empty test list');
    return [];
  }

  // Implementation to parse Playwright's --list output
  return output.split('\n').filter(line => line.startsWith('  '));
}