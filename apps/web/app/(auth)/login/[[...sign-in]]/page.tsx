"use client";

import { SignIn, useAuth, useClerk } from "@clerk/nextjs";
import { useState } from "react";

export default function LoginPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { signOut } = useClerk();
  const [signedOut, setSignedOut] = useState(false);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // User is signed in but landed on /login — show switch-account screen
  // Don't render <SignIn> at all (it would auto-redirect)
  if (isSignedIn && !signedOut) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-sm rounded-lg border bg-card p-8 text-center shadow-lg">
          <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-md bg-primary">
            <span className="text-sm font-bold text-primary-foreground">F</span>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            You&apos;re already signed in
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign out to switch to a different account.
          </p>
          <button
            onClick={async () => {
              await signOut();
              setSignedOut(true);
            }}
            className="mt-6 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Sign Out &amp; Switch Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left brand panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-foreground p-12 text-background">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <span className="text-sm font-bold text-primary-foreground">F</span>
          </div>
          <span className="text-xl font-semibold">FreshSheet</span>
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Smarter sourcing for restaurants
          </h1>
          <p className="text-lg text-muted-foreground">
            Compare suppliers, automate orders, and cut costs — all in one platform.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Trusted by restaurants nationwide
        </p>
      </div>

      {/* Right sign-in panel */}
      <div className="flex w-full flex-col items-center justify-center bg-background px-6 lg:w-1/2">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <span className="text-sm font-bold text-primary-foreground">F</span>
          </div>
          <span className="text-xl font-semibold text-foreground">FreshSheet</span>
        </div>

        <SignIn
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-lg",
              formButtonPrimary:
                "bg-primary hover:bg-primary/90 text-primary-foreground",
            },
          }}
        />
      </div>
    </div>
  );
}
