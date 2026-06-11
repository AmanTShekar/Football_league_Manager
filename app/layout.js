import './globals.css';

export const metadata = {
  title: 'Perumbavoor Premier League',
  description: 'Football league management, reimagined.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <div id="toast-root" className="toast-container" />
        <div id="modal-root" />
      </body>
    </html>
  );
}
