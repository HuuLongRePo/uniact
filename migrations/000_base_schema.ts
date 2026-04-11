/**
 * Migration 000: Base Schema
 * Creates all core tables for UniAct
 */

export async function up(db: any) {
  const run = db.run

  // Users table
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'student')),
      avatar_url TEXT,
      class_id INTEGER,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Classes table
  await run(`
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      grade TEXT,
      teacher_id INTEGER,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(teacher_id) REFERENCES users(id)
    )
  `)

  // Activity Types table
  await run(`
    CREATE TABLE IF NOT EXISTS activity_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      base_points INTEGER DEFAULT 1,
      color TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Organization Levels table
  await run(`
    CREATE TABLE IF NOT EXISTS organization_levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      multiplier REAL DEFAULT 1.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Activities table
  await run(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      date_time DATETIME NOT NULL,
      location TEXT NOT NULL,
      teacher_id INTEGER NOT NULL,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'completed', 'cancelled')),
      approval_status TEXT DEFAULT 'draft' CHECK(approval_status IN ('draft', 'requested', 'approved', 'rejected')),
      max_participants INTEGER,
      registration_deadline DATETIME,
      end_time DATETIME,
      activity_type_id INTEGER,
      organization_level TEXT,
      organization_level_id INTEGER,
      base_points INTEGER,
      approved_by INTEGER,
      approved_at DATETIME,
      approval_notes TEXT,
      submitted_at DATETIME,
      submitted_by INTEGER,
      rejected_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(teacher_id) REFERENCES users(id),
      FOREIGN KEY(activity_type_id) REFERENCES activity_types(id),
      FOREIGN KEY(organization_level_id) REFERENCES organization_levels(id),
      FOREIGN KEY(approved_by) REFERENCES users(id),
      FOREIGN KEY(submitted_by) REFERENCES users(id)
    )
  `)

  // Activity Classes junction table
  await run(`
    CREATE TABLE IF NOT EXISTS activity_classes (
      activity_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      participation_mode TEXT DEFAULT 'mandatory' CHECK(participation_mode IN ('mandatory', 'voluntary')),
      PRIMARY KEY(activity_id, class_id),
      FOREIGN KEY(activity_id) REFERENCES activities(id),
      FOREIGN KEY(class_id) REFERENCES classes(id)
    )
  `)

  // QR Sessions table
  await run(`
    CREATE TABLE IF NOT EXISTS qr_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL,
      creator_id INTEGER NOT NULL,
      session_token TEXT UNIQUE NOT NULL,
      is_active INTEGER DEFAULT 1,
      expires_at DATETIME,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(activity_id) REFERENCES activities(id),
      FOREIGN KEY(creator_id) REFERENCES users(id)
    )
  `)

  // Attendance Records table
  await run(`
    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      qr_session_id INTEGER,
      activity_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      recorded_by INTEGER,
      method TEXT DEFAULT 'qr',
      device_id INTEGER,
      location TEXT,
      note TEXT,
      status TEXT DEFAULT 'present',
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(qr_session_id) REFERENCES qr_sessions(id),
      FOREIGN KEY(activity_id) REFERENCES activities(id),
      FOREIGN KEY(student_id) REFERENCES users(id),
      FOREIGN KEY(recorded_by) REFERENCES users(id)
    )
  `)

  // Participations table
  await run(`
    CREATE TABLE IF NOT EXISTS participations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      attendance_status TEXT DEFAULT 'registered' CHECK(attendance_status IN ('registered', 'attended', 'absent')),
      participation_source TEXT DEFAULT 'voluntary' CHECK(participation_source IN ('voluntary', 'assigned')),
      achievement_level TEXT CHECK(achievement_level IN ('excellent', 'good', 'participated')),
      feedback TEXT,
      evaluated_at DATETIME,
      evaluated_by INTEGER,
      time_slot_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(activity_id, student_id),
      FOREIGN KEY(activity_id) REFERENCES activities(id) ON DELETE CASCADE,
      FOREIGN KEY(student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(evaluated_by) REFERENCES users(id),
      FOREIGN KEY(time_slot_id) REFERENCES activity_time_slots(id)
    )
  `)

  // Student Scores table
  await run(`
    CREATE TABLE IF NOT EXISTS student_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      activity_id INTEGER,
      points REAL DEFAULT 0,
      source TEXT,
      calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES users(id),
      FOREIGN KEY(activity_id) REFERENCES activities(id)
    )
  `)

  // Point Calculations (extended scoring) table
  await run(`
    CREATE TABLE IF NOT EXISTS point_calculations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      participation_id INTEGER,
      activity_id INTEGER,
      base_points REAL,
      coefficient REAL DEFAULT 1,
      bonus_points REAL DEFAULT 0,
      penalty_points REAL DEFAULT 0,
      total_points REAL,
      calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(participation_id) REFERENCES participations(id),
      FOREIGN KEY(activity_id) REFERENCES activities(id)
    )
  `)

  // Activity Approvals table
  await run(`
    CREATE TABLE IF NOT EXISTS activity_approvals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL,
      requested_by INTEGER NOT NULL,
      approver_id INTEGER,
      status TEXT DEFAULT 'requested' CHECK(status IN ('requested', 'approved', 'rejected')),
      note TEXT,
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      decided_at DATETIME,
      FOREIGN KEY(activity_id) REFERENCES activities(id),
      FOREIGN KEY(requested_by) REFERENCES users(id),
      FOREIGN KEY(approver_id) REFERENCES users(id)
    )
  `)

  // Devices table
  await run(`
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      mac_address TEXT UNIQUE NOT NULL,
      device_name TEXT,
      approved INTEGER DEFAULT 0,
      approved_by INTEGER,
      last_seen DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(approved_by) REFERENCES users(id)
    )
  `)

  // WebAuthn Credentials table
  await run(`
    CREATE TABLE IF NOT EXISTS webauthn_credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      credential_id TEXT UNIQUE NOT NULL,
      public_key TEXT NOT NULL,
      counter INTEGER DEFAULT 0,
      transports TEXT,
      device_name TEXT,
      last_used DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `)

  // Security Questions table
  await run(`
    CREATE TABLE IF NOT EXISTS security_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      question_type TEXT,
      question_text TEXT NOT NULL,
      answer_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `)

  // Biometric Templates table
  await run(`
    CREATE TABLE IF NOT EXISTS biometric_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      template_type TEXT CHECK(template_type IN ('face', 'iris', 'fingerprint')),
      template_data TEXT NOT NULL,
      enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_verified DATETIME,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `)

  // Award Types table
  await run(`
    CREATE TABLE IF NOT EXISTS award_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      min_points INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Student Awards table
  await run(`
    CREATE TABLE IF NOT EXISTS student_awards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      award_type_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      awarded_by INTEGER,
      reason TEXT,
      awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(award_type_id) REFERENCES award_types(id),
      FOREIGN KEY(student_id) REFERENCES users(id),
      FOREIGN KEY(awarded_by) REFERENCES users(id)
    )
  `)

  // Award Suggestions table
  await run(`
    CREATE TABLE IF NOT EXISTS award_suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      award_type_id INTEGER NOT NULL,
      suggestion_by INTEGER,
      score_snapshot INTEGER,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      note TEXT,
      suggested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES users(id),
      FOREIGN KEY(award_type_id) REFERENCES award_types(id),
      FOREIGN KEY(suggestion_by) REFERENCES users(id)
    )
  `)

  // Audit Logs table
  await run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id INTEGER,
      action TEXT NOT NULL,
      target_table TEXT,
      target_id INTEGER,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(actor_id) REFERENCES users(id)
    )
  `)

  // Notifications table
  await run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT,
      title TEXT,
      message TEXT,
      related_table TEXT,
      related_id INTEGER,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `)

  // Notification Settings table
  await run(`
    CREATE TABLE IF NOT EXISTS notification_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      email_enabled INTEGER DEFAULT 1,
      new_activity_enabled INTEGER DEFAULT 1,
      reminder_enabled INTEGER DEFAULT 1,
      reminder_days INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `)

  // System Config table
  await run(`
    CREATE TABLE IF NOT EXISTS system_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      config_key TEXT UNIQUE NOT NULL,
      config_value TEXT NOT NULL,
      data_type TEXT CHECK(data_type IN ('string', 'number', 'boolean', 'json')) DEFAULT 'string',
      category TEXT NOT NULL,
      description TEXT,
      updated_by INTEGER,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(updated_by) REFERENCES users(id)
    )
  `)

  // Alerts table
  await run(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT DEFAULT 'info' CHECK(level IN ('info', 'warning', 'error')),
      message TEXT NOT NULL,
      related_table TEXT,
      related_id INTEGER,
      resolved INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Activity Time Slots table
  await run(`
    CREATE TABLE IF NOT EXISTS activity_time_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL,
      slot_date DATE NOT NULL,
      slot_start TIME NOT NULL,
      slot_end TIME NOT NULL,
      max_concurrent INTEGER DEFAULT 500,
      current_registered INTEGER DEFAULT 0,
      status TEXT DEFAULT 'available',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(activity_id, slot_date, slot_start),
      FOREIGN KEY(activity_id) REFERENCES activities(id) ON DELETE CASCADE
    )
  `)

  // Activity Approval History table (workflow audit trail)
  await run(`
    CREATE TABLE IF NOT EXISTS activity_approval_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending_approval', 'approved', 'rejected')),
      notes TEXT,
      changed_by INTEGER NOT NULL,
      changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(activity_id) REFERENCES activities(id) ON DELETE CASCADE,
      FOREIGN KEY(changed_by) REFERENCES users(id)
    )
  `)

  // Activity Attachments table
  await run(`
    CREATE TABLE IF NOT EXISTS activity_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_type TEXT,
      uploaded_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(activity_id) REFERENCES activities(id) ON DELETE CASCADE,
      FOREIGN KEY(uploaded_by) REFERENCES users(id)
    )
  `)

  // Departments table
  await run(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      manager_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(manager_id) REFERENCES users(id)
    )
  `)

  // Subjects table
  await run(`
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE,
      name TEXT NOT NULL,
      credits INTEGER DEFAULT 3,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Grades table
  await run(`
    CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      term TEXT NOT NULL,
      components_json TEXT,
      final_score REAL NOT NULL,
      gpa_contrib REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES users(id),
      FOREIGN KEY(subject_id) REFERENCES subjects(id)
    )
  `)

  // Conduct Scores table
  await run(`
    CREATE TABLE IF NOT EXISTS conduct_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      term TEXT NOT NULL,
      daily_score REAL,
      weekly_score REAL,
      final_conduct_score REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, term),
      FOREIGN KEY(student_id) REFERENCES users(id)
    )
  `)

  // Scoring Rules table
  await run(`
    CREATE TABLE IF NOT EXISTS scoring_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      formula TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      updated_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(updated_by) REFERENCES users(id)
    )
  `)

  // Rules table (for bonus engine)
  await run(`
    CREATE TABLE IF NOT EXISTS rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      applies_to TEXT NOT NULL DEFAULT 'hoc_tap',
      trigger_type TEXT NOT NULL,
      criteria_json TEXT NOT NULL,
      points REAL NOT NULL DEFAULT 0,
      cap_per_term REAL,
      cap_per_year REAL,
      auto_apply INTEGER DEFAULT 1,
      requires_approval INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Suggested Bonus Points table
  await run(`
    CREATE TABLE IF NOT EXISTS suggested_bonus_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      source_type TEXT,
      source_id INTEGER,
      points REAL,
      reason TEXT,
      status TEXT,
      author_id INTEGER,
      approver_id INTEGER,
      evidence_url TEXT,
      apply_to TEXT DEFAULT 'hoc_tap',
      source_provenance TEXT DEFAULT 'manual',
      term TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY(student_id) REFERENCES users(id),
      FOREIGN KEY(author_id) REFERENCES users(id),
      FOREIGN KEY(approver_id) REFERENCES users(id)
    )
  `)

  // Class Teachers junction table (nhiều GV cho 1 lớp)
  await run(`
    CREATE TABLE IF NOT EXISTS class_teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL,
      teacher_id INTEGER NOT NULL,
      role TEXT CHECK(role IN ('primary', 'assistant', 'substitute')) DEFAULT 'primary',
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(class_id, teacher_id),
      FOREIGN KEY(class_id) REFERENCES classes(id),
      FOREIGN KEY(teacher_id) REFERENCES users(id)
    )
  `)

  // Password Reset Requests table
  await run(`
    CREATE TABLE IF NOT EXISTS password_reset_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `)

  // Security Question Attempts table
  await run(`
    CREATE TABLE IF NOT EXISTS security_question_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      ip_address TEXT,
      success INTEGER DEFAULT 0,
      attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `)

  // Biometric Auth Logs table
  await run(`
    CREATE TABLE IF NOT EXISTS biometric_auth_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      template_type TEXT,
      success INTEGER DEFAULT 0,
      confidence REAL,
      ip_address TEXT,
      attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `)

  // Role Assignments table
  await run(`
    CREATE TABLE IF NOT EXISTS role_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      assigned_by INTEGER,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(assigned_by) REFERENCES users(id)
    )
  `)

  // Backup History table
  await run(`
    CREATE TABLE IF NOT EXISTS backup_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      size_bytes INTEGER,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(created_by) REFERENCES users(id)
    )
  `)

  // Error Logs table
  await run(`
    CREATE TABLE IF NOT EXISTS error_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT DEFAULT 'error',
      message TEXT NOT NULL,
      stack TEXT,
      url TEXT,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `)

  // Achievements Multipliers table (for scoring achievements)
  await run(`
    CREATE TABLE IF NOT EXISTS achievement_multipliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      achievement_level TEXT NOT NULL UNIQUE CHECK(achievement_level IN ('excellent', 'good', 'participated')),
      multiplier REAL NOT NULL DEFAULT 1.0,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Achievements table (student contest achievements)
  await run(`
    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      contest_name TEXT NOT NULL,
      level TEXT,
      rank TEXT,
      date TEXT,
      evidence_url TEXT,
      awarded_points_suggested REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  // Create indexes for achievements
  await run(`CREATE INDEX IF NOT EXISTS idx_achievements_student ON achievements(student_id)`)
  await run(`CREATE INDEX IF NOT EXISTS idx_achievements_level ON achievements(level)`)

  console.warn('✓ Base schema migration completed')
}

export const down = async (db: any) => {
  // Rollback function (optional)
  console.warn('Base schema cannot be rolled back in this version')
}
