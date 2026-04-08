/**
 * Database query optimization helpers
 */

// Minimal DB interface to avoid hard dependency on better-sqlite3 during build
type SQLiteLikeDb = {
  exec: (sql: string) => unknown;
  prepare: (sql: string) => { get: () => any };
};

/**
 * Create indexes for better query performance
 */
export function createOptimizationIndexes(db: SQLiteLikeDb): void {
  console.warn('[DB Optimization] Creating performance indexes...');

  try {
    // Users table indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_class_id ON users(class_id);
    `);

    // Activities table indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
      CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date_time);
      CREATE INDEX IF NOT EXISTS idx_activities_created_by ON activities(created_by);
    `);

    // Activity registrations indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_registrations_activity ON activity_registrations(activity_id);
      CREATE INDEX IF NOT EXISTS idx_registrations_student ON activity_registrations(student_id);
      CREATE INDEX IF NOT EXISTS idx_registrations_status ON activity_registrations(status);
    `);

    // Activity results indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_results_activity ON activity_results(activity_id);
      CREATE INDEX IF NOT EXISTS idx_results_student ON activity_results(student_id);
    `);

    // Notifications indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
      CREATE INDEX IF NOT EXISTS idx_notifications_date ON notifications(created_at);
    `);

    // Scores indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_scores_student ON student_scores(student_id);
      CREATE INDEX IF NOT EXISTS idx_scores_activity ON student_scores(activity_id);
    `);

    console.warn('[DB Optimization] Indexes created successfully');
  } catch (error) {
    console.error('[DB Optimization] Error creating indexes:', error);
  }
}

/**
 * Analyze database and update statistics
 */
export function analyzeDatabase(db: SQLiteLikeDb): void {
  try {
    db.exec('ANALYZE;');
    console.warn('[DB Optimization] Database analyzed');
  } catch (error) {
    console.error('[DB Optimization] Error analyzing database:', error);
  }
}

/**
 * Vacuum database to reclaim space
 */
export function vacuumDatabase(db: SQLiteLikeDb): void {
  try {
    db.exec('VACUUM;');
    console.warn('[DB Optimization] Database vacuumed');
  } catch (error) {
    console.error('[DB Optimization] Error vacuuming database:', error);
  }
}

/**
 * Get database statistics
 */
export function getDatabaseStats(db: SQLiteLikeDb): any {
  try {
    const pageCount = db.prepare('PRAGMA page_count;').get();
    const pageSize = db.prepare('PRAGMA page_size;').get();
    const freelist = db.prepare('PRAGMA freelist_count;').get();

    return {
      pageCount,
      pageSize,
      freelist,
      estimatedSize: (pageCount as any).page_count * (pageSize as any).page_size,
    };
  } catch (error) {
    console.error('[DB Optimization] Error getting stats:', error);
    return null;
  }
}
