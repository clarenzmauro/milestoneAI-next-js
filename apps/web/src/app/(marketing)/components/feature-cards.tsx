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
    description: 'Turn goals into a clear, adaptive 90-day roadmap in seconds.',
    imageSrc: aiPoweredPlanningImg,
    imageAlt: 'Illustration showing AI building a plan',
  },
  {
    title: 'Conversational Guidance',
    description: 'Chat to refine milestones, resolve blockers, and adjust scope.',
    imageSrc: interactiveChatImg,
    imageAlt: 'Illustration of interactive chat guidance',
  },
  {
    title: 'Progress Tracking',
    description: 'Visualize progress across weeks and milestones with clarity.',
    imageSrc: progressTrackingImg,
    imageAlt: 'Progress tracking visualization',
  },
  {
    title: 'Time-Aware Suggestions',
    description: 'Stay on track with smart nudges and calendar-friendly pacing.',
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
            className="rounded-lg border p-6 transition-shadow motion-reduce:transition-none"
            style={{
              backgroundColor: 'var(--surface-card)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <Image
              src={feature.imageSrc}
              alt={feature.imageAlt}
              width={48}
              height={48}
              className="mb-4 h-12 w-12 object-contain"
              priority
            />
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


