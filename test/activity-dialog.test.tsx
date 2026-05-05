import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/LoadingSpinner', () => ({
  default: () => <div>loading</div>,
  FullScreenLoader: ({ message }: { message: string }) => <div>{message}</div>,
}));

vi.mock('@/app/activities/new/ActivityTemplateSelector', () => ({
  ACTIVITY_TEMPLATES: [],
  ActivityTemplateSelector: () => <div>template-selector</div>,
}));

describe('ActivityDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/classes') {
        return { ok: true, json: async () => ({ classes: [{ id: 1, name: 'CTK45A' }] }) } as Response;
      }
      if (url === '/api/activity-types') {
        return { ok: true, json: async () => ({ activityTypes: [{ id: 2, name: 'Ky nang' }] }) } as Response;
      }
      if (url === '/api/organization-levels') {
        return { ok: true, json: async () => ({ organization_levels: [{ id: 3, name: 'Cap truong' }] }) } as Response;
      }
      if (url === '/api/activities/check-conflicts') {
        return {
          ok: true,
          json: async () => ({ data: { location_conflicts: [], schedule_warnings: [] } }),
        } as Response;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;
  });

  it('renders accessible dialog and can close by close button', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    const ActivityDialog = (await import('../src/components/ActivityDialog')).default;

    render(<ActivityDialog isOpen onClose={onClose} onSuccess={onSuccess} />);

    expect(await screen.findByRole('dialog', { name: 'Tao hoat dong moi' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dong' }));
    expect(onClose).toHaveBeenCalled();
  });
});

