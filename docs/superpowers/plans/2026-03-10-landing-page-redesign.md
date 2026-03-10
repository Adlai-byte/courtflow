# Landing Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign CourtFLOW's landing page with Upskwela-inspired visuals: Montserrat headings, dot grid backgrounds, Upskwela-style buttons, centered hero with floating cards, testimonials section, FAQ accordion, and scroll animations.

**Architecture:** Modify 6 existing files (root layout, globals.css, marketing layout, landing page, mobile nav, partners carousel). No new route files — testimonials and FAQ are inline in page.tsx. All visual changes scoped to `(marketing)` group.

**Tech Stack:** Next.js, Tailwind CSS 4.x, shadcn/ui, Lucide React icons, Google Fonts (Montserrat), CSS animations + IntersectionObserver

**Spec:** `docs/superpowers/specs/2026-03-10-landing-page-redesign-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/app/layout.tsx` | Modify | Add Montserrat font import |
| `src/app/globals.css` | Modify | Replace cta-button, add dot-grid/vignette/fade-in utilities |
| `src/app/(marketing)/layout.tsx` | Modify | Restyle nav: branded logo, Upskwela buttons, backdrop-blur, FAQ link |
| `src/app/(marketing)/page.tsx` | Modify | Full rewrite: centered hero, new features cards, testimonials, FAQ, dark CTA |
| `src/components/marketing/mobile-nav.tsx` | Modify | Match new button/link styles (remove mono uppercase, add rounded-md) |
| `src/components/marketing/partners-carousel.tsx` | Modify | Update label text (remove brackets) |

---

## Task 1: Add Montserrat Font + CSS Utilities

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add Montserrat font to root layout**

In `src/app/layout.tsx`, add the Montserrat import alongside existing fonts:

```tsx
import { DM_Sans, JetBrains_Mono, Montserrat } from "next/font/google";

const montserrat = Montserrat({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["700", "800"],
});
```

Update the body className to include the new variable:

```tsx
className={`${dmSans.variable} ${jetbrainsMono.variable} ${montserrat.variable} font-sans antialiased`}
```

- [ ] **Step 2: Add --font-heading to theme and new CSS utilities**

In `src/app/globals.css`:

1. Add `--font-heading: var(--font-heading);` to the `@theme inline` block (after `--font-mono`).

2. Replace the `.cta-button` block (lines 168-188) with new button classes:

```css
/* Upskwela-style primary button */
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: var(--primary);
  color: var(--primary-foreground);
  padding: 0.625rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.375rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 200ms ease;
  cursor: pointer;
  border: none;
}
.btn-primary:hover {
  box-shadow: 0 4px 12px rgba(232, 89, 12, 0.3);
}
.btn-primary:active {
  transform: scale(0.98);
}

/* Upskwela-style ghost button */
.btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: var(--card);
  color: var(--foreground);
  border: 1px solid var(--border);
  padding: 0.625rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.375rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 200ms ease;
  cursor: pointer;
}
.btn-ghost:hover {
  background: var(--primary);
  color: var(--primary-foreground);
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(232, 89, 12, 0.3);
}
```

3. Add these new utilities after the button classes:

```css
/* Dot grid background */
.dot-grid {
  position: relative;
}
.dot-grid::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(0, 0, 0, 0.07) 1px, transparent 1px);
  background-size: 16px 16px;
  pointer-events: none;
}
.dot-grid::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, transparent 0%, var(--background) 85%);
  pointer-events: none;
}

/* Dark dot grid (for dark CTA section) */
.dot-grid-dark {
  position: relative;
}
.dot-grid-dark::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px);
  background-size: 16px 16px;
  pointer-events: none;
}
.dot-grid-dark::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.5) 90%);
  pointer-events: none;
}

/* Heading font utility */
.font-heading {
  font-family: var(--font-heading);
}

/* Scroll-triggered fade-in animation */
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in-up {
  animation: fade-in-up 0.6s ease both;
}
```

4. Keep the `.section-label` class but update it (remove brackets convention — labels are now plain uppercase text).

5. Keep `.partner-scroll` and `.noise-bg` as-is.

- [ ] **Step 3: Commit**

```
feat: add Montserrat font and Upskwela-style CSS utilities
```

---

## Task 2: Restyle Navigation

**Files:**
- Modify: `src/app/(marketing)/layout.tsx`
- Modify: `src/components/marketing/mobile-nav.tsx`

