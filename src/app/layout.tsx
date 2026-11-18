import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Viewpoint — Good reads. Little rewards.", description: "Discover stories and earn airtime credits with Viewpoint." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
