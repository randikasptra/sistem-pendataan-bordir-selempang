import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

type Role = 'owner' | 'admin' | 'vendor'

type Account = {
  role: Role
  email: string
  password: string
  dashboard: string
}

type Cookie = {
  name: string
  value: string
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

const appUrl = process.env.SMOKE_APP_URL?.trim() || requiredEnv('NEXT_PUBLIC_APP_URL')
const supabaseUrl = requiredEnv('NEXT_PUBLIC_SUPABASE_URL')
const anonKey = requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

const accounts: Account[] = [
  {
    role: 'owner',
    email: requiredEnv('SEED_OWNER_EMAIL'),
    password: requiredEnv('SEED_OWNER_PASSWORD'),
    dashboard: '/dashboard',
  },
  {
    role: 'admin',
    email: requiredEnv('SEED_ADMIN_EMAIL'),
    password: requiredEnv('SEED_ADMIN_PASSWORD'),
    dashboard: '/dashboard',
  },
  {
    role: 'vendor',
    email: requiredEnv('SEED_VENDOR_EMAIL'),
    password: requiredEnv('SEED_VENDOR_PASSWORD'),
    dashboard: '/vendor/dashboard',
  },
]

async function createSessionCookies(account: Account): Promise<Cookie[]> {
  let cookieJar: Cookie[] = []
  const client = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => cookieJar,
      setAll: (cookies) => {
        cookieJar = cookies.map(({ name, value }) => ({ name, value }))
      },
    },
  })

  const { error } = await client.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  })

  if (error) {
    throw error
  }

  await new Promise((resolve) => setTimeout(resolve, 0))
  assert(cookieJar.length > 0, `No session cookies were created for ${account.role}`)

  return cookieJar
}

async function requestPath(cookies: Cookie[], path: string): Promise<Response> {
  return fetch(new URL(path, appUrl), {
    headers: {
      cookie: cookies.map(({ name, value }) => `${name}=${value}`).join('; '),
    },
    redirect: 'manual',
  })
}

async function verifyRls(account: Account) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error: loginError } = await client.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  })
  assert(!loginError, `Supabase login failed for ${account.role}`)

  const { data: profiles, error: profilesError } = await client
    .from('profiles')
    .select('id, role, vendor_id')
  assert(!profilesError, `Profiles RLS query failed for ${account.role}`)

  if (account.role === 'vendor') {
    assert(profiles.length === 1, 'Vendor can read a profile outside its own vendor scope')
    const { data: updateResult, error: updateError } = await client
      .from('vendors')
      .update({ is_active: true })
      .eq('code', 'GRADMINE')
      .select('id')
    assert(!updateError, 'Vendor vendor-update request returned an unexpected API error')
    assert(updateResult.length === 0, 'Vendor can update vendor data')
  } else {
    assert(profiles.length >= 3, `${account.role} cannot read all profiles`)
  }
}

async function main() {
  for (const account of accounts) {
    await verifyRls(account)
    const cookies = await createSessionCookies(account)

    const rootResponse = await requestPath(cookies, '/')
    assert(
      rootResponse.headers.get('location') === account.dashboard,
      `${account.role} root redirect was not ${account.dashboard}`
    )

    const internalResponse = await requestPath(cookies, '/dashboard')
    const vendorResponse = await requestPath(cookies, '/vendor/dashboard')

    if (account.role === 'vendor') {
      assert(
        internalResponse.headers.get('location') === '/vendor/dashboard',
        'Vendor can open the internal dashboard'
      )
      assert(vendorResponse.status === 200, 'Vendor cannot open the vendor dashboard')
    } else {
      assert(internalResponse.status === 200, `${account.role} cannot open the internal dashboard`)
      assert(
        vendorResponse.headers.get('location') === '/dashboard',
        `${account.role} was not redirected away from the vendor dashboard`
      )
    }

    console.log(`Smoke test passed: ${account.role}`)
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown smoke test error'
  console.error(`Auth smoke test failed: ${message}`)
  process.exitCode = 1
})
