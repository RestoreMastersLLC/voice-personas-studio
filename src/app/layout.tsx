import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/shared/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Voice Personas Studio - AI-Powered Regional Sales Voice Platform",
  description: "Transform your team's regional voices into scalable, AI-powered sales tools with geographic targeting and performance analytics.",
  keywords: "voice cloning, AI voices, sales automation, regional accents, TTS, ElevenLabs, Vimeo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <Providers>
          <div className="min-h-screen bg-gray-900 text-white">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
