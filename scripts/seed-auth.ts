import { createClient, type User } from '@supabase/supabase-js'

type UserRole = 'owner' | 'admin' | 'vendor'

type SeedAccount = {
  email: string
  password: string
  fullName: string
  role: UserRole
  canManageUsers: boolean
  vendorId: string | null
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

async function findUserByEmail(email: string): Promise<User | null> {
  const normalizedEmail = email.toLowerCase()

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    })

    if (error) {
      throw error
    }

    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === normalizedEmail
    )

    if (user) {
      return user
    }

    if (data.users.length < 1000) {
      return null
    }
  }
}

async function ensureAuthUser(account: SeedAccount): Promise<User> {
  const existingUser = await findUserByEmail(account.email)

  if (existingUser) {
    const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, {
      email: account.email,
      password: account.password,
      email_confirm: true,
    })

    if (error) {
      throw error
    }

    return data.user
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
  })

  if (error) {
    throw error
  }

  return data.user
}

const supabaseUrl = requiredEnv('NEXT_PUBLIC_SUPABASE_URL')
const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function main() {
  const accountsWithoutVendor: Omit<SeedAccount, 'vendorId'>[] = [
    {
      email: requiredEnv('SEED_OWNER_EMAIL'),
      password: requiredEnv('SEED_OWNER_PASSWORD'),
      fullName: 'Development Owner',
      role: 'owner',
      canManageUsers: true,
    },
    {
      email: requiredEnv('SEED_ADMIN_EMAIL'),
      password: requiredEnv('SEED_ADMIN_PASSWORD'),
      fullName: 'Development Admin',
      role: 'admin',
      canManageUsers: true,
    },
    {
      email: requiredEnv('SEED_VENDOR_EMAIL'),
      password: requiredEnv('SEED_VENDOR_PASSWORD'),
      fullName: 'Development Vendor GRADMINE',
      role: 'vendor',
      canManageUsers: false,
    },
  ]

  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .upsert(
      {
        code: 'GRADMINE',
        name: 'Gradmine',
        notes: 'Vendor dummy development',
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'code' }
    )
    .select('id')
    .single()

  if (vendorError) {
    throw vendorError
  }

  const accounts: SeedAccount[] = accountsWithoutVendor.map((account) => ({
    ...account,
    vendorId: account.role === 'vendor' ? vendor.id : null,
  }))

  for (const account of accounts) {
    const user = await ensureAuthUser(account)
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: account.fullName,
      role: account.role,
      vendor_id: account.vendorId,
      can_manage_users: account.canManageUsers,
      is_active: true,
      updated_at: new Date().toISOString(),
    })

    if (profileError) {
      throw profileError
    }

    console.log(`Seeded ${account.role} account: ${account.email}`)
  }
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String(error.message)
        : 'Unknown seed error'
  console.error(`Auth seed failed: ${message}`)
  process.exitCode = 1
})
