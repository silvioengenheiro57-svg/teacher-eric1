'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { BookOpen, House, MessageCircle, Send, Shield, UserRound, Users } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

const links = [
	{ href: '/aluno', label: 'Área do aluno', icon: BookOpen },
	{ href: '/comunidade', label: 'Comunidade', icon: Users },
	{ href: '/mensagens', label: 'Mensagens', icon: Send },
	{ href: '/chatbot', label: 'Eric AI Coach', icon: MessageCircle },
	{ href: '/perfil', label: 'Meu perfil', icon: UserRound },
	{ href: '/admin', label: 'Administração', icon: Shield },
];
const mobileLinks = [
	{ href: '/aluno', label: 'Início', icon: House },
	{ href: '/comunidade', label: 'Comunidade', icon: Users },
	{ href: '/mensagens', label: 'Mensagens', icon: Send },
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
		{mobileLinks.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={pathname === href || pathname.startsWith(`${href}/`) ? 'page' : undefined}>
			<Icon size={19} strokeWidth={1.8} /><span>{label}</span>
		</Link>)}
	</nav>;
}

function MobileAppHeader() {
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
		<Link href="/aluno" className="mobile-app-brand"><Image src="/images/teacher-eric.png" alt="" width={32} height={32} /><span><strong>Teacher Eric</strong><small>Learn · Connect · Grow</small></span></Link>
		<Link className="mobile-app-profile" href="/perfil" aria-label="O meu perfil">{avatarUrl ? <img src={avatarUrl} alt="" /> : <UserRound size={19} />}</Link>
	</header>;
}

export function Nav() {
	return <>
		<aside className="sidebar">
			<Link href="/" className="brand"><span className="brand-mark"><Image src="/images/teacher-eric.png" alt="" width={42} height={42} className="brand-teacher-image" priority /></span><span>Teacher Eric<small>English community</small></span></Link>
			<NavLinks />
			<div className="sidebar-note">Practice makes progress.</div>
		</aside>
		<MobileAppHeader />
		<MobileBottomNavigation />
	</>;
}
export function Shell({title,subtitle,children}:{title:string;subtitle:string;children:React.ReactNode}) { return <div className="app-layout"><Nav/><main className="main"><header className="page-head"><div><p className="eyebrow">COMUNIDADE DO TEACHER ERIC</p><h1>{title}</h1><p className="muted">{subtitle}</p></div><Link className="button button-light" href="/perfil">Meu perfil</Link></header>{children}</main></div>; }
