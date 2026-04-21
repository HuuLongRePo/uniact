import { dbAll, dbRun } from './db-core';

let pointCalculationColumnsReady = false;
let pointCalculationColumnsPromise: Promise<void> | null = null;

type TableInfoRow = {
  name?: string | null;
};

async function ensurePointCalculationColumnsInternal(): Promise<void> {
  const columns = (await dbAll("PRAGMA table_info('point_calculations')")) as TableInfoRow[];
  const columnNames = new Set((columns || []).map((column) => String(column?.name || '')));

  if (!columnNames.has('activity_id')) {
    await dbRun('ALTER TABLE point_calculations ADD COLUMN activity_id INTEGER');
  }

  if (!columnNames.has('coefficient')) {
    await dbRun('ALTER TABLE point_calculations ADD COLUMN coefficient REAL DEFAULT 1');
  }
}

export async function ensurePointCalculationColumns(): Promise<void> {
  if (pointCalculationColumnsReady) {
    return;
  }

  if (!pointCalculationColumnsPromise) {
    pointCalculationColumnsPromise = (async () => {
      await ensurePointCalculationColumnsInternal();
      pointCalculationColumnsReady = true;
    })().catch((error) => {
      pointCalculationColumnsPromise = null;
      throw error;
    });
  }

  await pointCalculationColumnsPromise;
}
