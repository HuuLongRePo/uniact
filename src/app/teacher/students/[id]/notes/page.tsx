'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function TeacherStudentNotesRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/teacher/students/${id}?tab=notes`);
  }, [id, router]);

  return <LoadingSpinner message="Dang chuyen den ghi chu hoc vien..." />;
}
