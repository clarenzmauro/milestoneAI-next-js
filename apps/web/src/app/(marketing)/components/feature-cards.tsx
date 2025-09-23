import React from 'react';
import Image from 'next/image';
import type { StaticImageData } from 'next/image';
import aiPoweredPlanningImg from '../../public/ai-powered-planning.png';
import interactiveChatImg from '../../public/interactive-chat.png';
import progressTrackingImg from '../../public/progress-tracking.png';
import realTimeUpdatesImg from '../../public/real-time-updates.png';

interface Feature {
  title: string;
  description: string;
  imageSrc: StaticImageData;
  imageAlt: string;
}

const features: Feature[] = [
  {
    title: 'AI-Powered Planning',
    description: 'Instantly generate detailed 90-day roadmaps.',
    imageSrc: aiPoweredPlanningImg,
    imageAlt: 'Illustration showing AI building a plan',
  },
  {
    title: 'Interactive Chat',
    description: 'Discuss and refine plans with conversational AI.',
    imageSrc: interactiveChatImg,
    imageAlt: 'Illustration of interactive chat guidance',
  },
  {
    title: 'Progress Tracking',
    description: 'Monitor milestones daily, weekly, and monthly.',
    imageSrc: progressTrackingImg,
    imageAlt: 'Progress tracking visualization',
  },
  {
    title: 'Real-Time Updates',
    description: 'Adaptive plans that evolve with you.',
    imageSrc: realTimeUpdatesImg,
    imageAlt: 'Real-time updates and reminders',
  },
];

export default function FeatureCards() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => (
          <article
            key={feature.title}
            className="group relative overflow-hidden rounded-lg border p-6 text-center transition-shadow motion-reduce:transition-none"
            style={{
              background:
                'radial-gradient(360px 200px at 50% 0%, rgba(34,211,238,0.22), rgba(0,0,0,0) 70%), var(--surface-card)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="relative mx-auto mb-6 h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 lg:h-32 lg:w-32">
              <Image
                src={feature.imageSrc}
                alt={feature.imageAlt}
                width={128}
                height={128}
                className="mx-auto h-20 w-20 object-contain sm:h-24 sm:w-24 md:h-28 md:w-28 lg:h-32 lg:w-32"
                priority
              />
            </div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-inverse)' }}>
              {feature.title}
            </h3>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              {feature.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}


