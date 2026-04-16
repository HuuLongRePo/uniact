/**
 * Database Queries Module
 * - All business logic queries organized by feature
 * - User, class, activity, approval, scoring helpers
 */

import {
  ActivityType,
  Department,
  Device,
  OrganizationLevel,
  SystemConfig,
  QRSession,
  AttendanceRecord,
} from '@/types/database';
import { cache, CACHE_TTL } from '../../lib/cache';
import { dbRun, dbGet, dbAll, withTransaction } from './db-core';
import { ensureActivityClassParticipationMode } from './activity-class-schema';
import { ensureParticipationColumns } from './participation-schema';

type ActivityClassParticipationMode = 'mandatory' | 'voluntary';

type ActivityClassAssignment = {
  class_id: number;
  participation_mode: ActivityClassParticipationMode;
};

function uniquePositiveIds(values: unknown): number[] {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(
      values.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0)
    )
  );
}

function buildActivityClassAssignments(activityData: any): ActivityClassAssignment[] {
  const hasExplicitScope =
    activityData?.mandatory_class_ids !== undefined ||
    activityData?.voluntary_class_ids !== undefined;

  const mandatoryClassIds = hasExplicitScope
    ? uniquePositiveIds(activityData?.mandatory_class_ids)
    : uniquePositiveIds(activityData?.class_ids);
  const mandatorySet = new Set(mandatoryClassIds);
  const voluntaryClassIds = uniquePositiveIds(activityData?.voluntary_class_ids).filter(
    (classId) => !mandatorySet.has(classId)
  );

  return [
    ...mandatoryClassIds.map((class_id) => ({
      class_id,
      participation_mode: 'mandatory' as const,
    })),
    ...voluntaryClassIds.map((class_id) => ({
      class_id,
      participation_mode: 'voluntary' as const,
    })),
  ];
}

async function materializeMandatoryParticipationsForActivity(
  activityId: number
): Promise<{ created: number; upgraded: number }> {
  await ensureParticipationColumns();
  await ensureActivityClassParticipationMode();

  const classRows = (await dbAll(
    `SELECT class_id
     FROM activity_classes
     WHERE activity_id = ?
       AND COALESCE(participation_mode, 'mandatory') = 'mandatory'`,
    [activityId]
  )) as Array<{ class_id: number }>;

  const classIds = Array.from(
    new Set(
      (classRows || [])
        .map((row) => Number(row?.class_id))
        .filter((classId) => Number.isFinite(classId))
    )
  );

  if (classIds.length === 0) {
    return { created: 0, upgraded: 0 };
  }

  const placeholders = classIds.map(() => '?').join(', ');
  const students = (await dbAll(
    `SELECT id
     FROM users
     WHERE role = 'student'
       AND COALESCE(is_active, 1) = 1
       AND class_id IN (${placeholders})
     ORDER BY id`,
    classIds
  )) as Array<{ id: number }>;

  let created = 0;
  let upgraded = 0;

  for (const student of students || []) {
    const studentId = Number(student?.id);
    if (!Number.isFinite(studentId)) {
      continue;
    }

    const insertResult = await dbRun(
      `INSERT OR IGNORE INTO participations (
         activity_id,
         student_id,
         attendance_status,
         participation_source
       )
       VALUES (?, ?, 'registered', 'assigned')`,
      [activityId, studentId]
    );

    if (Number(insertResult?.changes || 0) > 0) {
      created += Number(insertResult?.changes || 0);
      continue;
    }

    const upgradeResult = await dbRun(
      `UPDATE participations
       SET participation_source = 'assigned',
           updated_at = CURRENT_TIMESTAMP
       WHERE activity_id = ?
         AND student_id = ?
         AND COALESCE(participation_source, 'voluntary') <> 'assigned'`,
      [activityId, studentId]
    );

    if (Number(upgradeResult?.changes || 0) > 0) {
      upgraded += Number(upgradeResult?.changes || 0);
    }
  }

  return { created, upgraded };
}

/**
 * ===== USER QUERIES =====
 */
