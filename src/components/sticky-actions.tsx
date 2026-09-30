"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Mobile sticky conversion bar (max two actions, never on sold VDPs — the caller renders it only
 * for available vehicles). Hidden until the in-page action zone `watchId` has scrolled up out of
 * view; hidden again when it comes back. No animation. Hidden on desktop by CSS, where the
 * actions sit in the right-hand panel.
 *
 * `hidden` removes it from the accessibility tree and the tab order while it is not shown. The
 * page reserves the bar's height as bottom padding (globals.css) so it never covers the last
 * content; the real height is measured (labels can wrap on narrow screens, safe-area insets vary)
 * and published as `--sticky-actions-height`.
 */
const HEIGHT_VARIABLE = "--sticky-actions-height";

export function StickyActions({ watchId, children }: { watchId: string; children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = document.getElementById(watchId);
    if (target === null || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry !== undefined && !entry.isIntersecting && entry.boundingClientRect.bottom <= 0);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [watchId]);

  useEffect(() => {
    const element = bar.current;
    if (element === null || typeof ResizeObserver === "undefined") return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => {
      const height = element.getBoundingClientRect().height;
      // Hidden (height 0): keep the last reserved value so the page does not jump.
      if (height > 0) root.style.setProperty(HEIGHT_VARIABLE, `${Math.ceil(height)}px`);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.removeProperty(HEIGHT_VARIABLE);
    };
  }, []);

  return (
    <div ref={bar} className="sticky-actions" data-sticky-actions="" hidden={!visible}>
      <div className="sticky-actions-inner">{children}</div>
    </div>
  );
}
