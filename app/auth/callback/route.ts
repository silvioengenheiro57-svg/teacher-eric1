import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getSiteUrl } from '@/lib/site-url';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const siteUrl = getSiteUrl(request.nextUrl.origin);

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL('/aluno', siteUrl));
  }

  const loginUrl = new URL('/entrar', siteUrl);
  loginUrl.searchParams.set('oauth_error', 'google');
  return NextResponse.redirect(loginUrl);
}