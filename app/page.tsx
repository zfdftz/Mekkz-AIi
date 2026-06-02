import Link from "next/link";
import { WavyBackground } from "@/components/wavy-background";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LandingPage() {
  return (
    <WavyBackground>
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      <main className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="relative z-10 animate-fade-up">
          <h1 className="landing-title text-6xl font-bold tracking-[0.18em] sm:text-7xl md:text-8xl">
            MEKKZ AI
          </h1>

          <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5">
            <Link
              href="/auth/login"
              className="landing-btn min-w-[140px] rounded-xl border border-violet-300/35 bg-gradient-to-br from-violet-500/30 via-purple-600/25 to-indigo-600/25 px-6 py-3 text-sm font-medium shadow-glow transition hover:scale-[1.03]"
            >
              Log in
            </Link>
            <Link
              href="/auth/register"
              className="landing-btn min-w-[140px] rounded-xl border border-violet-300/30 bg-violet-500/15 px-6 py-3 text-sm font-medium transition hover:scale-[1.03] hover:bg-violet-500/25"
            >
              Register
            </Link>
          </div>
        </div>
      </main>
    </WavyBackground>
  );
}
