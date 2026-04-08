#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose()

function normalizeColumns(indexSql) {
  const open = indexSql.indexOf('(')
  const close = indexSql.lastIndexOf(')')
  if (open === -1 || close === -1 || close <= open) return null

  return indexSql
    .slice(open + 1, close)
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ',')
    .trim()
    .toLowerCase()
}

function hasNumericSuffix(indexName) {
  return /_\d+$/.test(indexName)
}

function pickKeeper(indexes) {
  return indexes
    .slice()
    .sort((a, b) => {
      const aNumeric = hasNumericSuffix(a.name) ? 1 : 0
      const bNumeric = hasNumericSuffix(b.name) ? 1 : 0
      if (aNumeric !== bNumeric) return aNumeric - bNumeric
      if (a.name.length !== b.name.length) return a.name.length - b.name.length
      return a.name.localeCompare(b.name)
    })[0]
}

function allAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])))
  })
}

function runAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err)
      resolve({ changes: this.changes || 0 })
    })
  })
}

function closeAsync(db) {
  return new Promise((resolve, reject) => {
    db.close((err) => (err ? reject(err) : resolve()))
  })
}

async function main() {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const dbPath = args.find((arg) => !arg.startsWith('--')) || 'uniact.db'

  const db = new sqlite3.Database(dbPath)

  try {
    const indexes = await allAsync(
      db,
      `SELECT name, tbl_name, sql
       FROM sqlite_master
       WHERE type = 'index' AND sql IS NOT NULL
       ORDER BY tbl_name, name`
    )

    const groups = new Map()

    for (const index of indexes) {
      const columns = normalizeColumns(index.sql)
      if (!columns) continue

      const isUnique = /^\s*CREATE\s+UNIQUE\s+INDEX/i.test(index.sql)
      const key = `${index.tbl_name}|${isUnique ? 'unique' : 'normal'}|${columns}`

      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(index)
    }

    const duplicateGroups = [...groups.entries()]
      .filter(([, group]) => group.length > 1)
      .map(([key, group]) => {
        const [table, uniqueFlag, columns] = key.split('|')
        const keeper = pickKeeper(group)
        const drop = group.filter((idx) => idx.name !== keeper.name)
        return {
          table,
          unique: uniqueFlag === 'unique',
          columns,
          keeper,
          drop,
        }
      })
      .sort((a, b) => {
        if (a.table !== b.table) return a.table.localeCompare(b.table)
        return a.columns.localeCompare(b.columns)
      })

    const totalDropCandidates = duplicateGroups.reduce((sum, group) => sum + group.drop.length, 0)

    console.log(`Database: ${dbPath}`)
    console.log(`Duplicate index groups: ${duplicateGroups.length}`)
    console.log(`Drop candidates: ${totalDropCandidates}`)

    if (duplicateGroups.length === 0) {
      console.log('No duplicate indexes found.')
      return
    }

    for (const group of duplicateGroups) {
      console.log('\n---')
      console.log(`Table: ${group.table}`)
      console.log(`Columns: (${group.columns})`)
      console.log(`Type: ${group.unique ? 'UNIQUE' : 'NORMAL'}`)
      console.log(`Keep: ${group.keeper.name}`)
      console.log(`Drop: ${group.drop.map((idx) => idx.name).join(', ')}`)
    }

    if (!apply) {
      console.log('\nDry run only. Re-run with --apply to drop duplicate indexes.')
      return
    }

    let dropped = 0
    for (const group of duplicateGroups) {
      for (const index of group.drop) {
        await runAsync(db, `DROP INDEX IF EXISTS ${index.name}`)
        dropped += 1
        console.log(`Dropped index: ${index.name}`)
      }
    }

    console.log(`\nCompleted. Dropped ${dropped} duplicate indexes.`)
  } catch (error) {
    console.error('Index audit failed:', error)
    process.exitCode = 1
  } finally {
    await closeAsync(db)
  }
}

main()
