import type { Metadata } from "next";
import "@fontsource-variable/dm-sans";
import "@fontsource/ibm-plex-mono/400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeLah · Learning studio",
  description: "A demonstration of the CodeLah student, teacher, and parent learning dashboards.",
  icons: { icon: "/favicon.svg" },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-SG">
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
