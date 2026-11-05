import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTEVIEW } from "@/lib/siteConfig";
import { isValidWaitlistEmail, submitWaitlist } from "@/lib/waitlist";

/**
 * RouteView Pro teaser and waitlist signup.
 *
 * The core tool stays free. Pro will add a cloud-saved scene library,
 * branded PDF exports, and team workspaces. The signup form only renders
 * once ROUTEVIEW.waitlistFormUrl is set (see docs/growth.md); until then
 * visitors see the teaser and a link to follow progress on GitHub.
 */
const WaitlistSection = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const waitlistOpen = ROUTEVIEW.waitlistFormUrl.length > 0;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isValidWaitlistEmail(email)) {
      toast.error("Enter a valid email address to join the waitlist.");
      return;
    }

    setSubmitting(true);
    const ok = await submitWaitlist(ROUTEVIEW.waitlistFormUrl, { email, name });
    setSubmitting(false);

    if (!ok) {
      toast.error("Something went wrong. Please try again in a moment.");
      return;
    }

    setDone(true);
    toast.success("You're on the list — we'll email you when Pro opens.");
  };

  return (
    <section className="panel mx-auto max-w-3xl p-4 text-center md:p-6 no-print" aria-label="RouteView Pro waitlist">
      <p className="prod-kicker">Coming soon</p>
      <h2 className="text-xl font-semibold">RouteView Pro</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
        The tool stays free. Pro adds a cloud-saved scene library, branded PDF
        exports with your church or venue logo, and shared workspaces for your
        whole tech team.
      </p>

      {waitlistOpen ? (
        done ? (
          <p className="mt-4 text-sm font-medium" role="status">
            Thanks — you&apos;re on the waitlist. We&apos;ll be in touch when Pro opens.
          </p>
        ) : (
          <form className="mx-auto mt-4 flex max-w-md flex-col gap-2 sm:flex-row" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="waitlist-name">
              Your name (optional)
            </label>
            <Input
              id="waitlist-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name (optional)"
              autoComplete="name"
              className="sm:max-w-40"
            />
            <label className="sr-only" htmlFor="waitlist-email">
              Email address
            </label>
            <Input
              id="waitlist-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@church.org"
              autoComplete="email"
              required
            />
            <Button type="submit" disabled={submitting}>
              <Mail className="mr-2 h-4 w-4" />
              {submitting ? "Joining…" : "Join the waitlist"}
            </Button>
          </form>
        )
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          The waitlist opens soon. Follow progress on{" "}
          <a className="underline underline-offset-4 hover:text-foreground" href={ROUTEVIEW.repositoryUrl} target="_blank" rel="noreferrer">
            GitHub
          </a>
          .
        </p>
      )}
    </section>
  );
};

export default WaitlistSection;
