import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { QueryProvider } from "@/lib/query-provider";
import { CartProvider } from "@/lib/cart-context";
import { ChatProvider } from "@/lib/chat-context";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sourcery - AI-Powered Restaurant Sourcing",
  description:
    "Streamline your restaurant sourcing with AI-powered supplier matching and price optimization",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <QueryProvider>
            <CartProvider>
              <ChatProvider>{children}</ChatProvider>
            </CartProvider>
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
