import type { Variants } from 'motion/react';

export const EASE_EDITORIAL = [0.22, 1, 0.36, 1] as const;

export const VIEWPORT_ONCE = {
  once: true,
  amount: 'some' as const,
};

export const TRANSITION_MICRO = {
  duration: 0.16,
  ease: EASE_EDITORIAL,
};

export const TRANSITION_NAV = {
  duration: 0.22,
  ease: EASE_EDITORIAL,
};

export const TRANSITION_MODAL = {
  duration: 0.24,
  ease: EASE_EDITORIAL,
};

export const TRANSITION_EDITORIAL = {
  duration: 0.38,
  ease: EASE_EDITORIAL,
};

export const PAGE_VARIANTS: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: EASE_EDITORIAL },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.14, ease: EASE_EDITORIAL },
  },
};

export const HERO_CONTAINER_VARIANTS: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.04,
    },
  },
};

export const HERO_ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASE_EDITORIAL },
  },
};

export const SCROLL_REVEAL_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: EASE_EDITORIAL },
  },
};

export const STAGGER_CONTAINER_VARIANTS: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.02,
    },
  },
};

export const STAGGER_ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: EASE_EDITORIAL },
  },
};

export const DETAIL_COVER_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.42, ease: EASE_EDITORIAL },
  },
};

export const DETAIL_STAGGER_VARIANTS: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

export const DETAIL_ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.34, ease: EASE_EDITORIAL },
  },
};

export const BUTTON_INTERACTION = {
  whileHover: { scale: 1.015 },
  whileTap: { scale: 0.982 },
  transition: { duration: 0.14, ease: EASE_EDITORIAL },
};
