import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ApprovalDialog from '@/app/admin/approvals/ApprovalDialog';

describe('ApprovalDialog', () => {
  it('resets textarea content when reopened with another action', () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn(async () => undefined);

    const { rerender } = render(
      <ApprovalDialog
        type="reject"
        isOpen
        activityId={11}
        onClose={onClose}
        onSubmit={onSubmit}
        loading={false}
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Need more details' } });
    expect(screen.getByRole('textbox')).toHaveValue('Need more details');

    rerender(
      <ApprovalDialog
        type="reject"
        isOpen={false}
        activityId={11}
        onClose={onClose}
        onSubmit={onSubmit}
        loading={false}
      />
    );

    rerender(
      <ApprovalDialog
        type="approve"
        isOpen
        activityId={12}
        onClose={onClose}
        onSubmit={onSubmit}
        loading={false}
      />
    );

    expect(screen.getByRole('textbox')).toHaveValue('');
  });
});
