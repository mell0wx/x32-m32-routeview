/**
 * RouteView Pro waitlist helpers.
 *
 * Signups are posted to a plain form endpoint (Formspree by default) so the
 * static site needs no backend of its own. The endpoint lives in
 * `ROUTEVIEW.waitlistFormUrl`; when it is empty the waitlist is not open yet and
 * the signup form is hidden.
 */

export interface WaitlistSignup {
  email: string;
  name?: string;
}

/** Minimal email check: one @, something before it, and a dotted domain after it. */
export function isValidWaitlistEmail(value: string): boolean {
  const email = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function buildWaitlistPayload(signup: WaitlistSignup): Record<string, string> {
  const payload: Record<string, string> = {
    email: signup.email.trim(),
    _subject: "RouteView Pro waitlist signup",
  };

  const name = signup.name?.trim();
  if (name) payload.name = name;

  return payload;
}

/**
 * Post a signup to the configured form endpoint. Resolves true on an
 * accepted submission and false on any failure, so callers can show a
 * retry message instead of crashing the page.
 */
export async function submitWaitlist(
  endpoint: string,
  signup: WaitlistSignup,
): Promise<boolean> {
  if (!endpoint || !isValidWaitlistEmail(signup.email)) return false;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(buildWaitlistPayload(signup)),
    });

    return response.ok;
  } catch {
    return false;
  }
}
