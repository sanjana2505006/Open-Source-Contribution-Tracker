import { forceCollide, forceManyBody, forceSimulation, forceX, forceY } from 'd3-force';
import { useEffect, useRef } from 'react';

type Particle = {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  r: number;
  color: string;
};

const COLORS = ['#58a6ff', '#3fb950', '#a371f7', '#58a6ff', '#7eb8ff'];

function particleCount(width: number): number {
  if (width < 640) return 36;
  if (width < 1024) return 58;
  return 88;
}

function lineDistance(width: number): number {
  return width < 640 ? 90 : 130;
}

export function SwarmCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const openRef = useRef(0);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const ctx2d = canvasEl.getContext('2d');
    if (!ctx2d) return;

    const canvas = canvasEl;
    const ctx = ctx2d;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let simulation: ReturnType<typeof forceSimulation<Particle>> | null = null;
    let frameId = 0;
    let lastTime = performance.now();

    function resize() {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return { width: 0, height: 0 };
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { width, height };
    }

    function initSwarm() {
      const cx = width / 2;
      const cy = height / 2;
      const count = particleCount(width);

      particles = Array.from({ length: count }, () => {
        const angle = Math.random() * Math.PI * 2;
        const burst = 2 + Math.random() * 5;
        return {
          x: cx + (Math.random() - 0.5) * 12,
          y: cy + (Math.random() - 0.5) * 12,
          vx: Math.cos(angle) * burst,
          vy: Math.sin(angle) * burst,
          r: 1.5 + Math.random() * 3,
          color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
        };
      });

      simulation?.stop();
      simulation = forceSimulation(particles)
        .force('x', forceX(cx).strength(0.018))
        .force('y', forceY(cy).strength(0.018))
        .force('charge', forceManyBody().strength(-1.8))
        .force('collide', forceCollide<Particle>().radius((d) => d.r + 2))
        .alpha(1)
        .alphaDecay(0.012)
        .velocityDecay(0.32);
    }

    function draw(now: number) {
      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      openRef.current = Math.min(1, openRef.current + delta * 0.45);

      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const maxDist = lineDistance(width);
      const spread = 0.35 + openRef.current * 0.65;

      if (mouseRef.current.active) {
        for (const p of particles) {
          const dx = mouseRef.current.x - p.x;
          const dy = mouseRef.current.y - p.y;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist < 180) {
            const pull = (1 - dist / 180) * 0.08;
            p.vx = (p.vx ?? 0) + (dx / dist) * pull;
            p.vy = (p.vy ?? 0) + (dy / dist) * pull;
          }
        }
      }

      simulation?.tick();

      const display = particles.map((p) => ({
        x: cx + (p.x - cx) * spread,
        y: cy + (p.y - cy) * spread,
        r: p.r,
        color: p.color,
      }));

      for (let i = 0; i < display.length; i++) {
        for (let j = i + 1; j < display.length; j++) {
          const a = display[i]!;
          const b = display[j]!;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < maxDist) {
            const t = 1 - dist / maxDist;
            const alpha = (0.04 + t * 0.14) * openRef.current;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(88, 166, 255, ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      for (const p of display) {
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        glow.addColorStop(0, p.color);
        glow.addColorStop(1, 'transparent');
        ctx.globalAlpha = 0.22 * openRef.current;
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.55 + Math.sin(now * 0.002 + p.x) * 0.1;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      frameId = requestAnimationFrame(draw);
    }

    function onResize() {
      resize();
      initSwarm();
    }

    function onMove(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
    }

    function onLeave() {
      mouseRef.current.active = false;
    }

    resize();
    initSwarm();
    frameId = requestAnimationFrame(draw);
    window.addEventListener('resize', onResize);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);

    return () => {
      cancelAnimationFrame(frameId);
      simulation?.stop();
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="hero-immersive__swarm" aria-hidden />;
}
