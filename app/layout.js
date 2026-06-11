import './globals.css';

export const metadata = {
  title: 'Football League Manager',
  description: 'Open-source football league management, reimagined.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-links">
          <a href="/" className="footer-link">Leagues</a>
          <a href="/players" className="footer-link">Players</a>
          <a href="/hall-of-fame" className="footer-link">Hall of Fame</a>
          <a href="https://github.com" className="footer-link" target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>
        <div className="footer-copy">&copy; {new Date().getFullYear()} Football League Manager</div>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Footer />
        <div id="toast-root" className="toast-container" />
        <div id="modal-root" />
      </body>
    </html>
  );
}
