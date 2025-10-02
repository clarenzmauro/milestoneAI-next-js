import type { TimelineOption } from '../types/planning-types';
import quickSprintImg from '../public/quick-sprint.png';
import focusedMonthImg from '../public/focused-month.png';
import quarterlyPlanImg from '../public/quarterly-plan.png';
import customDurationImg from '../public/custom-duration.png';

export const timelineOptions: TimelineOption[] = [
  {
    title: 'Quick Sprint',
    duration: 7,
    description: '7 Days',
    imageSrc: quickSprintImg,
    imageAlt: '7 Days'
  },
  {
    title: 'Focused Month',
    duration: 30,
    description: '30 Days',
    imageSrc: focusedMonthImg,
    imageAlt: '30 Days'
  },
  {
    title: 'Quarterly Plan',
    duration: 90,
    description: '90 Days',
    imageSrc: quarterlyPlanImg,
    imageAlt: '90 Days'
  },
  {
    title: 'Custom Duration',
    duration: 'custom',
    description: '-- Days',
    imageSrc: customDurationImg,
    imageAlt: '-- Days'
  }
];
