import './globals.css';
import ErrorBoundary from './components/ErrorBoundary';

export const metadata = {
  title: 'PLAN-10 BD (PVT). LTD | Smart Business & Investment Group',
  description: 'Official Portal of PLAN-10 BD (PVT). LTD. Leading multi-sector business network in Bangladesh specializing in Fisheries, Agriculture, Land Development, FMCG Consumer Goods, and Halal 33-Month Investment Plans.',
  keywords: 'Plan-10 BD, Smart Investment Bangladesh, Fisheries, Agriculture, Land Development, FMCG Products, Halal Investment, Cashback Plan, Gazipur Business',
  icons: {
    icon: '/assets/plan10logo.jpeg',
    shortcut: '/assets/plan10logo.jpeg',
    apple: '/assets/plan10logo.jpeg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
