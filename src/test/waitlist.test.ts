import { describe, expect, it, vi } from "vitest";
import { buildWaitlistPayload, isValidWaitlistEmail, submitWaitlist } from "@/lib/waitlist";

describe("waitlist email validation", () => {
  it("accepts a normal email address", () => {
    expect(isValidWaitlistEmail("tech@firstchurch.org")).toBe(true);
  });

  it("trims surrounding whitespace before validating", () => {
    expect(isValidWaitlistEmail("  tech@firstchurch.org  ")).toBe(true);
  });

  it("rejects missing @, missing domain, and empty input", () => {
    expect(isValidWaitlistEmail("tech.firstchurch.org")).toBe(false);
    expect(isValidWaitlistEmail("tech@firstchurch")).toBe(false);
    expect(isValidWaitlistEmail("")).toBe(false);
    expect(isValidWaitlistEmail("   ")).toBe(false);
  });
});

describe("waitlist payload", () => {
  it("trims the email and always includes a subject", () => {
    expect(buildWaitlistPayload({ email: "  tech@firstchurch.org  " })).toEqual({
      email: "tech@firstchurch.org",
      _subject: "RouteView Pro waitlist signup",
    });
  });

  it("includes the name only when one is given", () => {
    expect(buildWaitlistPayload({ email: "a@b.org", name: "  Jay  " })).toEqual({
      email: "a@b.org",
      _subject: "RouteView Pro waitlist signup",
      name: "Jay",
    });
    expect(buildWaitlistPayload({ email: "a@b.org", name: "   " })).not.toHaveProperty("name");
  });
});

describe("waitlist submission", () => {
  it("returns false without calling fetch when the endpoint is missing", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(submitWaitlist("", { email: "a@b.org" })).resolves.toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("returns false without calling fetch for an invalid email", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(
      submitWaitlist("https://formspree.io/f/test", { email: "not-an-email" }),
    ).resolves.toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("posts JSON and returns true on success", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    await expect(
      submitWaitlist("https://formspree.io/f/test", { email: "a@b.org", name: "Jay" }),
    ).resolves.toBe(true);

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://formspree.io/f/test",
      expect.objectContaining({ method: "POST" }),
    );
    fetchSpy.mockRestore();
  });

  it("returns false when the request fails", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    await expect(
      submitWaitlist("https://formspree.io/f/test", { email: "a@b.org" }),
    ).resolves.toBe(false);
    fetchSpy.mockRestore();
  });
});
