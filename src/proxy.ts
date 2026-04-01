import { NextResponse, type NextRequest } from 'next/server'

// Auth disabled for development — remove this and restore Supabase guard when ready
export async function proxy(request: NextRequest) {
  return NextResponse.next({ request })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
