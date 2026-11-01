import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "WHITYRAY AI CINEMA", description: "Write, storyboard and generate cinematic films with AI." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
