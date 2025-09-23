import Link from 'next/link';
import type { ReactNode } from 'react';

interface ButtonLinkProps {
  href: string;
  children: ReactNode;
  ariaLabel?: string;
}

export default function ButtonLink({ href, children, ariaLabel }: ButtonLinkProps) {
  if (typeof href !== 'string' || href.trim().length === 0) {
    throw new Error('ButtonLink requires a non-empty string href.');
  }

  if (children === undefined || children === null) {
    throw new Error('ButtonLink requires visible children content.');
  }

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="inline-flex items-center rounded-full px-6 py-1.5 text-sm font-medium text-white shadow-md transition-colors motion-reduce:transition-none"
      style={{
        backgroundColor: 'var(--black)',
        backgroundImage: 'var(--grad-cta), linear-gradient(var(--black), var(--black))',
        backgroundRepeat: 'no-repeat, no-repeat',
        backgroundSize: 'calc(100% - 12px) 1px, 100% 100%',
        backgroundPosition: 'center 100%, 0 0',
        border: 'none',
      }}
    >
      {children}
    </Link>
  );
}

