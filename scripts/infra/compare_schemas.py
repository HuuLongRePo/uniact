#!/usr/bin/env python3
import sqlite3
import sys
from pathlib import Path

def get_tables(db_path):
    """Get list of tables from database"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = sorted([row[0] for row in cursor.fetchall()])
    conn.close()
    return tables

def main():
    current_path = 'uniact.db'
    backup_path = 'uniact.db.backup.20260319'
    
    current = get_tables(current_path)
    backup = get_tables(backup_path)
    
    current_set = set(current)
    backup_set = set(backup)
    
    print(f"Current DB ({current_path}): {len(current)} tables")
    print(f"Backup DB ({backup_path}): {len(backup)} tables")
    print()
    
    missing_in_current = backup_set - current_set
    extra_in_current = current_set - backup_set
    
    if missing_in_current:
        print(f"Missing in current ({len(missing_in_current)}):")
        for table in sorted(missing_in_current):
            print(f"  - {table}")
    else:
        print("No tables missing in current")
    
    print()
    
    if extra_in_current:
        print(f"Extra in current ({len(extra_in_current)}):")
        for table in sorted(extra_in_current):
            print(f"  + {table}")
    else:
        print("No extra tables in current")
    
    print()
    
    if missing_in_current or extra_in_current:

        print("STATUS: SCHEMA MISMATCH")
        return 1
    else:
        print("STATUS: SCHEMAS MATCH (migration updated successfully)")
        return 0

if __name__ == '__main__':
    sys.exit(main())
if __name__ == '__main__':
    exit(main())
