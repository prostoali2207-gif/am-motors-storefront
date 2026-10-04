"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";

/**
 * VDP photo viewer (client island). Receives only same-origin `/media/…` paths and ready-made
 * strings — no Drive URL, file ID or vehicle object reaches the client.
 *
 * - One photo viewport. With more than one photo: native horizontal swipe (CSS scroll snap, so
 *   vertical page scrolling stays with the browser), Previous / Next, a visible "1 / N" counter
 *   and a thumbnail rail. Previous / Next wrap around; swipe stops at the ends.
 * - Tapping the photo opens a full-screen viewer (`<dialog>` in modal mode: top layer above the
 *   sticky action bar, background inert). Escape closes, Arrow keys navigate, the page behind
 *   does not scroll, and closing returns focus to the photo button the viewer belongs to.
 * - Exactly one photo: the photo and the full-screen view only — no controls that do nothing.
 * - First photo eager with high fetch priority (the VDP's LCP); every other image lazy.
 * - No animation: programmatic moves jump instantly.
 */

export interface ViewerPhoto {
  /** Opaque media ID (not a Drive file ID). */
  readonly id: string;
  /** Same-origin sanitized image path (`/media/…`). */
  readonly src: string;
  readonly alt: string;
  /** Spoken position, e.g. "Photo 2 of 5". */
  readonly position: string;
}

export interface ViewerLabels {
  readonly heading: string;
  readonly previous: string;
  readonly next: string;
  readonly open: string;
  readonly close: string;
  readonly thumbnails: string;
}

type Dir = "ltr" | "rtl";

const STAGE_SIZES = "(min-width: 64rem) 46rem, 100vw";

/** Wraps an index into 0…count-1. */
function wrap(index: number, count: number): number {
  return ((index % count) + count) % count;
}

/** Jumps a snap track to slide `index` (RTL tracks scroll towards negative `scrollLeft`). */
function scrollTrackTo(track: HTMLElement | null, index: number, dir: Dir) {
  if (track === null || typeof track.scrollTo !== "function") return;
  track.scrollTo({ left: (dir === "rtl" ? -1 : 1) * index * track.clientWidth, behavior: "instant" });
}

/** The slide currently snapped in a track, or null when it has no layout. */
function slideInView(track: HTMLElement, count: number): number | null {
  if (track.clientWidth <= 0) return null;
  return Math.min(count - 1, Math.max(0, Math.round(Math.abs(track.scrollLeft) / track.clientWidth)));
}

/** Arrow keys follow the screen: in RTL the left arrow moves forward. */
function arrowStep(key: string, dir: Dir): -1 | 1 | null {
  if (key !== "ArrowLeft" && key !== "ArrowRight") return null;
  const forward = dir === "rtl" ? "ArrowLeft" : "ArrowRight";
  return key === forward ? 1 : -1;
}

