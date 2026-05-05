import { getUserFromSession } from '@/lib/auth';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { getFinalScoreLedgerByStudentIds } from '@/lib/score-ledger';

export async function GET() {
  try {
    const user = await getUserFromSession();
    if (!user) return errorResponse(ApiError.unauthorized('Chua dang nhap'));
    if (user.role !== 'student') {
      return errorResponse(ApiError.forbidden('Khong co quyen truy cap'));
    }

    const ledger = await getFinalScoreLedgerByStudentIds([Number(user.id)]);
    const currentPoints = ledger.get(Number(user.id))?.final_total || 0;

    const awardThresholds = [
      {
        type: 'Giai Xuat sac',
        points_needed: 500,
        description: 'Danh cho hoc vien co tong diem ren luyen tu 500 tro len.',
      },
      {
        type: 'Giai Kha',
        points_needed: 300,
        description: 'Danh cho hoc vien co tong diem ren luyen tu 300 tro len.',
      },
      {
        type: 'Giai Tien bo',
        points_needed: 200,
        description: 'Danh cho hoc vien dat moc 200 diem va duy tri tham gia deu.',
      },
    ];

    const awards = awardThresholds
      .filter((award) => currentPoints < award.points_needed)
      .map((award) => ({
        ...award,
        current_points: currentPoints,
        progress: Math.min(Math.round((currentPoints / award.points_needed) * 100), 100),
      }))
      .sort((a, b) => a.points_needed - b.points_needed);

    return successResponse({ awards });
  } catch (error: any) {
    console.error('Get upcoming awards error:', error);
    return errorResponse(ApiError.internalError(error?.message || 'Loi may chu noi bo'));
  }
}
