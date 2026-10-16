# Configurar o login com Google

1. No Supabase, abre **Authentication > Sign In / Providers > Google** e ativa o provider.
2. Cria credenciais OAuth do tipo Web application no Google Cloud Console. Em **Authorized redirect URIs**, adiciona o callback indicado pelo Supabase, normalmente `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Copia o Google Client ID e Client Secret para as definições do provider Google no Supabase e guarda.
4. Em **Authentication > URL Configuration > Redirect URLs** no Supabase, adiciona `http://localhost:3000/auth/callback` e o URL de produção terminado em `/auth/callback`.
5. Reinicia o Next.js. O botão **Continuar com Google** está disponível em entrar e criar conta; o Supabase cria o perfil de novos membros através do trigger já configurado.

Não coloques o Google Client Secret no código frontend nem em variáveis `NEXT_PUBLIC_`.