export function PhotoViewer({ photos, labels, dir }: { photos: readonly ViewerPhoto[]; labels: ViewerLabels; dir: Dir }) {
  const count = photos.length;
  const multiple = count > 1;
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const track = useRef<HTMLUListElement>(null);
  const rail = useRef<HTMLUListElement>(null);
  const slideButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const restoreFocus = useRef(false);

  const show = useCallback(
    (next: number) => {
      const target = wrap(next, count);
      setIndex(target);
      scrollTrackTo(track.current, target, dir);
    },
    [count, dir],
  );

  const onTrackScroll = () => {
    const element = track.current;
    if (element === null) return;
    const inView = slideInView(element, count);
    if (inView !== null) setIndex(inView);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const step = multiple ? arrowStep(event.key, dir) : null;
    if (step === null) return;
    event.preventDefault();
    show(index + step);
  };

  const closeFullscreen = useCallback(() => {
    restoreFocus.current = true;
    setFullscreen(false);
  }, []);

  // Back from full screen: focus the photo button the viewer was opened from (now showing the
  // photo the visitor ended on), without scrolling the page.
  useEffect(() => {
    if (fullscreen || !restoreFocus.current) return;
    restoreFocus.current = false;
    slideButtons.current[index]?.focus({ preventScroll: true });
  }, [fullscreen, index]);

  // Keep the selected thumbnail inside the rail's visible area (rail only, never the page).
  useEffect(() => {
    const list = rail.current;
    const thumb = list?.children[index];
    if (!list || !(thumb instanceof HTMLElement) || typeof list.scrollBy !== "function") return;
    const outer = list.getBoundingClientRect();
    const inner = thumb.getBoundingClientRect();
    if (inner.left < outer.left) list.scrollBy({ left: inner.left - outer.left, behavior: "instant" });
    else if (inner.right > outer.right) list.scrollBy({ left: inner.right - outer.right, behavior: "instant" });
  }, [index]);

  return (
    <div className="photo-viewer" onKeyDown={onKeyDown}>
      <div className="photo-stage">
        <ul ref={track} className="photo-track" onScroll={multiple ? onTrackScroll : undefined}>
          {photos.map((photo, i) => (
            <li key={photo.id} className="photo-slide">
              <button
                ref={(element) => {
                  slideButtons.current[i] = element;
                }}
                type="button"
                className="photo-open"
                tabIndex={i === index ? 0 : -1}
                onClick={() => {
                  setIndex(i);
                  setFullscreen(true);
                }}
              >
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes={STAGE_SIZES}
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : undefined}
                />
                <span className="visually-hidden">{labels.open}</span>
              </button>
            </li>
          ))}
        </ul>
        {multiple ? (
          <>
            <StepButtons labels={labels} onStep={(step) => show(index + step)} />
            <Counter index={index} photos={photos} />
          </>
        ) : null}
      </div>

      {multiple ? (
        <ul ref={rail} className="photo-thumbs" aria-label={labels.thumbnails}>
          {photos.map((photo, i) => (
            <li key={photo.id}>
              <button
                type="button"
                className="photo-thumb"
                aria-label={photo.position}
                aria-current={i === index ? "true" : undefined}
                onClick={() => show(i)}
              >
                <Image src={photo.src} alt="" fill sizes="5rem" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {fullscreen ? (
        <FullscreenViewer
          photos={photos}
          labels={labels}
          dir={dir}
          index={index}
          onIndex={show}
          onClose={closeFullscreen}
        />
      ) : null}
    </div>
  );
}

function StepButtons({ labels, onStep }: { labels: ViewerLabels; onStep: (step: -1 | 1) => void }) {
  return (
    <>
      <button type="button" className="photo-step photo-step-previous" aria-label={labels.previous} onClick={() => onStep(-1)}>
        <Chevron />
      </button>
      <button type="button" className="photo-step photo-step-next" aria-label={labels.next} onClick={() => onStep(1)}>
        <Chevron />
      </button>
    </>
  );
}

/** Visible "1 / N" (figures, always left-to-right) plus a spoken, localized position. */
function Counter({ index, photos }: { index: number; photos: readonly ViewerPhoto[] }) {
  return (
    <p className="photo-counter" aria-live="polite" aria-atomic="true">
      <span aria-hidden="true" dir="ltr">
        {index + 1} / {photos.length}
      </span>
      <span className="visually-hidden">{photos[index]?.position}</span>
    </p>
  );
}

/** Points towards inline-end; mirrored in RTL by CSS. Decorative. */
function Chevron() {
  return (
    <svg className="photo-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
    </svg>
  );
}

/** Locks page scrolling while mounted. */
function useScrollLock() {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, []);
}

function FullscreenViewer({
  photos,
  labels,
  dir,
  index,
  onIndex,
  onClose,
}: {
  photos: readonly ViewerPhoto[];
  labels: ViewerLabels;
  dir: Dir;
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const count = photos.length;
  const multiple = count > 1;
  const dialog = useRef<HTMLDialogElement>(null);
  const track = useRef<HTMLUListElement>(null);
  const [startIndex] = useState(index);

  useScrollLock();

  // Open modally (top layer, inert page); `open` attribute where `showModal` is unsupported.
  useEffect(() => {
    const element = dialog.current;
    if (element === null) return;
    if (typeof element.showModal === "function") {
      if (!element.open) element.showModal();
    } else {
      element.setAttribute("open", "");
    }
    scrollTrackTo(track.current, startIndex, dir);
    return () => {
      if (element.open && typeof element.close === "function") element.close();
    };
  }, [startIndex, dir]);

  const show = (next: number) => {
    const target = wrap(next, count);
    onIndex(target);
    scrollTrackTo(track.current, target, dir);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    const step = multiple ? arrowStep(event.key, dir) : null;
    if (step === null) return;
    event.preventDefault();
    event.stopPropagation();
    show(index + step);
  };

  const onTrackScroll = () => {
    const element = track.current;
    if (element === null) return;
    const inView = slideInView(element, count);
    if (inView !== null && inView !== index) onIndex(inView);
  };

  return (
    <dialog
      ref={dialog}
      className="lightbox"
      aria-labelledby="lightbox-heading"
      onKeyDown={onKeyDown}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="lightbox-bar">
        <h2 id="lightbox-heading" className="visually-hidden">
          {labels.heading}
        </h2>
        {multiple ? <Counter index={index} photos={photos} /> : <span />}
        <button type="button" className="photo-step lightbox-close" aria-label={labels.close} onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
      <div className="lightbox-stage">
        {/* Focusable so the scroll area is reachable by keyboard (it holds no controls). */}
        <ul
          ref={track}
          className="photo-track"
          tabIndex={0}
          aria-label={photos[index]?.position}
          onScroll={multiple ? onTrackScroll : undefined}
        >
          {photos.map((photo, i) => (
            <li key={photo.id} className="photo-slide">
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="100vw"
                loading={i === startIndex ? "eager" : "lazy"}
              />
            </li>
          ))}
        </ul>
        {multiple ? <StepButtons labels={labels} onStep={(step) => show(index + step)} /> : null}
      </div>
    </dialog>
  );
}
