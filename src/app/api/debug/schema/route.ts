/**
 * API Route: Check Database Schema
 * GET /api/debug/schema
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbReady } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    await dbReady();

    // Get activities table schema
    const activitiesSchema = await dbAll('PRAGMA table_info(activities)');

    // Get participations table schema
    const participationsSchema = await dbAll('PRAGMA table_info(participations)');

    // Get class_teachers table schema
    const classTeachersSchema = await dbAll('PRAGMA table_info(class_teachers)');

    // Get all indexes
    const indexes = await dbAll(`
      SELECT name, tbl_name 
      FROM sqlite_master 
      WHERE type = 'index' 
      AND name LIKE 'idx_%'
      ORDER BY tbl_name, name
    `);

    // Get tables list
    const tables = await dbAll(`
      SELECT name 
      FROM sqlite_master 
      WHERE type = 'table'
      ORDER BY name
    `);

    return NextResponse.json({
      success: true,
      data: {
        tables: tables.map((t: any) => t.name),
        activities: activitiesSchema.map((col: any) => ({
          name: col.name,
          type: col.type,
          nullable: col.notnull === 0,
          default: col.dflt_value,
        })),
        participations: participationsSchema.map((col: any) => ({
          name: col.name,
          type: col.type,
          nullable: col.notnull === 0,
          default: col.dflt_value,
        })),
        class_teachers: classTeachersSchema.map((col: any) => ({
          name: col.name,
          type: col.type,
          nullable: col.notnull === 0,
          default: col.dflt_value,
        })),
        indexes: indexes.map((idx: any) => `${idx.tbl_name}.${idx.name}`),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
