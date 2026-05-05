import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/guards';
import { dbAll, dbHelpers } from '@/lib/database';
import { getFinalScoreLedgerByStudentIds } from '@/lib/score-ledger';

type StudentRow = {
  id: number;
  name: string;
  email: string;
  class_id: number | null;
  class_name: string | null;
};

type ActivityCountRow = {
  student_id: number;
  activities_count: number;
};

// GET /api/scoreboard?page=1&per_page=20&class_id=&sort_by=score&order=desc
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Chua dang nhap' }, { status: 401 });
    }

    if (user.role !== 'teacher' && user.role !== 'admin' && user.role !== 'student') {
      return NextResponse.json({ error: 'Khong co quyen truy cap' }, { status: 403 });
    }

    const params = request.nextUrl?.searchParams;
    const page = Math.max(Number(params?.get('page') || '1'), 1);
    const per_page = Math.min(Math.max(Number(params?.get('per_page') || '20'), 1), 100);
    const class_id = params?.get('class_id') ? Number(params.get('class_id')) : undefined;
    const sort_by = (params?.get('sort_by') === 'name' ? 'name' : 'score') as 'score' | 'name';
    const order = (params?.get('order') === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

    let filterClassId = class_id;
    if (user.role === 'student' && user.class_id) {
      filterClassId = user.class_id;
    }

    if (user.role === 'teacher' && filterClassId) {
      await dbHelpers.getUsersByClass(filterClassId);
    }

    const whereClause = filterClassId ? "WHERE u.role = 'student' AND u.class_id = ?" : "WHERE u.role = 'student'";
    const bindings = filterClassId ? [filterClassId] : [];

    const studentRows = (await dbAll(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.class_id,
         c.name as class_name
       FROM users u
       LEFT JOIN classes c ON u.class_id = c.id
       ${whereClause}
       ORDER BY u.name ASC`,
      bindings
    )) as StudentRow[];

    const studentIds = studentRows.map((student) => Number(student.id)).filter(Boolean);
    const ledgers = await getFinalScoreLedgerByStudentIds(studentIds);

    let activityCountMap = new Map<number, number>();
    if (studentIds.length > 0) {
      const placeholders = studentIds.map(() => '?').join(',');
      const countRows = (await dbAll(
        `SELECT
           p.student_id,
           COUNT(DISTINCT p.activity_id) as activities_count
         FROM participations p
         WHERE p.student_id IN (${placeholders})
           AND p.attendance_status = 'attended'
         GROUP BY p.student_id`,
        studentIds
      )) as ActivityCountRow[];

      activityCountMap = new Map(
        countRows.map((row) => [Number(row.student_id), Number(row.activities_count || 0)])
      );
    }

    const scoreboard = studentRows.map((student) => {
      const studentId = Number(student.id);
      const ledger = ledgers.get(studentId);
      return {
        id: studentId,
        name: student.name,
        email: student.email,
        class_id: student.class_id,
        class_name: student.class_name,
        total_score: Number(ledger?.final_total || 0),
        activities_count: Number(activityCountMap.get(studentId) || 0),
      };
    });

    scoreboard.sort((left, right) => {
      if (sort_by === 'name') {
        const byName = left.name.localeCompare(right.name, 'vi');
        if (byName !== 0) return order === 'asc' ? byName : -byName;
        return right.total_score - left.total_score;
      }

      const byScore = left.total_score - right.total_score;
      if (byScore !== 0) return order === 'asc' ? byScore : -byScore;
      return left.name.localeCompare(right.name, 'vi');
    });

    const total = scoreboard.length;
    const offset = (page - 1) * per_page;
    const students = scoreboard.slice(offset, offset + per_page);

    return NextResponse.json(
      {
        students,
        meta: {
          total,
          page,
          per_page,
          total_pages: Math.max(1, Math.ceil(total / per_page)),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get scoreboard error:', error);
    return NextResponse.json({ error: 'Loi may chu noi bo' }, { status: 500 });
  }
}
