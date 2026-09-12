import type { Metadata } from 'next';
import './globals.css';
import './projector.css';
export const metadata:Metadata={title:'FLASH0VER · Swarm Containment',description:'Runtime containment for autonomous agent swarms'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
