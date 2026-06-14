import { useEffect, useRef } from 'react';

type Sparkle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  rotation: number;
  spin: number;
  shape: 'star' | 'dot';
};

const GLITTER_COLORS = ['#ffe566', '#ffb8e8', '#ffffff', '#b8e0ff', '#d4b5ff', '#88d4ff', '#ffd1a8'];

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number,
  color: string,
  alpha: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = size * 2.5;

  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI / 2) * i;
    const outerX = Math.cos(angle) * size;
    const outerY = Math.sin(angle) * size;
    const innerX = Math.cos(angle + Math.PI / 4) * size * 0.35;
    const innerY = Math.sin(angle + Math.PI / 4) * size * 0.35;
    if (i === 0) ctx.moveTo(outerX, outerY);
    else ctx.lineTo(outerX, outerY);
    ctx.lineTo(innerX, innerY);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  alpha: number,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
  glow.addColorStop(0, color);
  glow.addColorStop(0.4, color);
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, size * 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = Math.min(1, alpha * 1.2);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, size * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function spawnBurst(sparkles: Sparkle[], x: number, y: number, intensity: number) {
  const count = Math.min(10, 3 + Math.floor(intensity * 4));

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.6 + Math.random() * 1.8 * intensity;

    sparkles.push({
      x: x + (Math.random() - 0.5) * 6,
      y: y + (Math.random() - 0.5) * 6,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.3,
      life: 0,
      maxLife: 0.5 + Math.random() * 0.9,
      size: 1.2 + Math.random() * 2.8,
      color: GLITTER_COLORS[Math.floor(Math.random() * GLITTER_COLORS.length)]!,
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 5,
      shape: Math.random() > 0.45 ? 'star' : 'dot',
    });
  }
}

export function GlitterTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparklesRef = useRef<Sparkle[]>([]);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx2d = canvasEl.getContext('2d');
    if (!ctx2d) return;

    const surface = canvasEl;
    const ctx = ctx2d;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let frameId = 0;
    let lastTime = performance.now();

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      surface.width = width * dpr;
      surface.height = height * dpr;
      surface.style.width = `${width}px`;
      surface.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function addSparkles(x: number, y: number) {
      const last = lastPointRef.current;

      if (!last) {
        spawnBurst(sparklesRef.current, x, y, 1);
        lastPointRef.current = { x, y };
        return;
      }

      const dx = x - last.x;
      const dy = y - last.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 6) return;

      const steps = Math.min(4, Math.max(1, Math.floor(dist / 14)));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        spawnBurst(sparklesRef.current, last.x + dx * t, last.y + dy * t, Math.min(1.4, dist / 24));
      }

      lastPointRef.current = { x, y };

      if (sparklesRef.current.length > 280) {
        sparklesRef.current.splice(0, sparklesRef.current.length - 280);
      }
    }

    function onMove(e: MouseEvent) {
      addSparkles(e.clientX, e.clientY);
    }

    function onTouchMove(e: TouchEvent) {
      const touch = e.touches[0];
      if (touch) addSparkles(touch.clientX, touch.clientY);
    }

    function onLeave() {
      lastPointRef.current = null;
    }

    function draw(now: number) {
      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      const next: Sparkle[] = [];

      for (const sparkle of sparklesRef.current) {
        sparkle.life += delta;
        if (sparkle.life >= sparkle.maxLife) continue;

        sparkle.x += sparkle.vx;
        sparkle.y += sparkle.vy;
        sparkle.vx *= 0.94;
        sparkle.vy = sparkle.vy * 0.94 + 0.12;
        sparkle.rotation += sparkle.spin * delta;

        const progress = sparkle.life / sparkle.maxLife;
        const alpha = (1 - progress) * (0.55 + Math.sin(sparkle.life * 18) * 0.25 + 0.25);
        const size = sparkle.size * (1 - progress * 0.35);

        if (sparkle.shape === 'star') {
          drawStar(ctx, sparkle.x, sparkle.y, size, sparkle.rotation, sparkle.color, alpha);
        } else {
          drawDot(ctx, sparkle.x, sparkle.y, size, sparkle.color, alpha);
        }

        next.push(sparkle);
      }

      sparklesRef.current = next;
      frameId = requestAnimationFrame(draw);
    }

    resize();
    frameId = requestAnimationFrame(draw);

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseout', onLeave);
    window.addEventListener('blur', onLeave);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onLeave);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseout', onLeave);
      window.removeEventListener('blur', onLeave);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onLeave);
      sparklesRef.current = [];
    };
  }, []);

  return <canvas ref={canvasRef} className="glitter-trail" aria-hidden />;
}