export const dbHelpers = {
  /**
   * Get user by email address
   * @param email - User email to search for
   * @returns User record with all fields, or undefined if not found
   * @example
   * const user = await dbHelpers.getUserByEmail('student@school.edu');
   */
  getUserByEmail: async (email: string) => {
    return await dbGet('SELECT * FROM users WHERE email = ?', [email]);
  },

  /**
   * Get user by ID with key profile fields
   * @param id - User ID
   * @returns User record with id, email, name, role, avatar_url, class_id, created_at
   */
  getUserById: async (id: number) => {
    return await dbGet(
      'SELECT id, email, name, role, avatar_url, class_id, created_at FROM users WHERE id = ?',
      [id]
    );
  },

  /**
   * Create new user account
   * @param userData - Object with email, name, role, password_hash, avatar_url, class_id
   * @returns Object with lastID (new user ID) and changes count
   */
  createUser: async (userData: any) => {
    const result = await dbRun(
      `INSERT INTO users (email, name, role, password_hash, avatar_url, class_id) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userData.email,
        userData.name,
        userData.role,
        userData.password_hash,
        userData.avatar_url,
        userData.class_id,
      ]
    );
    return result;
  },

  /**
   * Get all student users in a class
   * @param classId - Class ID to filter students
   * @returns Array of student records with id, email, name, role, avatar_url, created_at
   */
  getUsersByClass: async (classId: number) => {
    return await dbAll(
      `SELECT id, email, name, role, avatar_url, created_at FROM users WHERE class_id = ? AND role = 'student' ORDER BY name`,
      [classId]
    );
  },

  /**
   * Get all teachers in system (cached)
   * Cache TTL: 1 hour
   * @returns Array of teacher records with id, email, name, avatar_url
   */
  getTeachers: async () => {
    return cache.get('teachers:all', CACHE_TTL.TEACHERS, async () => {
      return await dbAll(
        `SELECT id, email, name, avatar_url FROM users WHERE role = 'teacher' ORDER BY name`
      );
    });
  },

  /**
   * ===== CLASS QUERIES =====
   */

  /**
   * Get all classes in system (cached)
   * Cache TTL: 1 hour
   * @returns Array of all class records with full data
   */
  getAllClasses: async () => {
    return cache.get('classes:all', CACHE_TTL.CLASSES, async () => {
      return await dbAll('SELECT * FROM classes ORDER BY name');
    });
  },

  /**
   * Get all classes with teacher names and student count (cached)
   * Cache TTL: 1 hour
   * @returns Array with additional teacher_name and student_count fields
   */
  getAllClassesWithTeachers: async () => {
    return cache.get('classes:with_teachers', CACHE_TTL.CLASSES, async () => {
      return await dbAll(
        `SELECT c.*, u.name as teacher_name, (SELECT COUNT(*) FROM users WHERE class_id = c.id) as student_count FROM classes c LEFT JOIN users u ON c.teacher_id = u.id ORDER BY c.name`
      );
    });
  },

  /**
   * Get class by ID with teacher info and student count
   * @param id - Class ID
   * @returns Class record with teacher_name and student_count fields
   */
  getClassById: async (id: number) => {
    return await dbGet(
      `SELECT c.*, u.name as teacher_name, (SELECT COUNT(*) FROM users WHERE class_id = c.id) as student_count FROM classes c LEFT JOIN users u ON c.teacher_id = u.id WHERE c.id = ?`,
      [id]
    );
  },

  /**
   * Create new class
   * Invalidates classes cache after creation
   * @param classData - Object with name, grade, teacher_id, description
   * @returns Object with lastID (new class ID) and changes count
   */
  createClass: async (classData: any) => {
    const result = await dbRun(
      `INSERT INTO classes (name, grade, teacher_id, description) VALUES (?, ?, ?, ?)`,
      [classData.name, classData.grade, classData.teacher_id, classData.description]
    );
    cache.invalidatePrefix('classes:');
    return result;
  },

  /**
   * ===== ACTIVITY QUERIES =====
   */

  /**
   * Get all activities ordered by most recent first
   * @returns Array of all activity records
   */
  getAllActivities: async () => {
    return await dbAll('SELECT * FROM activities ORDER BY date_time DESC');
  },

  /**
   * Get all activities with teacher info and participation stats
   * Includes: teacher_name, participant_count, available_slots
   * @returns Array of activities with enriched data
   */
  getAllActivitiesWithTeachers: async () => {
    return await dbAll(
      `SELECT a.*, u.name as teacher_name, (SELECT COUNT(*) FROM participations WHERE activity_id = a.id AND attendance_status = 'registered') as participant_count, (a.max_participants - (SELECT COUNT(*) FROM participations WHERE activity_id = a.id AND attendance_status = 'registered')) as available_slots FROM activities a LEFT JOIN users u ON a.teacher_id = u.id ORDER BY a.date_time DESC`
    );
  },

  /**
   * Get all activities created by a specific teacher
   * Includes participation and attendance counts
   * @param teacherId - Teacher user ID
   * @returns Array of teacher's activities with participant/attended counts
   */
  getActivitiesByTeacher: async (teacherId: number) => {
    return await dbAll(
      `
      SELECT a.*, 
             u.name as teacher_name,
             u.name as teacher_full_name,
             (SELECT COUNT(*) FROM participations WHERE activity_id = a.id AND attendance_status IN ('registered', 'attended')) as participant_count,
             (SELECT COUNT(*) FROM participations WHERE activity_id = a.id AND attendance_status = 'attended') as attended_count
      FROM activities a 
      LEFT JOIN users u ON a.teacher_id = u.id 
      WHERE a.teacher_id = ? 
      ORDER BY a.date_time DESC
    `,
      [teacherId]
    );
  },

  /**
   * Get activities a teacher can operate on through ownership or related classes
   * Includes participation and attendance counts
   * @param teacherId - Teacher user ID
   * @returns Array of accessible activities for attendance/QR/evaluation operations
   */
  getOperationalActivitiesByTeacher: async (teacherId: number) => {
    return await dbAll(
      `
      SELECT a.*,
             u.name as teacher_name,
             u.name as teacher_full_name,
             (SELECT COUNT(*) FROM participations WHERE activity_id = a.id AND attendance_status IN ('registered', 'attended')) as participant_count,
             (SELECT COUNT(*) FROM participations WHERE activity_id = a.id AND attendance_status = 'attended') as attended_count
      FROM activities a
      LEFT JOIN users u ON a.teacher_id = u.id
      WHERE a.teacher_id = ?
         OR EXISTS (
           SELECT 1
           FROM activity_classes ac
           JOIN classes c ON c.id = ac.class_id
           LEFT JOIN class_teachers ct ON ct.class_id = c.id
           WHERE ac.activity_id = a.id
             AND (c.teacher_id = ? OR ct.teacher_id = ?)
         )
      ORDER BY a.date_time DESC
    `,
      [teacherId, teacherId, teacherId]
    );
  },

  /**
   * Get activity by ID with all fields
   * @param activityId - Activity ID
   * @returns Activity record or undefined if not found
   */
  getActivityById: async (activityId: number) => {
    return (await dbGet('SELECT * FROM activities WHERE id = ?', [activityId])) as any;
  },

  /**
   * Create new activity with optional class assignments
   * - Creates activity record
   * - Creates activity_classes junction entries for specified classes
   * - Logs create action in audit_logs
   * @param activityData - Object with title, description, date_time, location, teacher_id, max_participants, status, approval_status, registration_deadline, activity_type_id, organization_level_id, class_ids
   * @returns Object with lastID (new activity ID) and changes count
   */
  createActivity: async (activityData: any) => {
    await ensureActivityClassParticipationMode();

    const result = await dbRun(
      `INSERT INTO activities (
        title, description, date_time, location, teacher_id, max_participants,
        status, approval_status, registration_deadline, activity_type_id, organization_level_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        activityData.title,
        activityData.description,
        activityData.date_time,
        activityData.location,
        activityData.teacher_id,
        activityData.max_participants,
        activityData.status || 'draft',
        activityData.approval_status || 'draft',
        activityData.registration_deadline || null,
        activityData.activity_type_id || null,
        activityData.organization_level_id || null,
      ]
    );

    // Insert class relationships into activity_classes junction table
    for (const assignment of buildActivityClassAssignments(activityData)) {
      try {
        await dbRun(
          `INSERT OR IGNORE INTO activity_classes (activity_id, class_id, participation_mode)
           VALUES (?, ?, ?)`,
          [result.lastID, assignment.class_id, assignment.participation_mode]
        );
      } catch (err) {
        console.warn(`âš ï¸  Failed to insert activity-class mapping: ${err}`);
      }
    }

    if (activityData.class_ids && Array.isArray(activityData.class_ids)) {
      for (const classId of activityData.class_ids) {
        try {
          await dbRun(
            'INSERT OR IGNORE INTO activity_classes (activity_id, class_id) VALUES (?, ?)',
            [result.lastID, classId]
          );
        } catch (err) {
          console.warn(`⚠️  Failed to insert activity-class mapping: ${err}`);
        }
      }
    }

    try {
      await dbRun(
        'INSERT INTO audit_logs (actor_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
        [
          activityData.teacher_id || null,
          'create_activity',
          'activities',
          result.lastID || null,
          JSON.stringify({ title: activityData.title }),
        ]
      );
    } catch (auditErr) {
      console.error('⚠️  Failed to create audit log for activity:', auditErr);
    }

    return result;
  },

  /**
   * Update activity fields selectively
   * - Supports updating: title, description, date_time, location, max_participants,
   *   registration_deadline, activity_type_id, organization_level_id, status, approval_status
   * - Can update class_ids via junction table
   * @param activityId - Activity ID to update
   * @param activityData - Object with fields to update (partial)
   * @returns Object with changes count
   */
  updateActivity: async (activityId: number, activityData: any) => {
    await ensureActivityClassParticipationMode();

    const updates: string[] = [];
    const values: any[] = [];
    let classMappingsUpdated = false;

    if (activityData.title !== undefined) {
      updates.push('title = ?');
      values.push(activityData.title);
    }
    if (activityData.description !== undefined) {
      updates.push('description = ?');
      values.push(activityData.description);
    }
    if (activityData.date_time !== undefined) {
      updates.push('date_time = ?');
      values.push(activityData.date_time);
    }
    if (activityData.location !== undefined) {
      updates.push('location = ?');
      values.push(activityData.location);
    }
    if (activityData.max_participants !== undefined) {
      updates.push('max_participants = ?');
      values.push(activityData.max_participants);
    }
    if (activityData.registration_deadline !== undefined) {
      updates.push('registration_deadline = ?');
      values.push(activityData.registration_deadline);
    }
    if (activityData.activity_type_id !== undefined) {
      updates.push('activity_type_id = ?');
      values.push(activityData.activity_type_id);
    }
    if (activityData.organization_level_id !== undefined) {
      updates.push('organization_level_id = ?');
      values.push(activityData.organization_level_id);
    }
    const hasExtendedClassScope =
      activityData.mandatory_class_ids !== undefined ||
      activityData.voluntary_class_ids !== undefined;
    if (hasExtendedClassScope) {
      try {
        await dbRun('DELETE FROM activity_classes WHERE activity_id = ?', [activityId]);

        for (const assignment of buildActivityClassAssignments(activityData)) {
          await dbRun(
            `INSERT OR IGNORE INTO activity_classes (activity_id, class_id, participation_mode)
             VALUES (?, ?, ?)`,
            [activityId, assignment.class_id, assignment.participation_mode]
          );
        }

        classMappingsUpdated = true;
      } catch (err) {
        console.warn(`âš ï¸  Failed to update activity-class mappings: ${err}`);
      }
    }
    // Update junction table relationships when class_ids provided
    if (!hasExtendedClassScope && activityData.class_ids !== undefined) {
      try {
        // Delete old relationships
        await dbRun('DELETE FROM activity_classes WHERE activity_id = ?', [activityId]);

        // Insert new relationships
        if (Array.isArray(activityData.class_ids)) {
          for (const classId of activityData.class_ids) {
            await dbRun(
              'INSERT OR IGNORE INTO activity_classes (activity_id, class_id) VALUES (?, ?)',
              [activityId, classId]
            );
          }
        }

        classMappingsUpdated = true;
      } catch (err) {
        console.warn(`⚠️  Failed to update activity-class mappings: ${err}`);
      }
    }
    if (activityData.status !== undefined) {
      updates.push('status = ?');
      values.push(activityData.status);
    }
    if (activityData.approval_status !== undefined) {
      updates.push('approval_status = ?');
      values.push(activityData.approval_status);
    }

    if (updates.length === 0) {
      return { changes: classMappingsUpdated ? 1 : 0 };
    }

    values.push(activityId);
    const sql = `UPDATE activities SET ${updates.join(', ')} WHERE id = ?`;
    const result = await dbRun(sql, values);

    if (classMappingsUpdated && result.changes === 0) {
      return { ...result, changes: 1 };
    }

    return result;
  },

  /**
   * Get available activities for a student
   * Filters by: published status, accessible classes (or no class restriction)
   * Includes: teacher_name, activity_type, organization_level, participant_count,
   * available_slots, is_registered (for this student)
   * @param studentId - Student user ID
   * @param classId - Optional class ID to filter by student's class
   * @returns Array of available activities for student
   */
  getActivitiesForStudent: async (studentId: number, classId?: number | null) => {
    await ensureParticipationColumns();
    await ensureActivityClassParticipationMode();

    let query = `
      SELECT 
        a.*,
        u.name as teacher_name,
        at.name as activity_type,
        ol.name as organization_level,
        (SELECT COUNT(*) FROM participations WHERE activity_id = a.id) as participant_count,
        (a.max_participants - (SELECT COUNT(*) FROM participations WHERE activity_id = a.id)) as available_slots,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM participations
            WHERE activity_id = a.id AND student_id = ?
          ) THEN 1
          ELSE 0
        END as is_registered,
        (
          SELECT p.attendance_status
          FROM participations p
          WHERE p.activity_id = a.id AND p.student_id = ?
          LIMIT 1
        ) as registration_status,
        (
          SELECT p.participation_source
          FROM participations p
          WHERE p.activity_id = a.id AND p.student_id = ?
          LIMIT 1
        ) as participation_source,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM participations p
            WHERE p.activity_id = a.id
              AND p.student_id = ?
              AND p.participation_source = 'assigned'
          ) THEN 1
          WHEN ? IS NOT NULL AND EXISTS (
            SELECT 1 FROM activity_classes
            WHERE activity_id = a.id
              AND class_id = ?
              AND COALESCE(participation_mode, 'mandatory') = 'mandatory'
          ) THEN 1
          ELSE 0
        END as is_mandatory,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM participations p
            WHERE p.activity_id = a.id
              AND p.student_id = ?
              AND p.participation_source = 'assigned'
          ) THEN 1
          WHEN NOT EXISTS (
            SELECT 1 FROM activity_classes
            WHERE activity_id = a.id
          ) THEN 1
          WHEN ? IS NOT NULL AND EXISTS (
            SELECT 1 FROM activity_classes
            WHERE activity_id = a.id AND class_id = ?
          ) THEN 1
          ELSE 0
        END as applies_to_student,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM participations p
            WHERE p.activity_id = a.id
              AND p.student_id = ?
              AND p.participation_source = 'assigned'
          ) THEN 'mandatory_class_scope'
          WHEN NOT EXISTS (
            SELECT 1 FROM activity_classes
            WHERE activity_id = a.id
          ) THEN 'open_scope'
          WHEN ? IS NOT NULL AND EXISTS (
            SELECT 1 FROM activity_classes
            WHERE activity_id = a.id
              AND class_id = ?
              AND COALESCE(participation_mode, 'mandatory') = 'mandatory'
          ) THEN 'mandatory_class_scope'
          WHEN ? IS NOT NULL AND EXISTS (
            SELECT 1 FROM activity_classes
            WHERE activity_id = a.id
              AND class_id = ?
              AND COALESCE(participation_mode, 'mandatory') = 'voluntary'
          ) THEN 'voluntary_class_scope'
          ELSE 'class_scope_mismatch'
        END as applicability_scope
      FROM activities a
      LEFT JOIN users u ON a.teacher_id = u.id
      LEFT JOIN activity_types at ON at.id = a.activity_type_id
      LEFT JOIN organization_levels ol ON ol.id = a.organization_level_id
      WHERE a.status = 'published'
    `;

    const normalizedClassId =
      typeof classId === 'number' && Number.isFinite(classId) ? Number(classId) : null;
    const params: any[] = [
      studentId,
      studentId,
      studentId,
      studentId,
      normalizedClassId,
      normalizedClassId,
      studentId,
      normalizedClassId,
      normalizedClassId,
      studentId,
      normalizedClassId,
      normalizedClassId,
      normalizedClassId,
      normalizedClassId,
    ];

    query += ' ORDER BY a.date_time DESC';
    return await dbAll(query, params);
  },

  /**
   * Get specific student's participation record for an activity
   * @param activityId - Activity ID
   * @param studentId - Student user ID
   * @returns Participation record or undefined if student not registered
   */
  getParticipationByActivityStudent: async (activityId: number, studentId: number) => {
    await ensureParticipationColumns();

    return await dbGet('SELECT * FROM participations WHERE activity_id = ? AND student_id = ?', [
      activityId,
      studentId,
    ]);
  },

  /**
   * ===== SYSTEM CONFIGURATION & METADATA =====
   */
  getDepartments: async (): Promise<Department[]> => {
    return (await dbAll('SELECT * FROM departments ORDER BY name')) as Department[];
  },
  getActivityTypes: async (): Promise<ActivityType[]> => {
    return cache.get('activity_types:all', CACHE_TTL.ACTIVITY_TYPES, async () => {
      return (await dbAll('SELECT * FROM activity_types ORDER BY name')) as ActivityType[];
    });
  },
  getOrganizationLevels: async (): Promise<OrganizationLevel[]> => {
    return cache.get('organization_levels:all', CACHE_TTL.ORGANIZATION_LEVELS, async () => {
      return (await dbAll(
        'SELECT * FROM organization_levels ORDER BY multiplier DESC'
      )) as OrganizationLevel[];
    });
  },
  getSystemConfig: async (category?: string): Promise<SystemConfig[]> => {
    const cacheKey = category ? `system_config:${category}` : 'system_config:all';
    return cache.get(cacheKey, CACHE_TTL.SYSTEM_CONFIG, async () => {
      if (category)
        return (await dbAll('SELECT * FROM system_config WHERE category = ? ORDER BY config_key', [
          category,
        ])) as SystemConfig[];
      return (await dbAll(
        'SELECT * FROM system_config ORDER BY category, config_key'
      )) as SystemConfig[];
    });
  },
  updateSystemConfig: async (
    config_key: string,
    config_value: string,
    updated_by: number
  ): Promise<void> => {
    await dbRun(
      'UPDATE system_config SET config_value = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE config_key = ?',
      [config_value, updated_by, config_key]
    );
    cache.invalidatePrefix('system_config:');
  },

  /**
   * ===== DEVICE QUERIES =====
   */
  getDeviceByMacAddress: async (mac_address: string): Promise<Device | undefined> => {
    return (await dbGet('SELECT * FROM devices WHERE mac_address = ?', [mac_address])) as
      | Device
      | undefined;
  },
  updateDeviceLastSeen: async (device_id: number): Promise<void> => {
    await dbRun('UPDATE devices SET last_seen = CURRENT_TIMESTAMP WHERE id = ?', [device_id]);
  },
  getUserDevices: async (user_id: number): Promise<Device[]> => {
    return (await dbAll('SELECT * FROM devices WHERE user_id = ? ORDER BY created_at DESC', [
      user_id,
    ])) as Device[];
  },

  /**
   * ===== QR & ATTENDANCE QUERIES =====
   *
   * Recommended SQLite indexes for this section:
   * - idx_qr_sessions_id_token_active(id, session_token, is_active)
   * - idx_qr_sessions_token_active(session_token, is_active)
   * - idx_attendance_session_student(qr_session_id, student_id)
   * - idx_attendance_activity_student(activity_id, student_id)
   * - idx_participations_activity_student(activity_id, student_id)
   */
  createQRSession: async (
    activity_id: number,
    creator_id: number,
    session_token: string,
    expires_at: string,
    metadata?: string | null
  ): Promise<{ lastID?: number; changes?: number }> => {
    const result = await dbRun(
      `INSERT INTO qr_sessions (activity_id, creator_id, session_token, expires_at, metadata) VALUES (?, ?, ?, ?, ?)`,
      [activity_id, creator_id, session_token, expires_at, metadata || null]
    );

    try {
      await dbHelpers.createAuditLog({
        actor_id: creator_id || null,
        action: 'create_qr_session',
        target_table: 'qr_sessions',
        target_id: result.lastID || null,
        details: {
          actor_id: creator_id || null,
          target_table: 'qr_sessions',
          target_id: result.lastID || null,
          result: 'success',
          activity_id,
        },
      });
    } catch {
      // best-effort only
    }

    return result;
  },

  /**
   * Get QR session by token (optionally bounded by session_id).
   * If `session_id` is provided, this is the preferred secure lookup.
   */
  getQRSessionByToken: async (
    token: string,
    session_id?: number
  ): Promise<QRSession | undefined> => {
    if (Number.isFinite(session_id)) {
      return (await dbGet(
        `SELECT id, activity_id, creator_id, session_token, is_active, expires_at, metadata, created_at
         FROM qr_sessions
         WHERE id = ? AND session_token = ?`,
        [session_id, token]
      )) as QRSession | undefined;
    }

    return (await dbGet(
      `SELECT id, activity_id, creator_id, session_token, is_active, expires_at, metadata, created_at
       FROM qr_sessions
       WHERE session_token = ? AND is_active = 1`,
      [token]
    )) as QRSession | undefined;
  },

  getQRSessionByIdAndToken: async (
    session_id: number,
    token: string
  ): Promise<QRSession | undefined> => {
    return (await dbGet(
      `SELECT id, activity_id, creator_id, session_token, is_active, expires_at, metadata, created_at
       FROM qr_sessions
       WHERE id = ? AND session_token = ?`,
      [session_id, token]
    )) as QRSession | undefined;
  },

  deactivateQRSession: async (id: number): Promise<void> => {
    await dbRun('UPDATE qr_sessions SET is_active = 0 WHERE id = ?', [id]);
  },

  /**
   * Idempotency helper for attendance by session/student.
   */
  getAttendanceBySessionStudent: async (
    qr_session_id: number,
    student_id: number
  ): Promise<AttendanceRecord | undefined> => {
    return (await dbGet(
      `SELECT id, qr_session_id, activity_id, student_id, recorded_by, method, status, recorded_at
       FROM attendance_records
       WHERE qr_session_id = ? AND student_id = ?
       LIMIT 1`,
      [qr_session_id, student_id]
    )) as AttendanceRecord | undefined;
  },

  /**
   * Required by Sprint 3 consolidation.
   * Checks duplicate attendance across an activity.
   */
  checkExistingAttendance: async (
    student_id: number,
    activity_id: number
  ): Promise<AttendanceRecord | undefined> => {
    return (await dbGet(
      `SELECT id, qr_session_id, activity_id, student_id, recorded_by, method, status, recorded_at
       FROM attendance_records
       WHERE student_id = ? AND activity_id = ?
       ORDER BY recorded_at DESC, id DESC
       LIMIT 1`,
      [student_id, activity_id]
    )) as AttendanceRecord | undefined;
  },

  /**
   * Backward compatible attendance insert helper.
   * Supports both object payload and positional arguments.
   */
  createAttendanceRecord: async (
    attendance:
      | {
          qr_session_id: number | null;
          activity_id: number;
          student_id: number;
          recorded_by: number | null;
          method?: string;
          device_id?: number | null;
          location?: string | null;
          note?: string | null;
          status?: 'recorded';
        }
      | number
      | null,
    activity_id?: number,
    student_id?: number,
    recorded_by?: number | null,
    method: string = 'qr',
    device_id?: number | null,
    location?: string | null,
    note?: string | null
  ): Promise<{ lastID?: number; changes?: number }> => {
    const payload =
      typeof attendance === 'object' && attendance !== null
        ? {
            qr_session_id: attendance.qr_session_id ?? null,
            activity_id: attendance.activity_id,
            student_id: attendance.student_id,
            recorded_by: attendance.recorded_by ?? null,
            method: attendance.method || 'qr',
            device_id: attendance.device_id ?? null,
            location: attendance.location ?? null,
            note: attendance.note ?? null,
            status: attendance.status || 'recorded',
          }
        : {
            qr_session_id: attendance as number | null,
            activity_id: activity_id as number,
            student_id: student_id as number,
            recorded_by: recorded_by ?? null,
            method,
            device_id: device_id ?? null,
            location: location ?? null,
            note: note ?? null,
            status: 'recorded' as const,
          };

    const result = await dbRun(
      `INSERT INTO attendance_records
       (qr_session_id, activity_id, student_id, recorded_by, method, device_id, location, note, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.qr_session_id,
        payload.activity_id,
        payload.student_id,
        payload.recorded_by,
        payload.method,
        payload.device_id,
        payload.location,
        payload.note,
        payload.status,
      ]
    );

    try {
      await (dbHelpers as any).computeAndSaveStudentScore?.(
        payload.activity_id,
        payload.student_id
      );
    } catch {
      // best-effort only
    }

    return result;
  },

  countAttendanceForSession: async (qr_session_id: number): Promise<number> => {
    const row = (await dbGet(
      `SELECT COUNT(*) as count
       FROM attendance_records
       WHERE qr_session_id = ? AND recorded_at IS NOT NULL AND status = 'recorded'`,
      [qr_session_id]
    )) as { count?: number } | undefined;
    return Number(row?.count || 0);
  },

  /**
   * Required by Sprint 3 consolidation.
   */
  updateParticipationStatus: async (
    student_id: number,
    activity_id: number,
    status: 'registered' | 'attended' | 'absent'
  ): Promise<{ lastID?: number; changes?: number }> => {
    return await dbRun(
      `UPDATE participations
       SET attendance_status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE student_id = ? AND activity_id = ?`,
      [status, student_id, activity_id]
    );
  },

  getAttendanceExportData: async (options?: {
    class_id?: number;
    start_date?: string;
    end_date?: string;
  }) => {
    const bindings: any[] = [];
    const whereClauses: string[] = ['1 = 1'];

    if (options?.class_id) {
      whereClauses.push('u.class_id = ?');
      bindings.push(options.class_id);
    }
    if (options?.start_date) {
      whereClauses.push('ar.recorded_at >= ?');
      bindings.push(options.start_date);
    }
    if (options?.end_date) {
      whereClauses.push('ar.recorded_at <= ?');
      bindings.push(options.end_date);
    }

    const sql = `
      SELECT 
        ar.id,
        ar.activity_id,
        a.title as activity_title,
        ar.student_id,
        u.name as student_name,
        u.email as student_email,
        c.name as class_name,
        ar.status,
        ar.method,
        ar.recorded_at
      FROM attendance_records ar
      LEFT JOIN activities a ON ar.activity_id = a.id
      LEFT JOIN users u ON ar.student_id = u.id
      LEFT JOIN classes c ON u.class_id = c.id
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY ar.recorded_at DESC
    `;

    return await dbAll(sql, bindings);
  },

  /**
   * ===== SCORING QUERIES =====
   */
  computeAndSaveStudentScore: async (activity_id: number, student_id: number): Promise<void> => {
    const activityRow = await dbGet('SELECT * FROM activities WHERE id = ?', [activity_id]);

    if (!activityRow) {
      console.error(`Activity ${activity_id} not found for scoring`);
      return;
    }

    const activity = activityRow as any;
    let basePoints = 0;

    if (activity && typeof activity.base_points === 'number' && activity.base_points > 0) {
      basePoints = activity.base_points;
    } else if (activity && activity.activity_type_id) {
      const at = (await dbGet('SELECT base_points FROM activity_types WHERE id = ?', [
        activity.activity_type_id,
      ])) as { base_points?: number } | undefined;
      basePoints = at && at.base_points ? at.base_points : 1;
    } else {
      basePoints = 1;
    }

    const points = basePoints;

    const existing = (await dbGet(
      'SELECT id FROM student_scores WHERE student_id = ? AND activity_id = ? AND source = ?',
      [student_id, activity_id, 'attendance']
    )) as { id?: number } | undefined;
    if (existing && existing.id) {
      await dbRun(
        'UPDATE student_scores SET points = ?, calculated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [points, existing.id]
      );
    } else {
      await dbRun(
        'INSERT INTO student_scores (student_id, activity_id, points, source) VALUES (?, ?, ?, ?)',
        [student_id, activity_id, points, 'attendance']
      );
    }
  },
  getStudentTotalScore: async (student_id: number): Promise<number> => {
    const row = (await dbGet(
      'SELECT COALESCE(SUM(points), 0) as total FROM student_scores WHERE student_id = ?',
      [student_id]
    )) as { total?: number } | undefined;
    return row?.total || 0;
  },
  getScoreboard: async (options?: {
    class_id?: number;
    page?: number;
    per_page?: number;
    sort_by?: 'score' | 'name';
    order?: 'asc' | 'desc';
  }) => {
    const page = Math.max(options?.page || 1, 1);
    const per_page = Math.min(Math.max(options?.per_page || 20, 1), 100);
    const offset = (page - 1) * per_page;
    const sort_by = options?.sort_by || 'score';
    const order = options?.order || 'desc';

    let whereClause = "u.role = 'student'";
    const bindings: any[] = [];

    if (options?.class_id) {
      whereClause += ' AND u.class_id = ?';
      bindings.push(options.class_id);
    }

    const orderBy =
      sort_by === 'name'
        ? `u.name ${order.toUpperCase()}`
        : `total_score ${order.toUpperCase()}, u.name ASC`;

    const sql = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.class_id,
        c.name as class_name,
        COALESCE(SUM(ss.points), 0) as total_score,
        COUNT(DISTINCT ss.activity_id) as activities_count
      FROM users u
      LEFT JOIN classes c ON u.class_id = c.id
      LEFT JOIN student_scores ss ON u.id = ss.student_id
      WHERE ${whereClause}
      GROUP BY u.id, u.name, u.email, u.class_id, c.name
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const students = await dbAll(sql, [...bindings, per_page, offset]);

    const countSql = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      WHERE ${whereClause}
    `;
    const countRow = (await dbGet(countSql, bindings)) as { total?: number } | undefined;
    const total = countRow?.total || 0;

    return {
      students: students.map((s: any) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        class_id: s.class_id,
        class_name: s.class_name,
        total_score: Number(s.total_score) || 0,
        activities_count: Number(s.activities_count) || 0,
      })),
      meta: {
        total,
        page,
        per_page,
        total_pages: Math.ceil(total / per_page),
      },
    };
  },
  getScoreboardExportData: async (options?: { class_id?: number }) => {
    let whereClause = "u.role = 'student'";
    const bindings: any[] = [];

    if (options?.class_id) {
      whereClause += ' AND u.class_id = ?';
      bindings.push(options.class_id);
    }

    const sql = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.class_id,
        c.name as class_name,
        COALESCE(SUM(ss.points), 0) as total_score,
        COUNT(DISTINCT ss.activity_id) as activities_count
      FROM users u
      LEFT JOIN classes c ON u.class_id = c.id
      LEFT JOIN student_scores ss ON u.id = ss.student_id
      WHERE ${whereClause}
      GROUP BY u.id, u.name, u.email, u.class_id, c.name
      ORDER BY total_score DESC, u.name ASC
    `;

    return await dbAll(sql, bindings);
  },

  /**
   * ===== AUDIT LOG QUERIES =====
   */
  createAuditLog: async (
    input:
      | {
          actor_id: number | null;
          action: string;
          target_table?: string | null;
          target_id?: number | null;
          details?: Record<string, unknown> | string | null;
        }
      | number
      | null,
    action?: string,
    target_table?: string | null,
    target_id?: number | null,
    details?: string | null
  ): Promise<void> => {
    const normalized =
      typeof input === 'object' && input !== null
        ? {
            actor_id: input.actor_id ?? null,
            action: input.action,
            target_table: input.target_table ?? null,
            target_id: input.target_id ?? null,
            details:
              typeof input.details === 'string'
                ? input.details
                : input.details
                  ? JSON.stringify(input.details)
                  : null,
          }
        : {
            actor_id: input as number | null,
            action: action as string,
            target_table: target_table || null,
            target_id: target_id || null,
            details: details || null,
          };

    await dbRun(
      'INSERT INTO audit_logs (actor_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        normalized.actor_id,
        normalized.action,
        normalized.target_table,
        normalized.target_id,
        normalized.details,
      ]
    );
  },

  /**
   * ===== APPROVAL QUERIES =====
   *
   * State contract for activity approval workflow:
   *
   * activities.status:          draft → (approval flow) → published / cancelled / completed
   * activities.approval_status: draft → requested → approved | rejected → requested (re-submit)
   * activity_approvals.status:  requested → approved | rejected
   *
   * Valid signal for "awaiting review": approval_status = 'requested'
   * Valid signal for "approved":        approval_status = 'approved' AND status = 'published'
   * Valid signal for "rejected":        approval_status = 'rejected' AND status = 'draft'
   */

  /**
   * Tạo notification best-effort cho tất cả admin khi activity được submit.
   * Không throw nếu notification lỗi; submit flow chính vẫn phải thành công.
   */
  notifyAdminsOfApprovalSubmission: async (
    activity_id: number,
    teacher_name: string,
    activity_title: string
  ): Promise<{ success: number; failed: number }> => {
    try {
      const admins = (await dbAll(
        `SELECT id FROM users WHERE role = 'admin' AND is_active = 1 ORDER BY id`
      )) as Array<{ id: number }>;

      let success = 0;
      let failed = 0;

      for (const admin of admins || []) {
        try {
          await dbRun(
            `INSERT INTO notifications (user_id, type, title, message, related_table, related_id)
             VALUES (?, 'info', 'Hoạt động mới cần phê duyệt', ?, 'activities', ?)`,
            [
              admin.id,
              `Giảng viên ${teacher_name} đã gửi hoạt động "${activity_title}" cần phê duyệt`,
              activity_id,
            ]
          );
          success += 1;
        } catch (err) {
          failed += 1;
          console.error(
            `⚠️  Failed to create approval submission notification for admin ${admin.id}:`,
            err
          );
        }
      }

      return { success, failed };
    } catch (err) {
      console.error('⚠️  Failed to load admins for approval submission notifications:', err);
      return { success: 0, failed: 0 };
    }
  },

  /**
   * Submit một activity để chờ admin phê duyệt.
   *
   * Preconditions (enforced by caller routes):
   *   - activity.status IN ('draft', 'rejected')
   *   - activity.approval_status NOT IN ('requested')
   *
   * Postconditions:
   *   - activity.approval_status = 'requested'
   *   - activity.submitted_at, submitted_by, approval_notes updated
   *   - Creates 1 activity_approvals record với status='requested'
   *   - Ghi activity_approval_history + audit_log
   *
   * Returns: { lastID, alreadyPending }
   *   - alreadyPending=true nếu đã tồn tại record 'requested' (idempotent)
   */
  submitActivityForApproval: async (
    activity_id: number,
    requested_by: number,
    note?: string | null
  ): Promise<{ lastID?: number; changes?: number; alreadyPending?: boolean }> => {
    return await withTransaction(async () => {
      const existingPending = (await dbGet(
        `SELECT id FROM activity_approvals
         WHERE activity_id = ? AND status = 'requested'
         ORDER BY requested_at DESC
         LIMIT 1`,
        [activity_id]
      )) as { id: number } | undefined;

      if (existingPending?.id) {
        return { lastID: existingPending.id, changes: 0, alreadyPending: true };
      }

      await dbRun(
        `UPDATE activities
         SET approval_status = 'requested',
             submitted_at = CURRENT_TIMESTAMP,
             submitted_by = ?,
             approval_notes = ?,
             rejected_reason = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [requested_by, note || null, activity_id]
      );

      const res = await dbRun(
        'INSERT INTO activity_approvals (activity_id, requested_by, status, note) VALUES (?, ?, ?, ?)',
        [activity_id, requested_by, 'requested', note || null]
      );

      try {
        await dbRun(
          `INSERT INTO activity_approval_history (activity_id, status, notes, changed_by)
           VALUES (?, 'pending_approval', ?, ?)`,
          [activity_id, note || null, requested_by]
        );
      } catch (err) {
        console.error('⚠️  Failed to write approval history for submit:', err);
      }

      await (dbHelpers as any).createAuditLog?.(
        requested_by,
        'submit_activity_for_approval',
        'activity_approvals',
        res.lastID || null,
        JSON.stringify({ activity_id, note: note || null })
      );

      return res;
    });
  },
  /**
   * Trả về tất cả activities đang chờ phê duyệt (approval_status = 'requested').
   * Không trả về 'pending' (không tồn tại trong CHECK constraint).
   */
  getPendingApprovals: async () => {
    return await dbAll(`SELECT aa.*, a.title as activity_title, a.teacher_id, a.status as activity_status, a.approval_status
      FROM activity_approvals aa
      LEFT JOIN activities a ON aa.activity_id = a.id
      WHERE aa.status = 'requested'
      ORDER BY aa.requested_at DESC`);
  },
  /**
   * Phê duyệt hoặc từ chối một approval request.
   *
   * Preconditions:
   *   - activity_approvals record với id=approval_id phải có status='requested'
   *
   * Postconditions (nếu status='approved'):
   *   - activity_approvals.status = 'approved', decided_at set
   *   - activity.status = 'published', activity.approval_status = 'approved'
   *   - activity.approved_by, approved_at set
   *
   * Postconditions (nếu status='rejected'):
   *   - activity_approvals.status = 'rejected', decided_at set
   *   - activity.status = 'draft', activity.approval_status = 'rejected'
   *   - activity.rejected_reason set
   *
   * Throws:
   *   - 'Approval not found' nếu approval_id không tồn tại
   *   - 'Approval already processed' nếu record không còn ở status='requested'
   */
  decideApproval: async (
    approval_id: number,
    approver_id: number,
    status: 'approved' | 'rejected',
    note?: string | null
  ) => {
    return await withTransaction(async () => {
      let participationMaterialization = { created: 0, upgraded: 0 };

      const row = (await dbGet(
        `SELECT aa.activity_id, aa.status as approval_record_status,
                a.title as activity_title, a.teacher_id
         FROM activity_approvals aa
         LEFT JOIN activities a ON a.id = aa.activity_id
         WHERE aa.id = ?`,
        [approval_id]
      )) as
        | {
            activity_id?: number;
            approval_record_status?: string;
            activity_title?: string;
            teacher_id?: number;
          }
        | undefined;

      if (!row?.activity_id) {
        console.error(`⚠️  Activity approval ${approval_id} not found`);
        throw new Error('Approval not found');
      }

      const updateRes = await dbRun(
        `UPDATE activity_approvals
         SET approver_id = ?, status = ?, note = ?, decided_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status = 'requested'`,
        [approver_id, status, note || null, approval_id]
      );

      if ((updateRes.changes || 0) === 0) {
        throw new Error('Approval already processed');
      }

      if (status === 'approved') {
        await dbRun(
          `UPDATE activities
           SET status = 'published',
               approval_status = 'approved',
               approval_notes = ?,
               approved_by = ?,
               approved_at = CURRENT_TIMESTAMP,
               rejected_reason = NULL,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [note || null, approver_id, row.activity_id]
        );

        participationMaterialization = await materializeMandatoryParticipationsForActivity(
          Number(row.activity_id)
        );
      } else {
        await dbRun(
          `UPDATE activities
           SET status = 'draft',
               approval_status = 'rejected',
               rejected_reason = ?,
               approval_notes = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [note || null, note || null, row.activity_id]
        );
      }

      try {
        await dbRun(
          `INSERT INTO activity_approval_history (activity_id, status, notes, changed_by)
           VALUES (?, ?, ?, ?)`,
          [row.activity_id, status, note || null, approver_id]
        );
      } catch (err) {
        console.error('⚠️  Failed to write approval history for decision:', err);
      }

      try {
        if (row.teacher_id) {
          await dbRun(
            `INSERT INTO notifications (user_id, type, title, message, related_table, related_id)
             VALUES (?, ?, ?, ?, 'activities', ?)`,
            [
              row.teacher_id,
              status === 'approved' ? 'success' : 'warning',
              status === 'approved' ? 'Hoạt động đã được phê duyệt' : 'Hoạt động bị từ chối',
              status === 'approved'
                ? `Hoạt động "${row.activity_title || row.activity_id}" đã được phê duyệt.`
                : `Hoạt động "${row.activity_title || row.activity_id}" bị từ chối.${note ? ` Lý do: ${note}` : ''}`,
              row.activity_id,
            ]
          );
        }
      } catch (err) {
        console.error('⚠️  Failed to create notification for approval:', err);
      }

      try {
        await dbRun(
          'INSERT INTO alerts (level, message, related_table, related_id) VALUES (?, ?, ?, ?)',
          ['info', `Activity ${status}: ${row.activity_id}`, 'activities', row.activity_id]
        );
      } catch (err) {
        console.error('⚠️  Failed to create alert for approval:', err);
      }

      try {
        await (dbHelpers as any).createAuditLog?.(
          approver_id,
          `activity_approval_${status}`,
          'activity_approvals',
          approval_id,
          note || null
        );
      } catch (err) {
        console.error('⚠️  Failed to create audit log for approval:', err);
      }

      return {
        success: true,
        activity_id: row.activity_id,
        activity_title: row.activity_title || null,
        teacher_id: row.teacher_id || null,
        new_status: status === 'approved' ? 'published' : 'draft',
        approval_status: status,
        mandatory_participations_created:
          status === 'approved' ? Number(participationMaterialization?.created || 0) : 0,
        mandatory_participations_upgraded:
          status === 'approved' ? Number(participationMaterialization?.upgraded || 0) : 0,
      };
    });
  },

  /**
   * ===== AWARD QUERIES =====
   */
  getAwardTypes: async () => {
    return (await dbAll('SELECT * FROM award_types ORDER BY min_points DESC')) as any[];
  },
  generateAwardSuggestions: async (): Promise<number> => {
    const awardTypes = (await dbAll(
      'SELECT * FROM award_types WHERE min_points > 0 ORDER BY min_points DESC'
    )) as any[];
    let suggestionsCount = 0;

    for (const awardType of awardTypes) {
      if (!awardType?.id || typeof awardType.min_points !== 'number' || awardType.min_points <= 0) {
        console.warn(`⚠️  Skipping invalid award type:`, awardType);
        continue;
      }

      const students = (await dbAll(
        `
        SELECT 
          u.id as student_id,
          COALESCE(SUM(ss.points), 0) as total_score
        FROM users u
        LEFT JOIN student_scores ss ON u.id = ss.student_id
        WHERE u.role = 'student'
        GROUP BY u.id
        HAVING total_score >= ?
        AND u.id NOT IN (
          SELECT student_id FROM student_awards WHERE award_type_id = ?
        )
        AND u.id NOT IN (
          SELECT student_id FROM award_suggestions 
          WHERE award_type_id = ? AND status = 'pending'
        )
      `,
        [awardType.min_points, awardType.id, awardType.id]
      )) as any[];

      for (const student of students) {
        if (!student?.student_id) {
          console.warn(`⚠️  Skipping invalid student:`, student);
          continue;
        }

        const existing = await dbGet(
          'SELECT id FROM award_suggestions WHERE student_id = ? AND award_type_id = ? AND status = ?',
          [student.student_id, awardType.id, 'pending']
        );

        if (!existing) {
          try {
            await dbRun(
              'INSERT INTO award_suggestions (student_id, award_type_id, score_snapshot, status) VALUES (?, ?, ?, ?)',
              [student.student_id, awardType.id, student.total_score, 'pending']
            );
            suggestionsCount++;
          } catch (err) {
            console.error(
              `⚠️  Failed to create award suggestion for student ${student.student_id}:`,
              err
            );
          }
        }
      }
    }

    return suggestionsCount;
  },
  getAwardSuggestions: async (status?: 'pending' | 'approved' | 'rejected') => {
    let sql = `
      SELECT 
        asg.*,
        u.name as student_name,
        u.email as student_email,
        u.class_id,
        c.name as class_name,
        at.name as award_type_name,
        at.min_points as award_min_points
      FROM award_suggestions asg
      LEFT JOIN users u ON asg.student_id = u.id
      LEFT JOIN classes c ON u.class_id = c.id
      LEFT JOIN award_types at ON asg.award_type_id = at.id
    `;
    const bindings: any[] = [];

    if (status) {
      sql += ' WHERE asg.status = ?';
      bindings.push(status);
    }

    sql += ' ORDER BY asg.suggested_at DESC';

    return (await dbAll(sql, bindings)) as any[];
  },
  approveAwardSuggestion: async (
    suggestion_id: number,
    approver_id: number,
    note?: string | null
  ) => {
    return await withTransaction(async () => {
      const suggestion = (await dbGet('SELECT * FROM award_suggestions WHERE id = ?', [
        suggestion_id,
      ])) as any;
      if (!suggestion) throw new Error('Suggestion not found');
      if (suggestion.status !== 'pending') throw new Error('Suggestion already processed');

      await dbRun('UPDATE award_suggestions SET status = ?, note = ? WHERE id = ?', [
        'approved',
        note || null,
        suggestion_id,
      ]);

      await dbRun(
        'INSERT INTO student_awards (award_type_id, student_id, awarded_by, reason) VALUES (?, ?, ?, ?)',
        [
          suggestion.award_type_id,
          suggestion.student_id,
          approver_id,
          note || 'Approved from suggestion',
        ]
      );

      await dbRun(
        'INSERT INTO alerts (level, message, related_table, related_id) VALUES (?, ?, ?, ?)',
        [
          'info',
          `Award approved for student ${suggestion.student_id}`,
          'student_awards',
          suggestion.student_id,
        ]
      );

      await (dbHelpers as any).createAuditLog?.(
        approver_id,
        'approve_award_suggestion',
        'award_suggestions',
        suggestion_id,
        JSON.stringify({
          student_id: suggestion.student_id,
          award_type_id: suggestion.award_type_id,
        })
      );
      return { success: true };
    });
  },
  rejectAwardSuggestion: async (
    suggestion_id: number,
    approver_id: number,
    note?: string | null
  ) => {
    return await withTransaction(async () => {
      const suggestion = (await dbGet('SELECT * FROM award_suggestions WHERE id = ?', [
        suggestion_id,
      ])) as any;
      if (!suggestion) throw new Error('Suggestion not found');
      if (suggestion.status !== 'pending') throw new Error('Suggestion already processed');

      await dbRun('UPDATE award_suggestions SET status = ?, note = ? WHERE id = ?', [
        'rejected',
        note || null,
        suggestion_id,
      ]);

      await (dbHelpers as any).createAuditLog?.(
        approver_id,
        'reject_award_suggestion',
        'award_suggestions',
        suggestion_id,
        note || null
      );
      return { success: true };
    });
  },
  createAwardSuggestion: async (
    student_id: number,
    award_type_id: number,
    suggestion_by?: number | null
  ) => {
    const totalScore = (await (dbHelpers as any).getStudentTotalScore?.(student_id)) || 0;

    const existing = await dbGet(
      'SELECT id FROM award_suggestions WHERE student_id = ? AND award_type_id = ? AND status = ?',
      [student_id, award_type_id, 'pending']
    );
    if (existing) {
      throw new Error('Suggestion already exists');
    }

    const result = await dbRun(
      'INSERT INTO award_suggestions (student_id, award_type_id, suggestion_by, score_snapshot, status) VALUES (?, ?, ?, ?, ?)',
      [student_id, award_type_id, suggestion_by || null, totalScore, 'pending']
    );

    return result;
  },
};
