import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const replaceMock = vi.fn();
const originalUse = React.use;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

describe('TeacherStudentNotesRedirectPage', () => {
  beforeEach(() => {
    replaceMock.mockReset();
    (React as any).use = ((value: unknown) => {
      if (value instanceof Promise) {
        return { id: '12' };
      }
      return originalUse(value as any);
    }) as typeof React.use;
  });

  it('redirects legacy notes route to canonical student profile notes tab', async () => {
    const Page = (await import('../src/app/teacher/students/[id]/notes/page')).default;
    render(<Page params={Promise.resolve({ id: '12' })} />);

    expect(screen.getByText('Dang chuyen den ghi chu hoc vien...')).toBeInTheDocument();

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/teacher/students/12?tab=notes');
    });
  });
});
