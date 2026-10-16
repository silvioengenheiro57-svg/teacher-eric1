import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Comunidade do Teacher Eric', description: 'Aprende inglês com aulas, comunidade e um assistente de prática.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt"><body>{children}</body></html>; }
