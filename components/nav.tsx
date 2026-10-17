'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, House, Menu, MessageCircle, Search, Send, Shield, UserRound, UserRoundPlus, Users, X } from 'lucide-react';
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
	{ href: '/comunidade', label: 'Feed', icon: House },
	{ href: '/amizades', label: 'Amigos', icon: UserRoundPlus },
	{ href: '/mensagens', label: 'Mensagens', icon: Send },
	{ href: '/chatbot', label: 'Chatbot', icon: MessageCircle },
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
		{mobileLinks.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-label={label} title={label} aria-current={pathname === href || pathname.startsWith(`${href}/`) ? 'page' : undefined}>
			<Icon size={25} strokeWidth={2.1} /><span>{label}</span>
		</Link>)}
	</nav>;
}

export function MobileAppHeader() {
	const supabase = useMemo(() => createSupabaseBrowserClient(), []);
	const router = useRouter();
	const menuRef = useRef<HTMLDetailsElement>(null);
	const [signOutError, setSignOutError] = useState('');
	const [signingOut, setSigningOut] = useState(false);

	async function signOut() {
		if (signingOut) return;
		setSigningOut(true);
		setSignOutError('');
		const { error } = await supabase.auth.signOut();
		if (error) {
			setSignOutError(`Não foi possível terminar a sessão: ${error.message}`);
			setSigningOut(false);
			return;
		}
		menuRef.current?.removeAttribute('open');
		router.replace('/entrar');
		router.refresh();
	}

	return <header className="mobile-app-header">
		<Link href="/comunidade" className="mobile-app-brand"><span>Teacher Eric<span className="mobile-brand-period">.</span></span></Link>
		<div className="mobile-app-actions">
			<Link className="mobile-app-action" href="/pesquisar" aria-label="Pesquisar membro" title="Pesquisar membro"><Search size={22} strokeWidth={2.3} /></Link>
			<details className="mobile-app-menu" ref={menuRef}>
				<summary className="mobile-app-action" aria-label="Abrir menu" title="Abrir menu"><Menu size={23} strokeWidth={2.3} /></summary>
				<nav aria-label="Menu da comunidade">
					<Link href="/sobre-teacher-eric" onClick={() => menuRef.current?.removeAttribute('open')}><BookOpen size={18} /><span>Tudo sobre Teacher Eric</span></Link>
					{signOutError && <p className="mobile-menu-error" role="alert">{signOutError}</p>}
					<button type="button" onClick={() => void signOut()} disabled={signingOut}>
						{signingOut ? <span className="mobile-menu-spinner" aria-hidden="true" /> : <X size={18} />}
						<span>{signingOut ? 'A terminar sessão…' : 'Terminar sessão'}</span>
					</button>
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
