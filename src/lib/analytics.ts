/**
 * Simple analytics tracking
 * Can be extended with Google Analytics, Mixpanel, etc.
 */

interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
}

class Analytics {
  private enabled: boolean = false;

  constructor() {
    // Enable analytics in production
    this.enabled = process.env.NODE_ENV === 'production';
  }

  /**
   * Track page view
   */
  pageView(path: string): void {
    if (!this.enabled) return;

    console.warn('[Analytics] Page View:', path);

    // TODO: Implement actual analytics tracking
    // Example: gtag('event', 'page_view', { page_path: path });
  }

  /**
   * Track custom event
   */
  event({ category, action, label, value }: AnalyticsEvent): void {
    if (!this.enabled) return;

    console.warn('[Analytics] Event:', { category, action, label, value });

    // TODO: Implement actual analytics tracking
    // Example: gtag('event', action, { event_category: category, event_label: label, value });
  }

  /**
   * Track user action
   */
  trackAction(action: string, details?: Record<string, any>): void {
    if (!this.enabled) return;

    console.warn('[Analytics] Action:', action, details);
  }

  /**
   * Track error
   */
  trackError(error: Error, context?: string): void {
    if (!this.enabled) return;

    console.error('[Analytics] Error:', {
      message: error.message,
      stack: error.stack,
      context,
    });

    // TODO: Send to error tracking service (Sentry, etc.)
  }

  /**
   * Track performance metric
   */
  trackPerformance(metric: string, value: number): void {
    if (!this.enabled) return;

    console.warn('[Analytics] Performance:', metric, value);
  }
}

export const analytics = new Analytics();

/**
 * Hook to track page views
 */
export function usePageTracking(path: string): void {
  if (typeof window !== 'undefined') {
    analytics.pageView(path);
  }
}

/**
 * Track button clicks
 */
export function trackClick(buttonName: string, details?: Record<string, any>): void {
  analytics.event({
    category: 'User Interaction',
    action: 'Click',
    label: buttonName,
  });

  if (details) {
    analytics.trackAction(`click_${buttonName}`, details);
  }
}

/**
 * Track form submissions
 */
export function trackFormSubmit(formName: string, success: boolean): void {
  analytics.event({
    category: 'Form',
    action: success ? 'Submit Success' : 'Submit Error',
    label: formName,
  });
}

/**
 * Track API calls
 */
export function trackApiCall(endpoint: string, method: string, duration: number): void {
  analytics.trackPerformance(`api_${method}_${endpoint}`, duration);
}
