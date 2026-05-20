import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between border-b">
        <div className="font-bold text-xl tracking-tight">Identity.</div>
        <div className="flex gap-4">
          <Link href="/sign-in" className="text-sm font-medium px-4 py-2 hover:opacity-80 transition-opacity">Sign In</Link>
          <Link href="/sign-up" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">Get Started</Link>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto w-full">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-balance mb-6 font-serif">
          Your professional identity, refined.
        </h1>
        <p className="text-xl text-muted-foreground mb-10 max-w-2xl text-balance">
          A bespoke digital business card platform for those who care about every detail.
          Effortless to create, unforgettable to share.
        </p>
        <Link href="/sign-up" className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-4 text-base font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
          Create Your Card
        </Link>
      </main>
    </div>
  );
}