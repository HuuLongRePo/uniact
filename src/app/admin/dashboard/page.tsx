import DashboardAdminPage from '@/features/dashboard/DashboardAdminPage';
import { SectionErrorBoundary } from '@/components/SectionErrorBoundary';

export default function DashboardPageWrapper() {
  return (
    <SectionErrorBoundary section="Admin Dashboard">
      <DashboardAdminPage />
    </SectionErrorBoundary>
  );
}
