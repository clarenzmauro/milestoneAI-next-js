import ButtonLink from './button';

export default function NavBar() {
  return (
    <header className="sticky top-0 z-50 border-b backdrop-blur-md" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'transparent' }}>
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4" aria-label="Primary">
        <div className="text-lg font-semibold" style={{ color: 'var(--text-inverse)' }}>MilestoneAI</div>
        <ButtonLink href="/auth" ariaLabel="Get started">
          Get Started
        </ButtonLink>
      </nav>
    </header>
  );
}


