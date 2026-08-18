import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-radial-hero">
      <div className="inline-block px-4 py-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-accentPurple text-xs font-semibold mb-6">
        ✨ AI-NATIVE AUTOMATION PLATFORM
      </div>
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight max-w-3xl mb-4 leading-tight">
        Automate Any Workflow with <span className="bg-gradient-glow bg-clip-text text-transparent">Natural Language</span>
      </h1>
      <p className="text-textSecondary text-base sm:text-lg max-w-xl mb-8 leading-relaxed">
        Build complex DAG automations with Gmail, Slack, Google Sheets, and AI processing nodes in seconds.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/dashboard" className="glow-button px-7 py-3 text.base">
          Open Dashboard →
        </Link>
        <Link href="/ai-agent" className="glass-card px-7 py-3 text-base font-semibold hover:border-accentIndigo">
          Try AI Generator
        </Link>
      </div>
    </div>
  );
}
