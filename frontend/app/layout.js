import './globals.css';

export const metadata = {
  title: 'Task Board',
  description: 'Tasks created from Telegram, updated in real time',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
