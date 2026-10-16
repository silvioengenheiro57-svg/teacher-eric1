# Configurar o login com Google

1. No Supabase, abre **Authentication > Sign In / Providers > Google** e ativa o provider.
2. Cria credenciais OAuth do tipo Web application no Google Cloud Console. Em **Authorized redirect URIs**, adiciona o callback indicado pelo Supabase, normalmente `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Copia o Google Client ID e Client Secret para as definições do provider Google no Supabase e guarda.
4. Em **Authentication > URL Configuration** no Supabase, define **Site URL** como `https://teacher-eric1.vercel.app` e adiciona às **Redirect URLs** `https://teacher-eric1.vercel.app/auth/callback` e `http://localhost:3000/auth/callback`. O Site URL de produção não deve ser `localhost`, e o endereço usado em `redirectTo` tem de estar na lista.
5. Se usas outro domínio de produção, define `NEXT_PUBLIC_SITE_URL` com esse URL nas variáveis de ambiente do Vercel e adiciona também o respetivo `/auth/callback` às **Redirect URLs** do Supabase. Depois, volta a publicar a aplicação.
6. O botão **Continuar com Google** está disponível em entrar e criar conta; o Supabase cria o perfil de novos membros através do trigger já configurado.

Não coloques o Google Client Secret no código frontend nem em variáveis `NEXT_PUBLIC_`.