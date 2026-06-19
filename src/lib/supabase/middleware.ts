import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Rafraîchit le token de session Supabase à chaque requête.
 * Sans ça, le cookie de session peut expirer silencieusement et les
 * routes API (qui utilisent getUser() côté serveur) renvoient "Non autorisé"
 * même si l'utilisateur se croit toujours connecté côté navigateur.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: import('@supabase/ssr').CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT : getUser() revalide le token auprès du serveur Supabase Auth,
  // contrairement à getSession() qui peut renvoyer un token expiré sans le savoir.
  await supabase.auth.getUser()

  return response
}
