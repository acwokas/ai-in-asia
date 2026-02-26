import { useRef, useState, useEffect, useCallback } from "react";
import type React from "react";

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useRevealOnScroll() {
  const [visible, setVisible] = useState(false);
  const [element, setElement] = useState<HTMLElement | null>(null);

  // Callback ref so we know when the element mounts/unmounts
  const ref = useCallback((node: HTMLDivElement | null) => {
    setElement(node);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setVisible(true);
      return;
    }
    if (!element) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
          setTimeout(() => {
            if (element) element.style.willChange = 'auto';
          }, 600);
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(element);
    return () => obs.disconnect();
  }, [element]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const reduced = prefersReducedMotion();
  const dist = isMobile ? '12px' : '20px';
  const dur = isMobile ? '0.3s' : '0.5s';
  return {
    ref,
    visible,
    style: reduced ? {} : {
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : `translateY(${dist})`,
      transition: `opacity ${dur} ease-out, transform ${dur} ease-out`,
      willChange: 'transform, opacity',
    } as React.CSSProperties,
  };
}

export function staggerStyle(visible: boolean, index: number): React.CSSProperties {
  if (prefersReducedMotion()) return {};
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const dist = isMobile ? '12px' : '20px';
  const dur = isMobile ? '0.3s' : '0.5s';
  const delay = `${index * 100}ms`;
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : `translateY(${dist})`,
    transition: `opacity ${dur} ease-out ${delay}, transform ${dur} ease-out ${delay}`,
    willChange: 'transform, opacity',
  };
}
