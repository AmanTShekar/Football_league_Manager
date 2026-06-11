import './globals.css';

export const metadata = {
  title: 'Perumbavoor Premier League',
  description: 'Football league management, reimagined.',
};

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-links">
          <a href="/" className="footer-link">Leagues</a>
          <a href="/players" className="footer-link">Players</a>
          <a href="/hall-of-fame" className="footer-link">Hall of Fame</a>
          <a href="https://github.com/AmanTShekar/Permbavoor_premier_league" className="footer-link" target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>
        <div className="footer-copy">&copy; {new Date().getFullYear()} Perumbavoor Premier League</div>
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
