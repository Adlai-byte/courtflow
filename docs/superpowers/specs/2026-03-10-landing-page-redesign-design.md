# Landing Page Redesign — Upskwela-Inspired Design Spec

**Date:** 2026-03-10
**Goal:** Redesign CourtFLOW's landing page with Upskwela-inspired visual effects, Montserrat headings, proper Lucide icon cards, and two new sections (Testimonials + FAQ).

## Design Decisions

| Decision | Choice |
|----------|--------|
| Base theme | Light (white) with Upskwela effects |
| Background effects | Dot grid (16px), radial vignette, alternating white/muted sections |
| Heading font | Montserrat 800 (headings only) |
| Body font | DM Sans (keep current) |
| Mono font | JetBrains Mono (keep current, labels only) |
| Buttons | Upskwela-style: rounded-md, shadow-sm, normal case, ghost→fill-primary on hover, active:scale-[0.98] |
| Hero layout | Centered (text-center, max-w-3xl mx-auto) with social proof badge + floating UI cards |
| Cards | rounded-xl, shadow-sm, hover:-translate-y-1 + hover:shadow-lg, Lucide icons in pastel boxes |
| New sections | Testimonials (3 placeholder cards) + FAQ (5 accordion items) |

## Typography

### Montserrat (headings)
- Import: Google Fonts, weights 700 and 800
- Usage: h1, h2, section titles
- Style: font-extrabold (800), tracking-tight (-0.02em), normal case
- Color: text-foreground, accent words in text-primary (#e8590c)

### DM Sans (body)
- Keep current setup, no changes
- Usage: paragraphs, descriptions, nav links, form labels

### JetBrains Mono (labels)
- Keep current setup
- Usage: section labels only (e.g., "Why CourtFLOW", "How It Works")
- Style: text-xs uppercase tracking-widest text-muted-foreground

## Global CSS Effects

### Dot Grid Background
```css
.dot-grid {
  background-image: radial-gradient(rgba(0,0,0,0.07) 1px, transparent 1px);
  background-size: 16px 16px;
}
```
Applied to: hero section, features section, testimonials section.

### Radial Vignette
```css
.vignette {
  background: radial-gradient(circle at center, transparent 0%, hsl(var(--background)) 85%);
}
```
Applied as an overlay on dot-grid sections. Fades the dots toward edges.

### Card Hover Effect
```css
.card-hover {
  transition: all 300ms ease;
}
.card-hover:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
}
```

### Button Styles
```css
/* Primary button */
.btn-primary {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px; /* rounded-md */
  box-shadow: 0 1px 3px rgba(0,0,0,0.1); /* shadow-sm */
  transition: all 200ms;
}
.btn-primary:hover {
  box-shadow: 0 4px 12px rgba(232,89,12,0.3); /* shadow-md with brand color */
}
.btn-primary:active {
  transform: scale(0.98);
}

/* Ghost button (secondary) */
.btn-ghost {
  background: hsl(var(--card));
  color: hsl(var(--foreground));
  border: 1px solid hsl(var(--border));
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  transition: all 200ms;
}
.btn-ghost:hover {
  background: hsl(var(--primary));
  color: white;
  border-color: hsl(var(--primary));
  box-shadow: 0 4px 12px rgba(232,89,12,0.3);
}
```

## Section-by-Section Spec

### 1. Navigation
**File:** `src/app/(marketing)/layout.tsx`

Changes:
- Logo: "Court" in foreground + "FLOW" in primary color (currently plain mono text)
- Nav links: normal case (remove uppercase), font-medium, text-sm, text-muted-foreground, hover:text-primary
- Add "FAQ" anchor link
- Sign in button: ghost style (bg-card, border, hover→fills primary)
- Get Started button: primary style (bg-primary, rounded-md, shadow-sm)
- Sticky header: add `backdrop-blur-sm bg-background/80` on scroll
- Remove: font-mono from nav links, uppercase from buttons

### 2. Hero Section
**File:** `src/app/(marketing)/page.tsx`

Replace current left-aligned hero with centered layout:
- Container: `text-center max-w-3xl mx-auto` with dot-grid + vignette behind
- Social proof badge: pill shape (rounded-full), border, shadow-sm, green dot + "Trusted by 2,400+ players"
- Headline: Montserrat 800, text-5xl sm:text-6xl, tracking-tight
  - "Your Court Is Waiting." (foreground)
  - "Book It Now." (text-primary)
- Subtitle: text-lg text-muted-foreground, max-w-xl mx-auto
- CTAs: flex gap-3 justify-center
  - Primary: "Book Your Court →" (btn-primary)
  - Ghost: "See How It Works" (btn-ghost)
- Floating UI cards below CTAs (3 cards):
  - Left card (rotate -1.5deg): facility name + court count
  - Center card (translateY -8px, shadow-2xl): "Booking Confirmed ✓" + details
  - Right card (rotate +1.5deg): price + payment methods
- Cards animate in with stagger on load (fade-in + translateY)
- Remove: Hero.png image, current split layout

### 3. Partners Carousel
**File:** `src/components/marketing/partners-carousel.tsx`

Minimal changes:
- Label: remove brackets, normal case ("Trusted by facilities across the Philippines")
- Keep existing infinite scroll animation
- Keep grayscale + hover color effect

### 4. Features Section
**File:** `src/app/(marketing)/page.tsx`

Changes:
- Section header: centered, Montserrat 800, "Everything you need to book and play."
- Label: JetBrains Mono, uppercase, tracking-widest, "Why CourtFLOW"
- Dot grid background behind section
- 6 cards in 3-column grid (md:2, sm:1):
  1. **Find Courts Near You** — MapPin icon, bg-amber-50 (#fef3c7), text-amber-600
  2. **Book in Seconds** — CalendarCheck icon, bg-blue-50 (#dbeafe), text-blue-600
  3. **Pay with GCash & Maya** — Wallet icon, bg-green-50 (#dcfce7), text-green-600
  4. **Recurring Reservations** — Repeat icon, bg-pink-50 (#fce7f3), text-pink-600
  5. **Guaranteed Slots** — ShieldCheck icon, bg-indigo-50 (#e0e7ff), text-indigo-600
  6. **Instant Confirmation** — BellRing icon, bg-yellow-50 (#fef9c3), text-yellow-600
- Card style: bg-card, border border-border, rounded-xl (14px), shadow-sm, p-6
- Icon box: w-11 h-11, rounded-xl, flex items-center justify-center, mb-4
- Hover: -translate-y-1, shadow-lg, border-primary/20
- Remove: current 11x11 icon boxes with just borders, bracket labels

### 5. How It Works
**File:** `src/app/(marketing)/page.tsx`

Changes:
- Background: bg-muted (#fafafa) for section contrast
- Cards instead of flat text layout
- Step numbers: Montserrat 800, text-4xl, text-primary/15 (faded orange)
- Card style: bg-card, border, rounded-xl, shadow-sm, p-6, text-center
- Same hover effect as feature cards
- Content unchanged (Find → Pick → Play)

### 6. Browse Facilities
**File:** existing explore-list component

Changes:
- Update facility cards to match new style: rounded-xl, shadow-sm, hover:-translate-y-1 + shadow-lg
- Show city on each card
- Sport type pills: rounded-full

### 7. Testimonials (NEW)
**File:** `src/app/(marketing)/page.tsx` (inline) or new component

Structure:
- Section header: centered, Montserrat 800, "Loved by players and facility owners."
- Label: "What Players Say"
- Dot grid background
- 3 cards in grid (responsive: stack on mobile):
  - Card 1 (rotate -0.5deg): Juan Dela Cruz, Basketball Player, Manila
    - "Booking courts used to take 5 phone calls. Now it takes 5 seconds. Literal game changer for our weekly basketball sessions."
  - Card 2 (translateY -6px, shadow-2xl): Maria Santos, Facility Owner, Cebu
    - "I manage 5 courts and CourtFLOW handles all my bookings. Auto-approve and GCash payments saved me hours every week."
  - Card 3 (rotate +0.5deg): Kyle Reyes, Volleyball Player, Davao
    - "The recurring booking feature is perfect. I set up our weekly volleyball game for the whole month in one go. So convenient."
- Star ratings (5 stars) above each quote
- Avatar: colored circle with initial letter (brand orange tones)
- Card style: bg-card, border, rounded-xl, shadow-sm, p-6

### 8. FAQ (NEW)
**File:** `src/app/(marketing)/page.tsx` (inline) or new component

Structure:
- Background: bg-muted for contrast
- Section header: centered, Montserrat 800, "Frequently Asked Questions"
- Max-w-2xl mx-auto
- HTML `<details>/<summary>` accordion (like Upskwela)
- Card style per item: bg-card, border, rounded-lg, shadow-sm, mb-2
- 5 questions:
  1. "Is CourtFLOW free for players?" → "Yes! Signing up and browsing are completely free. You only pay when you book a court at facilities that require online payment."
  2. "What payment methods are accepted?" → "We accept GCash and Maya for online payments. Some facilities also offer pay-at-venue options."
  3. "How do I list my facility on CourtFLOW?" → "Sign up as a facility owner, complete onboarding, and add your courts. You'll have your own booking page within minutes."
  4. "Can I set up recurring bookings?" → "Absolutely! You can book the same time slot across multiple weeks with a single booking. Perfect for regular games."
  5. "What's the cancellation policy?" → "Each facility sets their own cancellation window. You can cancel free of charge within that window from your bookings page."

### 9. Final CTA
**File:** `src/app/(marketing)/page.tsx`

Changes:
- Dark section (bg-foreground / bg-[#1a1a1a]) for contrast
- Dot grid in white (rgba(255,255,255,0.08))
- Vignette overlay
- Centered text: Montserrat 800, text-3xl, warm cream color
- "Ready to Book Your Next Game?"
- Subtitle: text-muted (light opacity)
- CTAs: primary button + glassmorphism ghost button (backdrop-blur, semi-transparent border)

### 10. Footer
No significant changes. Match new link/button styles.

## Animations

### Scroll-triggered fade-in
Use CSS `@keyframes` with IntersectionObserver (or a lightweight scroll animation approach):
```css
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
```
Apply to: section headers, feature cards (staggered), testimonial cards, floating hero cards.

### Hero floating cards stagger
```css
.hero-card-1 { animation: fade-in-up 0.6s ease 0.2s both; }
.hero-card-2 { animation: fade-in-up 0.6s ease 0.4s both; }
.hero-card-3 { animation: fade-in-up 0.6s ease 0.6s both; }
```

## Files to Modify

1. `src/app/layout.tsx` — add Montserrat font import
2. `src/app/globals.css` — add dot-grid, vignette, card-hover, button utilities, fade-in animation
3. `src/app/(marketing)/layout.tsx` — restyle nav (logo, links, buttons, backdrop-blur)
4. `src/app/(marketing)/page.tsx` — full hero rewrite, features restyle, add testimonials + FAQ sections
5. `src/components/marketing/mobile-nav.tsx` — match new button/link styles
6. `src/components/marketing/partners-carousel.tsx` — minor label restyle

## Files NOT Modified
- Dashboard pages (owner, admin) — no changes
- Booking flow pages — no changes
- API routes — no changes
