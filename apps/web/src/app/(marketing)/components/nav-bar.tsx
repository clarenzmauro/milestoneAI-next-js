import Link from 'next/link';

export default function NavBar() {
  return (
    <header className="sticky top-0 z-50 border-b backdrop-blur-md" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'transparent' }}>
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4" aria-label="Primary">
        <div className="text-lg font-semibold" style={{ color: 'var(--text-inverse)' }}>MilestoneAI</div>
        <Link
          href="/app"
          className="inline-flex items-center rounded-md px-4 py-2 text-sm font-medium text-white shadow-md transition-colors motion-reduce:transition-none"
          style={{ backgroundImage: 'var(--grad-cta)' }}
        >
          Get Started
        </Link>
      </nav>
    </header>
  );
}


