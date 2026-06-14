import { useEffect, useRef } from 'react';

function enableCustomCursor() {
  document.documentElement.classList.add('custom-cursor-mode');
}

function disableCustomCursor() {
  document.documentElement.classList.remove('custom-cursor-mode');
}

export function canUseCustomCursor(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (!window.matchMedia('(pointer: fine)').matches) return false;
  return true;
}

export function AccentCursor() {
  const rootRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: -100, y: -100 });
  const targetRef = useRef({ x: -100, y: -100 });
  const visibleRef = useRef(false);
  const pressingRef = useRef(false);

  useEffect(() => {
    if (!canUseCustomCursor()) return;

    enableCustomCursor();

    const root = rootRef.current;
    if (!root) return;

    let frameId = 0;

    function paint() {
      if (!root) return;

      posRef.current.x += (targetRef.current.x - posRef.current.x) * 0.72;
      posRef.current.y += (targetRef.current.y - posRef.current.y) * 0.72;

      root.style.transform = `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0)`;
      root.style.opacity = visibleRef.current ? '1' : '0';
      root.classList.toggle('accent-cursor--pressing', pressingRef.current);

      frameId = requestAnimationFrame(paint);
    }

    function onMove(e: MouseEvent) {
      targetRef.current = { x: e.clientX, y: e.clientY };
      visibleRef.current = true;
    }

    function onDown() {
      pressingRef.current = true;
    }

    function onUp() {
      pressingRef.current = false;
    }

    function onLeave() {
      visibleRef.current = false;
    }

    frameId = requestAnimationFrame(paint);
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mouseout', onLeave);
    window.addEventListener('blur', onLeave);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mouseout', onLeave);
      window.removeEventListener('blur', onLeave);
      disableCustomCursor();
    };
  }, []);

  if (!canUseCustomCursor()) return null;

  return (
    <div ref={rootRef} className="accent-cursor" aria-hidden>
      <span className="accent-cursor__ring" />
      <span className="accent-cursor__dot" />
    </div>
  );
}
