import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://hoverup.in"),
  title: {
    default: "Hover Up | Discover Your Style. Make Your Statement.",
    template: "%s | Hover Up",
  },
  description:
    "Discover standout styles and shop the latest Hover Up collection. Explore curated picks, fresh finds and everyday essentials—find your next favourite today.",
  applicationName: "Hover Up",
  keywords: [
    "Hover Up",
    "online shopping",
    "shop online",
    "latest collection",
    "fashion and lifestyle",
    "everyday essentials",
    "curated products",
    "online store India",
  ],
  openGraph: {
    type: "website",
    siteName: "Hover Up",
    title: "Hover Up | Discover Your Style. Make Your Statement.",
    description:
      "Explore standout styles, fresh finds and everyday essentials. Discover the latest collection at Hover Up.",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hover Up | Discover Your Style. Make Your Statement.",
    description:
      "Explore standout styles, fresh finds and everyday essentials at Hover Up.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Hover Up",
    url: "https://hoverup.in",
    sameAs: ["https://www.instagram.com/hoverup.in/"],
    telephone: "+91-9363254591",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Masjid St, Noorullahpet, Muslimpur, Basheerabad",
      addressLocality: "Vaniyambadi",
      addressRegion: "Tamil Nadu",
      postalCode: "635751",
      addressCountry: "IN",
    },
  };

  return (
    <html lang="en-IN">
      <body className={`${manrope.variable} ${playfair.variable} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        {children}
      </body>
    </html>
  );
}
