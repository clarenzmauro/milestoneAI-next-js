import Link from 'next/link';
import Image from 'next/image';
import type { StaticImageData } from 'next/image';
import setYourGoalsImg from '../../public/set-your-goals.png';
import aiBuildsYourPlanImg from '../../public/ai-builds-your-plan.png';
import trackAndAdaptImg from '../../public/track-and-adapt.png';

interface StepItem {
  title: string;
  description: string;
  imageSrc: StaticImageData;
  imageAlt: string;
}

const steps: StepItem[] = [
  {
    title: 'Set your goals',
    description: 'Define what you want to achieve and your time horizon.',
    imageSrc: setYourGoalsImg,
    imageAlt: 'Set your goals illustration',
  },
  {
    title: 'AI builds the plan',
    description: 'Gemini turns your goals into a clear, actionable roadmap.',
    imageSrc: aiBuildsYourPlanImg,
    imageAlt: 'AI builds your plan illustration',
  },
  {
    title: 'Track & adapt',
    description: 'Follow progress, make tweaks, and keep momentum.',
    imageSrc: trackAndAdaptImg,
    imageAlt: 'Track and adapt illustration',
  },
];

export default function HowItWorks() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-inverse)' }}>How it works</h2>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {steps.map((step) => (
          <div key={step.title} className="rounded-lg border p-6" style={{ backgroundColor: 'var(--surface-card)', borderColor: 'var(--border-subtle)' }}>
            <Image src={step.imageSrc} alt={step.imageAlt} width={48} height={48} className="mb-3 h-12 w-12 object-contain" />
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-inverse)' }}>{step.title}</h3>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>{step.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-lg p-8" style={{ background: 'transparent' }}>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-base font-medium" style={{ color: 'var(--text-inverse)' }}>
            Ready to hit your milestone?
          </p>
          <Link
            href="/app"
            className="inline-flex items-center rounded-md px-5 py-3 text-sm font-medium text-white shadow-md transition-colors motion-reduce:transition-none"
            style={{ backgroundImage: 'var(--grad-cta)' }}
          >
            Get Started
          </Link>
        </div>
      </div>
    </section>
  );
}


