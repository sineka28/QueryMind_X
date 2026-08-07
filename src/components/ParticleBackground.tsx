import { useMemo } from "react";

interface Particle {
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

export function ParticleBackground({ enabled = true }: { enabled?: boolean }) {
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 24 }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 10 + 8,
      delay: Math.random() * 8,
      opacity: Math.random() * 0.4 + 0.1,
    }));
  }, []);

  if (!enabled) return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-gradient-to-br from-sky-400/40 to-violet-400/40"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
