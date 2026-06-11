import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-sm leading-7 text-muted">
      <h1 className="mb-6 text-3xl font-semibold text-fg">Privacy Policy — mekkz AI</h1>
      <p className="mb-4">
        mekkz AI (&quot;we&quot;, &quot;our&quot;) operates the mekkz AI chat application and website at
        mekkzai.com. This policy explains how we handle your data.
      </p>
      <h2 className="mb-2 text-lg font-semibold text-fg">Data we collect</h2>
      <ul className="mb-4 list-disc space-y-1 pl-5">
        <li>Account email and authentication data (Supabase)</li>
        <li>Chat messages and uploaded images you send in the app</li>
        <li>Subscription status if you purchase Pro or Ultra (Stripe)</li>
        <li>Language and appearance preferences</li>
      </ul>
      <h2 className="mb-2 text-lg font-semibold text-fg">How we use data</h2>
      <p className="mb-4">
        We use your data to provide AI chat, image generation, billing, and to improve the service.
        AI providers (e.g. Groq, OpenAI) process messages to generate responses. We do not sell your
        personal data.
      </p>
      <h2 className="mb-2 text-lg font-semibold text-fg">Contact</h2>
      <p className="mb-8">
        Questions: contact via the support email listed in the App Store / Google Play listing or on
        mekkzai.com.
      </p>
      <Link href="/" className="text-primary hover:underline">
        ← Back to mekkz AI
      </Link>
    </main>
  );
}
