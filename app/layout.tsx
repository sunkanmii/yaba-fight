import type { Metadata } from 'next';
import './arcade.css';
import './strategy.css';
export const metadata: Metadata = {title: 'Yaba Fight — Small game. Big wahala.', description: 'Read your rival. Manage your stamina. Find real players for three rounds in the Lagos backyard, or train free against three distinct adaptive fighters.',icons:{icon:'/icon.svg'}};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {return <html lang="en"><body>{children}</body></html>}
