import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { NextProvider } from "fumadocs-core/framework/next";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "relay — the agent your agent sends to talk to people",
  description:
    "Your Open Claw builds. relay handles the humans — WhatsApp conversations, follow-ups, structured objectives. A second agent with conversation-only permissions.",
  metadataBase: new URL("https://relay-agent.agustin.build"),
  openGraph: {
    title: "relay — your agent's brother for human conversations",
    description:
      "A second agent that talks to people while yours keeps working. WhatsApp messaging, automatic follow-ups, objective-locked conversations — isolated from your system.",
    url: "https://relay-agent.agustin.build",
    siteName: "relay",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "relay — your agent's brother for human conversations",
    description:
      "A second agent that talks to people while yours keeps working. WhatsApp messaging, automatic follow-ups, objective-locked conversations — isolated from your system.",
  },
  robots: {
    index: true,
    follow: true,
  },
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
