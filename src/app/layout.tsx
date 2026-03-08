import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "3D Chess — Premium Edition",
  description: "A beautifully crafted 3D chess game with Staunton-style pieces, built with Three.js and Next.js.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
