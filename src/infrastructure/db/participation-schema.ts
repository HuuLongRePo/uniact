import { dbAll, dbRun } from './db-core';

let participationColumnsReady = false;
let participationColumnsPromise: Promise<void> | null = null;

type TableInfoRow = {
  name?: string | null;
};

async function ensureParticipationColumnsInternal(): Promise<void> {
  const columns = (await dbAll("PRAGMA table_info('participations')")) as TableInfoRow[];
  const columnNames = new Set((columns || []).map((column) => String(column?.name || '')));

  if (!columnNames.has('participation_source')) {
    await dbRun(
      "ALTER TABLE participations ADD COLUMN participation_source TEXT DEFAULT 'voluntary' CHECK(participation_source IN ('voluntary', 'assigned'))"
    );
  }

  await dbRun(
    "UPDATE participations SET participation_source = 'voluntary' WHERE participation_source IS NULL OR participation_source = ''"
  );
}

export async function ensureParticipationColumns(): Promise<void> {
  if (participationColumnsReady) {
    return;
  }

  if (!participationColumnsPromise) {
    participationColumnsPromise = (async () => {
      await ensureParticipationColumnsInternal();
      participationColumnsReady = true;
    })().catch((error) => {
      participationColumnsPromise = null;
      throw error;
    });
  }

  await participationColumnsPromise;
}
