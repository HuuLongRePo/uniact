import { redirect } from 'next/navigation';

interface StudentActivityCheckInPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function StudentActivityCheckInPage({
  params,
}: StudentActivityCheckInPageProps) {
  const { id } = await params;
  redirect(`/student/check-in?activityId=${id}`);
}
