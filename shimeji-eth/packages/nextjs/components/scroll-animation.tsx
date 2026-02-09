"use client";

import { useEffect } from "react";
import { motion, useAnimation } from "framer-motion";
import { useInView } from "react-intersection-observer";

interface ScrollAnimationProps {
  children: React.ReactNode;
  variants: any;
}

export function ScrollAnimation({ children, variants }: ScrollAnimationProps) {
  const controls = useAnimation();
  const [ref, inView] = useInView({
    threshold: 0.2,
    rootMargin: "-50px",
  });

  useEffect(() => {
    if (inView) {
      controls.start("visible");
    } else {
      controls.start("hidden");
    }
  }, [controls, inView]);

  return (
    <motion.div ref={ref} initial="hidden" animate={controls} variants={variants}>
      {children}
    </motion.div>
  );
}
