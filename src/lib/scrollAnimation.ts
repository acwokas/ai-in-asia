import { useRef, useState, useEffect } from "react";
import type React from "react";

export function useRevealOnScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
          const timer = setTimeout(() => {
            if (el) el.style.willChange = 'auto';
          }, 600);
          return () => clearTimeout(timer);
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const dist = isMobile ? '12px' : '20px';
  const dur = isMobile ? '0.3s' : '0.5s';
  return {
    ref,
    visible,
    style: {
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : `translateY(${dist})`,
      transition: `opacity ${dur} ease-out, transform ${dur} ease-out`,
      willChange: 'transform, opacity',
    } as React.CSSProperties,
  };
}

export function staggerStyle(visible: boolean, index: number): React.CSSProperties {
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
