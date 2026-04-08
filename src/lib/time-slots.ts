import { dbRun, dbGet, dbAll } from './database';
import { withTransaction } from './db-core';

export async function createSlots(
  activityId: number,
  slotDate: string,
  totalParticipants: number,
  slotSize = 500
) {
  const needed = Math.max(1, Math.ceil(totalParticipants / slotSize));
  const slots = [];

  for (let i = 0; i < needed; i++) {
    const startHour = 8 + i;
    const endHour = startHour + 1;
    const result = await dbRun(
      `INSERT OR IGNORE INTO activity_time_slots (activity_id, slot_date, slot_start, slot_end, max_concurrent) VALUES (?,?,?,?,?)`,
      [
        activityId,
        slotDate,
        `${String(startHour).padStart(2, '0')}:00:00`,
        `${String(endHour).padStart(2, '0')}:00:00`,
        slotSize,
      ]
    );

    if (result.lastID) {
      const slot = await dbGet('SELECT * FROM activity_time_slots WHERE id = ?', [result.lastID]);
      if (slot) slots.push(slot);
    }
  }

  return slots;
}

export async function listSlots(activityId: number) {
  return await dbAll(
    'SELECT * FROM activity_time_slots WHERE activity_id = ? ORDER BY slot_start',
    [activityId]
  );
}

export async function registerForSlot(participationId: number, slotId: number) {
  return await withTransaction(async () => {
    const slot = (await dbGet('SELECT * FROM activity_time_slots WHERE id = ?', [slotId])) as any;
    if (!slot) throw new Error('Slot not found');
    if (slot.status === 'full') throw new Error('Slot full');

    const updateRes = await dbRun(
      'UPDATE activity_time_slots SET current_registered = current_registered + 1 WHERE id = ? AND current_registered < max_concurrent',
      [slotId]
    );
    if ((updateRes.changes || 0) === 0) throw new Error('Slot full - capacity exceeded');

    const participationRes = await dbRun(
      'UPDATE participations SET time_slot_id = ? WHERE id = ? AND time_slot_id IS NULL',
      [slotId, participationId]
    );
    if ((participationRes.changes || 0) === 0)
      throw new Error('Already assigned or invalid participation');

    const updated = (await dbGet(
      'SELECT current_registered, max_concurrent FROM activity_time_slots WHERE id = ?',
      [slotId]
    )) as any;
    if (!updated) throw new Error('Slot disappeared during registration');
    if (updated.current_registered >= updated.max_concurrent) {
      await dbRun('UPDATE activity_time_slots SET status = ? WHERE id = ?', ['full', slotId]);
    }

    return { success: true };
  });
}
