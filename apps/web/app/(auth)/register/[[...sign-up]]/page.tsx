import { SignUp } from "@clerk/nextjs";

export default function RegisterPage() {
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

      {/* Right sign-up panel */}
      <div className="flex w-full flex-col items-center justify-center bg-background px-6 lg:w-1/2">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <span className="text-sm font-bold text-primary-foreground">F</span>
          </div>
          <span className="text-xl font-semibold text-foreground">FreshSheet</span>
        </div>

        <SignUp
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
