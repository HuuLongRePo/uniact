import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StudentScoreFlowNav from '@/components/student/StudentScoreFlowNav';

let mockPathname = '/student/points';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('StudentScoreFlowNav', () => {
  it('renders the canonical score-flow links', () => {
    mockPathname = '/student/points';
    render(<StudentScoreFlowNav />);

    expect(screen.getByTestId('student-score-flow-nav')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Điểm rèn luyện' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bảng điểm' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xếp hạng' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lịch sử tham gia' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Giải thưởng' })).toBeInTheDocument();
  });

  it('marks awards root as active for awards child routes', () => {
    mockPathname = '/student/awards/history';
    render(<StudentScoreFlowNav />);

    const awardsLink = screen.getByRole('link', { name: 'Giải thưởng' });
    const rankingLink = screen.getByRole('link', { name: 'Xếp hạng' });
    expect(awardsLink).toHaveAttribute('aria-current', 'page');
    expect(rankingLink).not.toHaveAttribute('aria-current');
  });

  it('marks points link as active on points route', () => {
    mockPathname = '/student/points';
    render(<StudentScoreFlowNav />);

    expect(screen.getByRole('link', { name: 'Điểm rèn luyện' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('link', { name: 'Bảng điểm' })).not.toHaveAttribute('aria-current');
  });
});