- [ ] **Step 1: Update marketing layout nav**

In `src/app/(marketing)/layout.tsx`:

1. Update the header tag (line 83) to add sticky + backdrop-blur:
```tsx
<header className="sticky top-0 z-50 mx-auto flex h-16 max-w-7xl items-center justify-between px-6 backdrop-blur-sm bg-background/80 transition-colors duration-300">
```

2. Update the logo link (line 84):
```tsx
<Link href="/" className="text-base font-bold tracking-tight">
  Court<span className="text-primary">FLOW</span>
</Link>
```

3. Update the anonymous nav links (lines 112-122) — remove font-mono, uppercase, add FAQ:
```tsx
<nav className="hidden items-center gap-8 lg:flex">
  <ActiveNavLink href="#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
    Features
  </ActiveNavLink>
  <ActiveNavLink href="/explore" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
    Explore
  </ActiveNavLink>
  <ActiveNavLink href="#how-it-works" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
    How it works
  </ActiveNavLink>
  <ActiveNavLink href="#faq" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
    FAQ
  </ActiveNavLink>
</nav>
```

4. Update customer nav links (lines 89-110) — same pattern: remove `font-mono text-xs uppercase tracking-wider`, use `text-sm font-medium ... hover:text-primary`.

5. Update Sign in link (line 128) — make it a ghost button:
```tsx
<Link href="/login" className="btn-ghost hidden px-4 py-2 text-sm lg:inline-flex">
  Sign in
</Link>
```

6. Update Get started link (lines 131-136) — use btn-primary:
```tsx
<Link href="/signup" className="btn-primary hidden px-5 py-2.5 text-sm lg:flex">
  Get started <ArrowRight className="h-3.5 w-3.5" />
</Link>
```

7. Update Dashboard link (line 141) — same btn-primary pattern.

8. Update Sign out button (line 148) — remove font-mono uppercase:
```tsx
className="hidden items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive lg:flex"
```

- [ ] **Step 2: Update mobile nav**

In `src/components/marketing/mobile-nav.tsx`:

1. Replace all `font-mono text-sm uppercase tracking-wider` with `text-sm font-medium` throughout the file (both customer and anonymous nav links).

2. Update the "Get started" and "Dashboard" CTA links (lines 101, 108) — replace `cta-button rounded-none px-5 py-2.5 text-xs` with `btn-primary px-5 py-2.5 text-sm`.

- [ ] **Step 3: Commit**

```
feat: restyle navigation with Upskwela-style buttons and backdrop-blur
```

---

## Task 3: Redesign Hero Section (Centered)

**Files:**
- Modify: `src/app/(marketing)/page.tsx`

- [ ] **Step 1: Update icon imports**

Replace the current icon imports (line 3) with the new set:

```tsx
import { ArrowRight, MapPin, CalendarCheck, Wallet, Repeat, ShieldCheck, BellRing } from 'lucide-react'
```

Remove the `Image` import (line 2) — hero image is being removed.

- [ ] **Step 2: Update the features array**

Replace the current `features` array (lines 10-41) with Upskwela-style cards that include icon background colors:

```tsx
const features = [
  {
    icon: MapPin,
    title: 'Find Courts Near You',
    description: 'Browse basketball, volleyball, badminton, and tennis courts by city and sport type.',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  {
    icon: CalendarCheck,
    title: 'Book in Seconds',
    description: 'See real-time availability. Pick your slot, confirm, done — no phone calls needed.',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    icon: Wallet,
    title: 'Pay with GCash & Maya',
    description: 'Secure online payment via GCash or Maya. Some facilities also offer pay-at-venue.',
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
  },
  {
    icon: Repeat,
    title: 'Recurring Reservations',
    description: 'Set up weekly games with one booking. Your regular slot, automatically reserved.',
    iconBg: 'bg-pink-50',
    iconColor: 'text-pink-600',
  },
  {
    icon: ShieldCheck,
    title: 'Guaranteed Slots',
    description: 'Real-time sync means no double bookings. Your slot is locked the moment you confirm.',
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
  },
  {
    icon: BellRing,
    title: 'Instant Confirmation',
    description: 'Get booking confirmation via email and SMS. Never miss your game time.',
    iconBg: 'bg-yellow-50',
    iconColor: 'text-yellow-600',
  },
]
```

- [ ] **Step 3: Replace the Hero section**

Replace the entire Hero section (lines 124-164) with:

