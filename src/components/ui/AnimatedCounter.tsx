import { useEffect, useRef, useState } from 'react';
import { animate, useInView } from 'motion/react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { EASE_EDITORIAL } from '../../utils/motion';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({ value, duration = 0.7, className }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 'some' });
  const prefersReduced = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!inView || prefersReduced) return;
    const controls = animate(0, value, {
      duration: value === 0 ? 0.01 : duration,
      ease: EASE_EDITORIAL,
      onUpdate: (latest) => {
        setDisplayValue(Math.round(latest));
      },
    });
    return () => controls.stop();
  }, [duration, inView, prefersReduced, value]);

  const rendered = prefersReduced ? value : inView ? displayValue : 0;

  return (
    <span ref={ref} className={className}>
      {rendered}
    </span>
  );
}
