import { NextRequest, NextResponse } from 'next/server';
import { purgeExpiredBiometricEmbeddings } from '@/lib/biometrics/production-policy';

// GET /api/cron/cleanup-biometric - Purge expired biometric embeddings by retention policy
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dev-secret-change-in-production';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Chua xac thuc' }, { status: 401 });
    }

    const result = await purgeExpiredBiometricEmbeddings();

    return NextResponse.json({
      success: true,
      message: `Da don dep ${result.purged_count} biometric embedding het han`,
      stats: result,
    });
  } catch (error: unknown) {
    console.error('Biometric cleanup cron error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
