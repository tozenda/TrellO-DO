import { createId } from "@/shared/utils/ids";

export interface CelebrationParticle {
  id: string;
  left: string;
  delay: string;
  duration: string;
  drift: string;
  rotation: string;
  size: string;
  color: string;
  shape: "capsule" | "square" | "circle";
}

export interface Celebration {
  id: string;
  particles: CelebrationParticle[];
}

export function createCelebration(): Celebration {
  const celebrationId = createId("celebration");
  return {
    id: celebrationId,
    particles: Array.from({ length: 28 }, (_, index) => ({
      id: `${celebrationId}-${index}`,
      left: `${4 + Math.random() * 92}%`,
      delay: `${index * 28}ms`,
      duration: `${1100 + Math.random() * 700}ms`,
      drift: `${-140 + Math.random() * 280}px`,
      rotation: `${-220 + Math.random() * 440}deg`,
      size: `${8 + Math.random() * 10}px`,
      color: pickCelebrationColor(index),
      shape: index % 5 === 0 ? "capsule" : index % 2 === 0 ? "square" : "circle",
    })),
  };
}

function pickCelebrationColor(index: number): string {
  const palette = ["#1677ff", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#22c55e"];
  return palette[index % palette.length];
}
