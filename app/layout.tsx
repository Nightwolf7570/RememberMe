import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RememberMe",
  description: "A Next.js web application for memory support with face recognition",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

