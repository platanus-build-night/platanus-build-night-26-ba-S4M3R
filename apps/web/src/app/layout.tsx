import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { NextProvider } from "fumadocs-core/framework/next";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "relay-agent",
  description: "A separate agent for talking with the real world.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${jetbrainsMono.variable} font-mono antialiased`}>
        <NextProvider>{children}</NextProvider>
      </body>
    </html>
  );
}
