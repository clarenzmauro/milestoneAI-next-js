import ButtonLink from './button';

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-6 py-20 text-center">
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl" style={{ color: 'var(--text-inverse)' }}>
          Flexible Planning, Powered by AI
        </h1>
        <p className="mt-4 max-w-2xl text-base sm:text-lg mx-auto" style={{ color: 'var(--text-secondary)' }}>
          MilestoneAI, powered by Google’s Gemini 2.5 Flash AI, helps you set clear goals,
          build actionable roadmaps, and stay on track with adaptive guidance.
        </p>
        <div className="mt-8">
          <ButtonLink href="/app" ariaLabel="Get started">
            Get Started
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
