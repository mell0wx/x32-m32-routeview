# Growth: analytics and the RouteView Pro waitlist

RouteView is free, and the core tool stays free. This page documents the two
smallest steps toward knowing whether a paid Pro tier is worth building:
measure real usage, and collect emails from people who want Pro.

## 1. Analytics (Vercel Web Analytics)

The app renders `<Analytics />` from `@vercel/analytics` in `src/App.tsx`.
It is privacy-friendly by design: no cookies, no personal data, and it only
records visits on the Vercel deployment (nothing is sent from local dev).

No setup is needed beyond deploying. After the next production deploy, open
the Vercel dashboard for the project → **Analytics** to see visitors, page
views, and referrers.

What to watch before deciding on Pro:

- **Visitors per week** — is the audience tens of people or thousands?
- **Referrers** — are churches and forums linking to it, or is traffic mostly
  direct (existing users returning)?
- **Waitlist signups vs. visitors** — the conversion rate is the real demand
  signal, not raw traffic.

## 2. Pro waitlist (Formspree)

The `WaitlistSection` on the home page teases RouteView Pro: a cloud-saved
scene library, branded PDF exports with a church or venue logo, and shared
workspaces for a tech team.

The signup form posts to a plain form endpoint so the static site needs no
backend. Until the endpoint is configured, only the teaser renders and the
form stays hidden.

Setup (about two minutes, free tier is enough to start):

1. Create a free account at <https://formspree.io> and create a new form.
2. Copy the form endpoint URL (it looks like
   `https://formspree.io/f/abcd1234`).
3. Paste it into `ROUTEVIEW.waitlistFormUrl` in `src/lib/siteConfig.ts`.
4. Deploy. The form appears on the home page automatically.

Formspree emails each signup to the address on the account. Do not add the
endpoint to any public screenshot or post; it accepts submissions from
anyone who has it.

## 3. What not to do yet

- **No display ads.** The audience is small and niche, and ads would
  undermine the privacy story ("your scene never leaves the browser") that
  makes churches trust the tool.
- **No payments until the waitlist says so.** Build a paid tier only after
  the waitlist shows real demand. Affiliate links to X32/M32 gear are a
  better interim option than ads, and they fit the audience.
- **Keep Pro features out of this repo.** The project is MIT licensed, so
  the code can be forked. The moat is the brand, the parser quality, and
  trust — build paid features in a separate private repo when the time comes.

## 4. Validating demand (owner's job, not code)

Talk to 5–10 church tech directors or venue engineers who use an X32/M32.
Ask what they would pay for: branded exports, a shared scene library, or
team workspaces — and what price feels fair. Their answers, plus the
waitlist conversion rate, decide whether Pro gets built.
