import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function seedAdmin() {
  const email = 'admin@courtflow.com'
  const password = 'Admin123!'
  const fullName = 'Platform Admin'
  const role = 'platform_admin'

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existing = existingUsers?.users?.find((u) => u.email === email)

  if (existing) {
    console.log(`User ${email} already exists (id: ${existing.id})`)

    // Ensure profile has platform_admin role
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role, full_name: fullName })
      .eq('id', existing.id)

    if (updateError) {
      console.error('Failed to update profile:', updateError.message)
    } else {
      console.log('Profile updated to platform_admin')
    }
    return
  }

  // Create user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
    },
  })

  if (authError) {
    console.error('Failed to create user:', authError.message)
    process.exit(1)
  }

  console.log(`Created user: ${email} (id: ${authData.user.id})`)

  // The handle_new_user trigger should auto-create the profile,
  // but let's make sure the role is set correctly
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', authData.user.id)

  if (profileError) {
    console.error('Failed to update profile role:', profileError.message)
  } else {
    console.log(`Profile role set to: ${role}`)
  }

  console.log('\nPlatform admin account ready:')
  console.log(`  Email:    ${email}`)
  console.log(`  Password: ${password}`)
  console.log(`  Role:     ${role}`)
}

seedAdmin().catch(console.error)
