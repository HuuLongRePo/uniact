import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbGet, dbRun } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const config = await dbGet('SELECT config_value FROM system_config WHERE config_key = ?', [
      'scoring_formula',
    ]);

    const formula = config?.config_value
      ? JSON.parse(config.config_value as string)
      : {
          basePointsMultiplier: 1.0,
          activityTypeMultipliers: {
            environmental: 1.2,
            social: 1.0,
            sports: 1.1,
            academic: 1.3,
            cultural: 1.0,
          },
          organizationLevelMultipliers: {
            school: 1.0,
            district: 1.5,
            city: 2.0,
            national: 3.0,
          },
          achievementMultipliers: {
            gold: 3.0,
            silver: 2.0,
            bronze: 1.5,
            participation: 1.0,
          },
        };

    return NextResponse.json({ formula });
  } catch (error) {
    console.error('Get scoring formula error:', error);
    return NextResponse.json({ error: 'Không thể tải công thức tính điểm' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const { formula } = await request.json();

    const existing = await dbGet('SELECT * FROM system_config WHERE config_key = ?', [
      'scoring_formula',
    ]);

    if (existing) {
      await dbRun('UPDATE system_config SET config_value = ? WHERE config_key = ?', [
        JSON.stringify(formula),
        'scoring_formula',
      ]);
    } else {
      await dbRun('INSERT INTO system_config (config_key, config_value) VALUES (?, ?)', [
        'scoring_formula',
        JSON.stringify(formula),
      ]);
    }

    return NextResponse.json({ message: 'Lưu công thức thành công' });
  } catch (error) {
    console.error('Save scoring formula error:', error);
    return NextResponse.json({ error: 'Không thể lưu công thức tính điểm' }, { status: 500 });
  }
}