```tsx
{/* Hero */}
<section className="dot-grid relative mx-auto max-w-7xl overflow-hidden px-6 pb-24 pt-24">
  <div className="relative z-10 mx-auto max-w-3xl text-center">
    {/* Social proof badge */}
    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground shadow-sm">
      <span className="h-2 w-2 rounded-full bg-green-500" />
      Trusted by 2,400+ players
    </div>

    {/* Headline */}
    <h1 className="font-heading text-5xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl md:text-7xl">
      Your Court Is Waiting.
      <br />
      <span className="text-primary">Book It Now.</span>
    </h1>

    {/* Subtitle */}
    <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
      Browse facilities near you, pick your slot, and play — no phone calls, no hassle.
    </p>

    {/* CTA buttons */}
    <div className="mt-10 flex items-center justify-center gap-3">
      <Link href={ctaHref} className="btn-primary px-6 py-3 text-sm">
        {ctaLabel} <ArrowRight className="h-4 w-4" />
      </Link>
      <Link href="#how-it-works" className="btn-ghost px-6 py-3 text-sm">
        See How It Works
      </Link>
    </div>

    {/* Floating UI cards */}
    <div className="mt-12 flex items-end justify-center gap-4">
      <div className="animate-fade-in-up rounded-xl border border-border bg-card p-4 shadow-lg" style={{ animationDelay: '0.2s', transform: 'rotate(-1.5deg)' }}>
        <p className="text-sm font-semibold">Metro Hoops 🏀</p>
        <p className="text-xs text-muted-foreground">3 courts available</p>
      </div>
      <div className="animate-fade-in-up -translate-y-2 rounded-xl border border-border bg-card p-4 shadow-2xl" style={{ animationDelay: '0.4s' }}>
        <p className="text-sm font-semibold text-green-600">Booking Confirmed ✓</p>
        <p className="text-xs text-muted-foreground">Court A · Today 3:00 PM</p>
      </div>
      <div className="animate-fade-in-up rounded-xl border border-border bg-card p-4 shadow-lg" style={{ animationDelay: '0.6s', transform: 'rotate(1.5deg)' }}>
        <p className="text-sm font-semibold text-primary">₱500/hr</p>
        <p className="text-xs text-muted-foreground">GCash · Maya</p>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 4: Commit**

```
feat: centered hero with social proof badge and floating UI cards
```

---

## Task 4: Redesign Features + How It Works Sections

**Files:**
- Modify: `src/app/(marketing)/page.tsx`

- [ ] **Step 1: Replace the Features section**

Replace the Features section (lines 179-202) with:

```tsx
{/* Features */}
<section id="features" className="dot-grid relative mx-auto max-w-7xl px-6 py-24">
  <div className="relative z-10">
    <div className="mb-16 text-center">
      <span className="section-label mb-3 block">WHY COURTFLOW</span>
      <h2 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
        Everything you need to book and play.
      </h2>
    </div>
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {features.map((feature) => (
        <div
          key={feature.title}
          className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg"
        >
          <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${feature.iconBg}`}>
            <feature.icon className={`h-5 w-5 ${feature.iconColor}`} />
          </div>
          <h3 className="mb-2 text-base font-semibold tracking-tight">
            {feature.title}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {feature.description}
          </p>
        </div>
      ))}
    </div>
  </div>
</section>
```

- [ ] **Step 2: Replace the How It Works section**

Replace the How It Works section (lines 209-232) with:

```tsx
{/* How It Works */}
<section id="how-it-works" className="bg-muted/50 py-24">
  <div className="mx-auto max-w-7xl px-6">
    <div className="mb-16 text-center">
      <span className="section-label mb-3 block">HOW IT WORKS</span>
      <h2 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
        Three steps to game time.
      </h2>
    </div>
    <div className="grid gap-6 md:grid-cols-3">
      {steps.map((step) => (
        <div
          key={step.number}
          className="rounded-xl border border-border bg-card p-8 shadow-sm text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
        >
          <span className="mb-4 block font-heading text-5xl font-extrabold text-primary/15">
            {step.number}
          </span>
          <h3 className="mb-3 text-lg font-semibold tracking-tight">
            {step.title}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {step.description}
          </p>
        </div>
      ))}
    </div>
  </div>
</section>
```

- [ ] **Step 3: Remove dividers between sections**

Delete all the standalone divider blocks (`<div className="mx-auto max-w-7xl px-6"><div className="h-px bg-border" /></div>`). The alternating white/muted backgrounds provide enough section separation.

- [ ] **Step 4: Commit**

```
feat: redesign features and how-it-works with Upskwela card style
```

---

## Task 5: Add Testimonials Section

**Files:**
- Modify: `src/app/(marketing)/page.tsx`

- [ ] **Step 1: Add testimonials data array**

Add this after the `steps` array:

```tsx
const testimonials = [
  {
    quote: 'Booking courts used to take 5 phone calls. Now it takes 5 seconds. Literal game changer for our weekly basketball sessions.',
    name: 'Juan Dela Cruz',
    role: 'Basketball Player · Manila',
    initial: 'J',
    color: 'bg-primary',
  },
  {
    quote: 'I manage 5 courts and CourtFLOW handles all my bookings. Auto-approve and GCash payments saved me hours every week.',
    name: 'Maria Santos',
    role: 'Facility Owner · Cebu',
    initial: 'M',
    color: 'bg-orange-500',
  },
  {
    quote: 'The recurring booking feature is perfect. I set up our weekly volleyball game for the whole month in one go. So convenient.',
    name: 'Kyle Reyes',
    role: 'Volleyball Player · Davao',
    initial: 'K',
    color: 'bg-amber-600',
  },
]
```

- [ ] **Step 2: Add Testimonials section JSX**

Insert after the Browse Facilities section, before the Final CTA:

```tsx
{/* Testimonials */}
<section className="dot-grid relative py-24">
  <div className="relative z-10 mx-auto max-w-7xl px-6">
    <div className="mb-16 text-center">
      <span className="section-label mb-3 block">WHAT PLAYERS SAY</span>
      <h2 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
        Loved by players and facility owners.
      </h2>
    </div>
    <div className="grid gap-6 md:grid-cols-3">
      {testimonials.map((t, i) => (
        <div
          key={t.name}
          className="rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-lg"
          style={{
            transform: i === 0 ? 'rotate(-0.5deg)' : i === 2 ? 'rotate(0.5deg)' : 'translateY(-6px)',
            boxShadow: i === 1 ? '0 8px 24px rgba(0,0,0,0.08)' : undefined,
          }}
        >
          <div className="mb-3 text-sm text-amber-400">★★★★★</div>
          <p className="mb-4 text-sm italic leading-relaxed text-muted-foreground">
            &ldquo;{t.quote}&rdquo;
          </p>
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white ${t.color}`}>
              {t.initial}
            </div>
            <div>
              <p className="text-sm font-semibold">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.role}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
</section>
```

- [ ] **Step 3: Commit**

```
feat: add testimonials section with placeholder reviews
```

---

## Task 6: Add FAQ Accordion Section

**Files:**
- Modify: `src/app/(marketing)/page.tsx`

- [ ] **Step 1: Add FAQ data array**

Add after the `testimonials` array:

```tsx
const faqs = [
  {
    question: 'Is CourtFLOW free for players?',
    answer: 'Yes! Signing up and browsing are completely free. You only pay when you book a court at facilities that require online payment.',
  },
  {
    question: 'What payment methods are accepted?',
    answer: 'We accept GCash and Maya for online payments. Some facilities also offer pay-at-venue options.',
  },
  {
    question: 'How do I list my facility on CourtFLOW?',
    answer: 'Sign up as a facility owner, complete onboarding, and add your courts. You\'ll have your own booking page within minutes.',
  },
  {
    question: 'Can I set up recurring bookings?',
    answer: 'Absolutely! You can book the same time slot across multiple weeks with a single booking. Perfect for regular games.',
  },
  {
    question: 'What\'s the cancellation policy?',
    answer: 'Each facility sets their own cancellation window. You can cancel free of charge within that window from your bookings page.',
  },
]
```

- [ ] **Step 2: Add FAQ section JSX**

Insert after the Testimonials section, before the Final CTA:

```tsx
{/* FAQ */}
<section id="faq" className="bg-muted/50 py-24">
  <div className="mx-auto max-w-2xl px-6">
    <div className="mb-16 text-center">
      <span className="section-label mb-3 block">FAQ</span>
      <h2 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
        Frequently Asked Questions
      </h2>
    </div>
    <div className="space-y-3">
      {faqs.map((faq) => (
        <details
          key={faq.question}
          className="group rounded-lg border border-border bg-card shadow-sm [&_summary::-webkit-details-marker]:hidden"
        >
          <summary className="flex cursor-pointer items-center justify-between px-5 py-4">
            <span className="text-sm font-semibold">{faq.question}</span>
            <span className="ml-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45">+</span>
          </summary>
          <div className="border-t border-border px-5 py-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
          </div>
        </details>
      ))}
    </div>
  </div>
</section>
```

- [ ] **Step 3: Commit**

```
feat: add FAQ accordion section
```

---

## Task 7: Redesign Final CTA + Update Partners + Footer

**Files:**
- Modify: `src/app/(marketing)/page.tsx`
- Modify: `src/components/marketing/partners-carousel.tsx`

- [ ] **Step 1: Replace the Final CTA section**

Replace the current CTA section (lines 270-289) with a dark section:

```tsx
{/* Final CTA */}
<section className="dot-grid-dark relative overflow-hidden bg-[#1a1a1a] py-24">
  <div className="relative z-10 mx-auto max-w-7xl px-6 text-center">
    <h2 className="font-heading text-3xl font-extrabold tracking-tight text-[#f5f0e8] sm:text-4xl md:text-5xl">
      Ready to Book Your Next Game?
    </h2>
    <p className="mx-auto mt-4 max-w-md text-base text-[#f5f0e8]/60">
      Join players who book in seconds — no phone calls, no hassle.
    </p>
    <div className="mt-8 flex items-center justify-center gap-3">
      <Link href={ctaHref} className="btn-primary px-6 py-3 text-sm">
        Get Started Free <ArrowRight className="h-4 w-4" />
      </Link>
      <Link
        href="#features"
        className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-6 py-3 text-sm font-medium text-[#f5f0e8]/80 backdrop-blur-sm transition-all hover:bg-white/20"
      >
        Learn More
      </Link>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Update footer**

Update footer styles — remove font-mono from copyright and links:

```tsx
<footer className="border-t border-border">
  <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
    <span className="text-xs text-muted-foreground">
      &copy; {new Date().getFullYear()} CourtFLOW
    </span>
    <div className="flex gap-6">
      {isOwner ? (
        <Link href={ctaHref} className="text-xs text-muted-foreground transition-colors hover:text-foreground">
          Dashboard
        </Link>
      ) : !user ? (
        <>
          <Link href="/login" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
            Sign in
          </Link>
          <Link href="/signup" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
            Sign up
          </Link>
        </>
      ) : null}
    </div>
  </div>
</footer>
```

- [ ] **Step 3: Update partners carousel label**

In `src/components/marketing/partners-carousel.tsx` (line 20), replace:
```tsx
<span className="section-label">[ TRUSTED BY ]</span>
```
with:
```tsx
<span className="section-label">TRUSTED BY FACILITIES ACROSS THE PHILIPPINES</span>
```

- [ ] **Step 4: Commit**

```
feat: dark final CTA, update footer and partners carousel
```

---

## Task 8: Build Verification + Final Polish

- [ ] **Step 1: Run build**

```bash
npx next build
```

Expected: Build succeeds with 0 TypeScript errors. All 41 routes compile.

- [ ] **Step 2: Fix any build errors**

If any errors, fix them and re-run build.

- [ ] **Step 3: Visual verification**

Run `npx next dev` and check:
- [ ] Dot grid + vignette visible on hero, features, testimonials
- [ ] Montserrat renders on all headings
- [ ] Buttons are rounded-md with shadow
- [ ] Ghost buttons fill orange on hover
- [ ] Floating hero cards render with rotation
- [ ] FAQ accordion opens/closes
- [ ] Testimonial cards have star ratings and rotation
- [ ] Dark CTA section has dot grid in white
- [ ] Nav is sticky with backdrop-blur
- [ ] Mobile nav matches new styles

- [ ] **Step 4: Final commit if any polish needed**

```
chore: landing page redesign polish and build verification
```

---

## Summary of Commits

1. `feat: add Montserrat font and Upskwela-style CSS utilities`
2. `feat: restyle navigation with Upskwela-style buttons and backdrop-blur`
3. `feat: centered hero with social proof badge and floating UI cards`
4. `feat: redesign features and how-it-works with Upskwela card style`
5. `feat: add testimonials section with placeholder reviews`
6. `feat: add FAQ accordion section`
7. `feat: dark final CTA, update footer and partners carousel`
8. `chore: landing page redesign polish and build verification`
