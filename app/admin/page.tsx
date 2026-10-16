import { redirect } from 'next/navigation';
import { Shell } from '@/components/nav';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export default async function Admin() {
	const supabase = await createSupabaseServerClient();
	const { data: { user }, error: authError } = await supabase.auth.getUser();
	if (authError || !user) redirect('/entrar');

	const { data: isAdmin, error: permissionError } = await supabase.rpc('is_admin');
	if (permissionError || !isAdmin) redirect('/aluno');

	return <Shell title="Painel administrativo" subtitle="Área reservada à gestão da comunidade.">
		<section className="stats-grid">
			<article className="panel stat"><span>Membros</span><strong>—</strong><small>Ligação à tabela profiles</small></article>
			<article className="panel stat"><span>Conteúdos</span><strong>—</strong><small>Ligação à tabela posts</small></article>
			<article className="panel stat"><span>Aulas</span><strong>—</strong><small>Ligação à tabela lessons</small></article>
		</section>
		<section className="panel admin-placeholder"><h2>Gestão de conteúdos</h2><p className="muted">A gestão de conteúdos será disponibilizada nesta área.</p></section>
	</Shell>;
}
