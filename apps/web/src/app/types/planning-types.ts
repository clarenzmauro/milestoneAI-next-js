import type { StaticImageData } from 'next/image';

export interface TimelineOption {
  title: string;
  duration: number | 'custom';
  description: string;
  imageSrc: StaticImageData;
  imageAlt: string;
}
