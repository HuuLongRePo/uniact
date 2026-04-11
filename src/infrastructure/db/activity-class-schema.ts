import { dbAll, dbRun } from './db-core';

let ensureActivityClassParticipationModePromise: Promise<void> | null = null;

async function ensureActivityClassParticipationModeInternal(): Promise<void> {
  const columns = (await dbAll(`PRAGMA table_info(activity_classes)`)) as Array<{
    name?: string;
  }>;

  const hasParticipationMode = (columns || []).some(
    (column) => String(column?.name || '') === 'participation_mode'
  );

  if (!hasParticipationMode) {
    await dbRun(
      `ALTER TABLE activity_classes
       ADD COLUMN participation_mode TEXT DEFAULT 'mandatory'
       CHECK(participation_mode IN ('mandatory', 'voluntary'))`
    );
  }

  await dbRun(
    `UPDATE activity_classes
     SET participation_mode = 'mandatory'
     WHERE participation_mode IS NULL OR TRIM(participation_mode) = ''`
  );
}

export async function ensureActivityClassParticipationMode(): Promise<void> {
  if (!ensureActivityClassParticipationModePromise) {
    ensureActivityClassParticipationModePromise = (async () => {
      try {
        await ensureActivityClassParticipationModeInternal();
      } finally {
        ensureActivityClassParticipationModePromise = null;
      }
    })();
  }

  await ensureActivityClassParticipationModePromise;
}
