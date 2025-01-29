import {logger} from './logger';

export interface RunStatus {
    status: 'queued' | 'running' | 'passed' | 'failed';
    timestamp: Date;
  }
  
  const runs = new Map<string, RunStatus>();
  
  export function updateRunStatus(runId: string, status: RunStatus['status']) {
    logger.debug(`Updating run ${runId} status to ${status}`);
    runs.set(runId, { status, timestamp: new Date() });
  }
  
  export function getRunStatus(runId: string) {
    logger.debug(`Getting run ${runId} status`);
    return runs.get(runId) || { error: 'Run not found' };
  }
  
  export function getRunReport(runId: string) {
    logger.debug(`Getting run ${runId} report`);
    try {
      return require(`../reports/${runId}/report.json`);
    } catch {
      return null;
    }
  }