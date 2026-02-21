import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { QueryProvider } from "@/lib/query-provider";
import { CartProvider } from "@/lib/cart-context";
import { ChatProvider } from "@/lib/chat-context";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Heard - AI-Powered Restaurant Sourcing",
  description:
    "Streamline your restaurant sourcing with AI-powered supplier matching and price optimization",
};

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <CartProvider>
        <ChatProvider>{children}</ChatProvider>
      </CartProvider>
    </QueryProvider>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );

  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return content;
  }

  return <ClerkProvider>{content}</ClerkProvider>;
}
