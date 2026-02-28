import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GoogleSignIn } from '@/components/auth/google-sign-in'
import { User, Mail, Lock, Building2, CalendarDays } from 'lucide-react'

export const metadata = {
  title: 'Create Account',
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  async function signup(formData: FormData) {
    'use server'

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('full_name') as string
    const role = formData.get('role') as string
    const supabase = await createClient()

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        },
      },
    })

    if (error) {
      // Generic message to prevent email enumeration attacks
      redirect(`/signup?error=${encodeURIComponent('Something went wrong. Please try again or use a different email.')}`)
    }

    if (role === 'business_owner') {
      redirect('/onboarding')
    }

    redirect('/explore')
  }

  return (
    <div>
      {/* Section label */}
      <div className="mb-8">
        <span className="section-label">[ CREATE ACCOUNT ]</span>
      </div>

      {/* Heading */}
      <h1 className="text-3xl font-bold tracking-tight">Get started</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Create your CourtFLOW account
      </p>

      {/* Error */}
      {params.error && (
        <div role="alert" className="mt-6 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {params.error}
        </div>
      )}

      {/* Google sign-up */}
      <div className="mt-8">
        <GoogleSignIn />
      </div>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-3 text-muted-foreground">or sign up with email</span>
        </div>
      </div>

      {/* Form */}
      <form action={signup} className="space-y-5">
        {/* Full Name */}
        <div className="space-y-2">
          <label htmlFor="full_name" className="text-sm font-medium">
            Full Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="full_name"
              name="full_name"
              type="text"
              required
              placeholder="John Doe"
              className="flex h-11 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="flex h-11 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              className="flex h-11 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
        </div>

        {/* Role selector */}
        <div className="space-y-3">
          <label className="text-sm font-medium">I want to...</label>
          <div className="grid grid-cols-2 gap-3">
            <label className="group relative flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-input p-5 text-center transition-all hover:border-primary/50 hover:bg-primary/[0.02] has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input type="radio" name="role" value="business_owner" required className="sr-only" />
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted transition-colors group-has-[:checked]:bg-primary/10">
                <Building2 className="h-5 w-5 text-muted-foreground transition-colors group-has-[:checked]:text-primary" />
              </div>
              <div>
                <span className="text-sm font-semibold">List my courts</span>
                <p className="mt-0.5 text-xs text-muted-foreground">For facility owners</p>
              </div>
            </label>
            <label className="group relative flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-input p-5 text-center transition-all hover:border-primary/50 hover:bg-primary/[0.02] has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input type="radio" name="role" value="customer" required className="sr-only" />
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted transition-colors group-has-[:checked]:bg-primary/10">
                <CalendarDays className="h-5 w-5 text-muted-foreground transition-colors group-has-[:checked]:text-primary" />
              </div>
              <div>
                <span className="text-sm font-semibold">Book courts</span>
                <p className="mt-0.5 text-xs text-muted-foreground">For players</p>
              </div>
            </label>
          </div>
        </div>

        {/* Submit */}
        <button type="submit" className="cta-button w-full justify-center rounded-lg">
          Create account
        </button>
      </form>

      {/* Login link */}
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>

      {/* Browse as guest */}
      <p className="mt-3 text-center text-sm text-muted-foreground">
        or{' '}
        <Link href="/explore" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          Browse facilities
        </Link>
      </p>
    </div>
  )
}
