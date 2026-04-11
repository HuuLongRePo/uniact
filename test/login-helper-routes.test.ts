import { describe, expect, it, vi } from 'vitest';
import { loginAs } from '../test/uat/helpers/login.helper';

function createPage(options: {
  meRole?: 'admin' | 'teacher' | 'student' | null;
  loginToken?: string;
} = {}) {
  const goto = vi.fn(async () => undefined);
  const waitForLoadState = vi.fn(async () => undefined);
  const clearCookies = vi.fn(async () => undefined);
  const addCookies = vi.fn(async () => undefined);

  const requestGet = vi.fn(async () => ({
    ok: () => Boolean(options.meRole),
    json: async () => ({
      data: {
        user: options.meRole ? { role: options.meRole } : null,
      },
    }),
  }));

  const requestPost = vi.fn(async () => ({
    ok: () => true,
    json: async () => ({
      data: {
        token: options.loginToken ?? 'token-123',
      },
    }),
    headers: () => ({}),
    status: () => 200,
  }));

  return {
    page: {
      request: {
        get: requestGet,
        post: requestPost,
      },
      context: () => ({
        clearCookies,
        addCookies,
      }),
      goto,
      waitForLoadState,
      waitForTimeout: vi.fn(async () => undefined),
      isClosed: vi.fn(() => false),
    } as any,
    goto,
    waitForLoadState,
    addCookies,
    requestPost,
  };
}

describe('login helper routes', () => {
  it('reuses authenticated student sessions with the canonical student dashboard path', async () => {
    const { page, goto, waitForLoadState, requestPost } = createPage({ meRole: 'student' });

    await loginAs(page, 'student');

    expect(goto).toHaveBeenCalledWith(expect.stringContaining('/student/dashboard'));
    expect(waitForLoadState).toHaveBeenCalledWith('domcontentloaded');
    expect(requestPost).not.toHaveBeenCalled();
  });

  it('navigates fresh student logins to the canonical student dashboard path', async () => {
    const { page, goto, addCookies } = createPage({ meRole: null, loginToken: 'fresh-token' });

    await loginAs(page, 'student');

    expect(addCookies).toHaveBeenCalled();
    expect(goto).toHaveBeenCalledWith(expect.stringContaining('/student/dashboard'));
  });
});
