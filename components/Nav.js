'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="floating-nav">
      <div className="floating-nav-inner">
        <Link href="/" className="nav-brand">
          <span>PPL</span>
          <svg className="nav-trophy" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C6 4 6 6 6 9"/>
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C18 4 18 6 18 9"/>
            <path d="M4 22h16"/>
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
          </svg>
        </Link>
        <div className="nav-links">
          <Link href="/" className={'nav-link' + (path === '/' ? ' active' : '')}>
            <span style={{fontSize:11}}>&#9670;</span> Leagues
          </Link>
          <Link href="/players" className={'nav-link' + (path === '/players' ? ' active' : '')}>
            <span style={{fontSize:11}}>&#9679;</span> Players
          </Link>
          <Link href="/hall-of-fame" className={'nav-link' + (path === '/hall-of-fame' ? ' active' : '')}>
            <span style={{fontSize:11}}>&#9733;</span> Hall of Fame
          </Link>
        </div>
      </div>
    </nav>
  );
}
