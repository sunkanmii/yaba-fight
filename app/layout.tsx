import type { Metadata } from 'next';
import './arcade.css';
export const metadata: Metadata = {title: 'Yaba Fight — Small game. Big wahala.', description: 'A little Lagos, a little mind game. Play three rounds of street-side sparring with friends or train against adaptive opponents. No sign-up needed.',icons:{icon:'/icon.svg'}};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {return <html lang="en"><body>{children}</body></html>}
