import { describe, expect, it, vi } from 'vitest';
import { TeacherHelper } from '../test/uat/helpers/teacher.helper';

function createLocator(options: {
  visible?: boolean;
  onClick?: () => void | Promise<void>;
  nested?: ReturnType<typeof createLocator>;
} = {}) {
  const locator: any = {
    isVisible: vi.fn(async () => options.visible ?? true),
    click: vi.fn(async () => {
      if (options.onClick) {
        await options.onClick();
      }
    }),
    first: vi.fn(() => locator),
    locator: vi.fn(() => options.nested ?? locator),
  };

  return locator;
}

describe('TeacherHelper selectors', () => {
  it('saveDraft supports unicode and ASCII labels used by the current teacher flows', async () => {
    const draftLocator = createLocator();
    const page: any = {
      locator: vi.fn(() => draftLocator),
      waitForTimeout: vi.fn(async () => undefined),
    };

    const helper = new TeacherHelper(page);
    await helper.saveDraft();

    expect(page.locator).toHaveBeenCalledWith(
      expect.stringContaining('button:has-text("Luu nhap")')
    );
    expect(draftLocator.first).toHaveBeenCalled();
    expect(draftLocator.click).toHaveBeenCalled();
    expect(page.waitForTimeout).toHaveBeenCalledWith(500);
  });

  it('submitForApproval supports ASCII fallback for card action labels', async () => {
    const submitButton = createLocator();
    const confirmButton = createLocator({ visible: false });
    const card = createLocator({ nested: submitButton });
    const page: any = {
      goto: vi.fn(async () => undefined),
      locator: vi.fn(() => confirmButton),
      waitForTimeout: vi.fn(async () => undefined),
    };

    const helper = new TeacherHelper(page);
    vi.spyOn(helper, 'goToActivities').mockResolvedValue(undefined);
    vi.spyOn(helper, 'findActivityByTitle').mockResolvedValue(card as any);

    await helper.submitForApproval('Activity A');

    expect(card.locator).toHaveBeenCalledWith(
      expect.stringContaining('button:has-text("Gui duyet")')
    );
    expect(submitButton.first).toHaveBeenCalled();
    expect(submitButton.click).toHaveBeenCalled();
  });

  it('goToQRCode uses the canonical teacher qr route with activity_id query', async () => {
    const page: any = {
      goto: vi.fn(async () => undefined),
      waitForLoadState: vi.fn(async () => undefined),
    };

    const helper = new TeacherHelper(page);
    await helper.goToQRCode(55);

    expect(page.goto).toHaveBeenCalledWith(
      expect.stringContaining('/teacher/qr?activity_id=55')
    );
    expect(page.waitForLoadState).toHaveBeenCalledWith('networkidle');
  });
});
