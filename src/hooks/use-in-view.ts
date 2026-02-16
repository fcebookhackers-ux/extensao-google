import * as React from "react";

type UseInViewOptions = {
  threshold?: number;
  root?: Element | null;
  rootMargin?: string;
  triggerOnce?: boolean;
};

export function useInView<T extends Element>({
  threshold = 0.2,
  root = null,
  rootMargin = "0px",
  triggerOnce = true,
}: UseInViewOptions = {}) {
  const ref = React.useRef<T | null>(null);
  const [inView, setInView] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (triggerOnce) observer.disconnect();
        } else if (!triggerOnce) {
          setInView(false);
        }
      },
      { threshold, root, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, root, rootMargin, triggerOnce]);

  return { ref, inView } as const;
}
