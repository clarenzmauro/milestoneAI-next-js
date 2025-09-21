export default function Footer() {
  return (
    <footer className="mt-20 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="mx-auto max-w-7xl px-6 py-12">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          © 2025 MilestoneAI
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          MilestoneAI is an intelligent planning app powered by Google’s Gemini 2.5 Flash AI, helping you set clear goals, build actionable roadmaps, and stay on track with adaptive guidance.
        </p>
      </div>
    </footer>
  );
}


