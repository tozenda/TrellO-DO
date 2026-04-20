import type { CSSProperties } from "react";
import type { Celebration } from "@/features/celebration/utils";

interface CelebrationLayerProps {
  celebrations: Celebration[];
}

export function CelebrationLayer({ celebrations }: CelebrationLayerProps) {
  return (
    <div className="celebration-layer" aria-hidden="true">
      {celebrations.map((celebration) => (
        <div key={celebration.id} className="celebration-burst">
          <div className="celebration-flash" />
          <div className="celebration-toast">Done</div>
          {celebration.particles.map((particle) => (
            <span
              key={particle.id}
              className="celebration-particle"
              style={
                {
                  "--left": particle.left,
                  "--delay": particle.delay,
                  "--duration": particle.duration,
                  "--drift": particle.drift,
                  "--rotation": particle.rotation,
                  "--size": particle.size,
                  "--color": particle.color,
                } as CSSProperties
              }
              data-shape={particle.shape}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
