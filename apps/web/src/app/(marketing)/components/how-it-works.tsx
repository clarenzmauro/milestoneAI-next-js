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
          <article
            key={step.title}
            className="group relative overflow-hidden rounded-lg border p-6 text-center transition-shadow motion-reduce:transition-none"
            style={{
              background:
                'radial-gradient(360px 200px at 50% 0%, rgba(34,211,238,0.22), rgba(0,0,0,0) 70%), var(--surface-card)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="relative mx-auto mb-6 h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 lg:h-32 lg:w-32">
              <Image
                src={step.imageSrc}
                alt={step.imageAlt}
                width={128}
                height={128}
                className="mx-auto h-20 w-20 object-contain sm:h-24 sm:w-24 md:h-28 md:w-28 lg:h-32 lg:w-32"
                priority
              />
            </div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-inverse)' }}>{step.title}</h3>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>{step.description}</p>
          </article>
        ))}
      </div>

      <div className="mt-12 rounded-lg p-8" style={{ background: 'transparent' }}>
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-inverse)' }}>
            Ready to hit your milestone?
          </h2>
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


