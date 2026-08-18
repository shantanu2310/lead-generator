import type { Metadata } from "next"
import { Open_Sans } from "next/font/google"
import "./globals.css"

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "LeadGen AI — AI-Powered Lead Generation",
  description:
    "Capture, qualify and enrich business leads using AI, Google Places, Brave Search, website crawling, email verification and pipeline automation.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={openSans.variable}>
      <body className="min-h-screen bg-[#E5ECE9] text-[#1e293b] antialiased">
        {children}
      </body>
    </html>
  )
}
