const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export interface TrackingContext {
  path?: string;
  title?: string;
  url?: string;
  referrer?: string;
}

// Track events via awork backend
export async function trackEvent(
  eventName: string,
  eventData: Record<string, unknown>,
  pageContext?: TrackingContext
): Promise<boolean> {
  try {
    const currentPage = pageContext || {
      path: window.location.pathname,
      title: document.title,
      url: window.location.href,
      referrer: document.referrer,
    };

    const payload = {
      eventName,
      data: eventData,
      context: {
        userAgent: navigator.userAgent,
        locale: navigator.language,
        page: currentPage,
      },
    };

    const response = await fetch(`${API_BASE_URL}/api/awork/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch {
    return false;
  }
}

// Track screen/page views with step number
export async function trackScreenSeen(step: number): Promise<boolean> {
  return trackEvent('Forms Screen Seen', {
    tool: 'awork-forms',
    step,
  });
}
