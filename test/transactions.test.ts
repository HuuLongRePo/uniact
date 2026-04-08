import { describe, it, expect } from 'vitest'
import { dbRun, dbGet, dbReady, withTransaction } from '@/lib/database'

// Simple transactional test: simulate failure mid-chain

describe('Transaction helper', () => {
  it('rolls back on error', async () => {
    await dbReady()
    // Create temp table for test isolation
    await dbRun('CREATE TABLE IF NOT EXISTS tmp_tx (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)')

    try {
      await withTransaction(async () => {
        await dbRun('INSERT INTO tmp_tx (name) VALUES (?)', ['A'])
        await dbRun('INSERT INTO tmp_tx (name) VALUES (?)', ['B'])
        // Force error (unique constraint using same row id logic)
        throw new Error('Forced failure')
      })
    } catch {}

    const remainingRow = await dbGet<{ c?: number }>('SELECT COUNT(*) as c FROM tmp_tx', [])
    const remaining = remainingRow?.c ?? 0
    expect(remaining === 0).toBe(true)
  })

  it('commits on success', async () => {
    await dbReady()
    await dbRun('DELETE FROM tmp_tx')
    await withTransaction(async () => {
      await dbRun('INSERT INTO tmp_tx (name) VALUES (?)', ['X'])
      await dbRun('INSERT INTO tmp_tx (name) VALUES (?)', ['Y'])
    })
    const countRow = await dbGet<{ c: number }>('SELECT COUNT(*) as c FROM tmp_tx')
    expect(countRow.c).toBe(2)
  })
})
