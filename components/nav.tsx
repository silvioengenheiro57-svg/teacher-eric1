'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { House, Image as ImageIcon, Menu, MessageCircle, Plus, Search, Send, Shield, UserRound, UserRoundPlus, Users } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

const links = [
	{ href: '/comunidade', label: 'Feed', icon: House },
	{ href: '/comunidade#community-members', label: 'Membros', icon: Users },
	{ href: '/pesquisar', label: 'Pesquisar', icon: Search },
	{ href: '/amizades', label: 'Amizades', icon: UserRoundPlus },
	{ href: '/mensagens', label: 'Mensagens', icon: Send },
	{ href: '/chatbot', label: 'Eric AI Coach', icon: MessageCircle },
	{ href: '/perfil', label: 'Meu perfil', icon: UserRound },
	{ href: '/admin', label: 'Administração', icon: Shield },
];
const mobileLinks = [
	{ href: '/comunidade', label: 'Início', icon: House },
	{ href: '/comunidade#community-members', label: 'Membros', icon: Users },
	{ href: '/amizades', label: 'Amigos', icon: UserRoundPlus },
	{ href: '/chatbot', label: 'Chat IA', icon: MessageCircle },
	{ href: '/perfil', label: 'Perfil', icon: UserRound },
];

export function NavLinks({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
	const pathname = usePathname();
	const supabase = useMemo(() => createSupabaseBrowserClient(), []);
	const [isAdmin, setIsAdmin] = useState(false);
	useEffect(() => {
		let cancelled = false;
		async function checkAdmin() {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) return;
			const { data } = await supabase.rpc('is_admin');
			if (!cancelled && data === true) setIsAdmin(true);
		}
		void checkAdmin();
		return () => { cancelled = true; };
	}, [supabase]);
	return <nav className={className} aria-label="Navegação principal">
		{links.filter(({ href }) => href !== '/admin' || isAdmin).map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={onNavigate} aria-current={pathname === href || pathname.startsWith(`${href}/`) ? 'page' : undefined}>
			<Icon size={18} strokeWidth={1.8} /><span>{label}</span>
		</Link>)}
	</nav>;
}

export function MobileBottomNavigation() {
	const pathname = usePathname();
	return <nav className="mobile-bottom-nav" aria-label="Navegação principal">
		{mobileLinks.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-label={label} title={label} aria-current={!href.includes('#') && (pathname === href || pathname.startsWith(`${href}/`)) ? 'page' : undefined}>
			<Icon size={25} strokeWidth={2.1} /><span>{label}</span>
		</Link>)}
	</nav>;
}

export function MobileAppHeader() {
	const supabase = useMemo(() => createSupabaseBrowserClient(), []);
	const [avatarUrl, setAvatarUrl] = useState('');
	useEffect(() => {
		let cancelled = false;
		async function loadAvatar() {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) return;
			const { data } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle();
			if (!cancelled && data?.avatar_url) setAvatarUrl(data.avatar_url);
		}
		void loadAvatar();
		return () => { cancelled = true; };
	}, [supabase]);
	return <header className="mobile-app-header">
		<Link href="/comunidade" className="mobile-app-brand"><span>Teacher Eric<span className="mobile-brand-period">.</span></span></Link>
		<div className="mobile-app-actions">
			<Link className="mobile-app-action" href="/comunidade#community-post" aria-label="Criar publicação" title="Criar publicação"><Plus size={23} strokeWidth={2.4} /></Link>
			<Link className="mobile-app-action" href="/pesquisar" aria-label="Pesquisar membros e publicações" title="Pesquisar membros e publicações"><Search size={22} strokeWidth={2.3} /></Link>
			<details className="mobile-app-menu">
				<summary className="mobile-app-action" aria-label="Abrir menu" title="Abrir menu"><Menu size={23} strokeWidth={2.3} /></summary>
				<nav aria-label="Mais opções">
					<Link href="/perfil">{avatarUrl ? <img src={avatarUrl} alt="" /> : <UserRound size={18} />}<span>O meu perfil</span></Link>
					<Link href="/amizades"><UserRoundPlus size={18} /><span>Pedidos de amizade</span></Link>
					<Link href="/mensagens"><Send size={18} /><span>Mensagens</span></Link>
					<Link href="/chatbot"><MessageCircle size={18} /><span>Eric AI Coach</span></Link>
					<Link href="/comunidade#community-members"><Users size={18} /><span>Encontrar membros</span></Link>
					<Link href="/perfil/cartao"><ImageIcon size={18} /><span>Cartão de membro</span></Link>
				</nav>
			</details>
		</div>
	</header>;
}

export function Nav() {
	return <>
		<aside className="sidebar">
			<Link href="/comunidade" className="brand"><span className="brand-mark"><Image src="/images/teacher-eric.png" alt="" width={42} height={42} className="brand-teacher-image" priority /></span><span>Teacher Eric<small>English community</small></span></Link>
			<NavLinks />
			<div className="sidebar-note">Practice makes progress.</div>
		</aside>
		<MobileAppHeader />
		<MobileBottomNavigation />
	</>;
}
export function Shell({title,subtitle,children}:{title:string;subtitle:string;children:React.ReactNode}) { return <div className="app-layout"><Nav/><main className="main"><header className="page-head"><div><p className="eyebrow">COMUNIDADE DO TEACHER ERIC</p><h1>{title}</h1><p className="muted">{subtitle}</p></div><Link className="button button-light" href="/perfil">Meu perfil</Link></header>{children}</main></div>; }
