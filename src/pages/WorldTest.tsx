import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics, type FederatedPointerEvent } from 'pixi.js';

const WORLD_SIZE = 3000;
const GRID_SPACING = 100;
const PLAYER_SIZE = 32;
const LERP_FACTOR = 0.15;
const FPS_UPDATE_MS = 500;

export function WorldTest() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const app = new Application();
    let disposed = false;
    let mounted = false;

    void (async () => {
      await app.init({
        resizeTo: host,
        background: 0x0a0a1a,
        antialias: false,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
      });

      if (disposed) {
        app.destroy(true, { children: true, texture: true, textureSource: true });
        return;
      }

      host.appendChild(app.canvas);
      mounted = true;

      const world = new Container();
      app.stage.addChild(world);

      const bg = new Graphics();
      bg.rect(0, 0, WORLD_SIZE, WORLD_SIZE).fill(0x12122a);
      world.addChild(bg);

      const grid = new Graphics();
      for (let x = 0; x <= WORLD_SIZE; x += GRID_SPACING) {
        for (let y = 0; y <= WORLD_SIZE; y += GRID_SPACING) {
          grid.circle(x, y, 2);
        }
      }
      grid.fill(0x3a3a5a);
      world.addChild(grid);

      const player = new Graphics();
      player.rect(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE).fill(0x4effc4);
      player.x = WORLD_SIZE / 2;
      player.y = WORLD_SIZE / 2;
      world.addChild(player);

      let targetX = player.x;
      let targetY = player.y;

      app.stage.eventMode = 'static';
      app.stage.hitArea = app.screen;
      app.stage.on('pointerdown', (e: FederatedPointerEvent) => {
        const p = world.toLocal(e.global);
        targetX = p.x;
        targetY = p.y;
      });

      let fpsAcc = 0;
      app.ticker.add((ticker) => {
        player.x += (targetX - player.x) * LERP_FACTOR;
        player.y += (targetY - player.y) * LERP_FACTOR;

        world.x = app.screen.width / 2 - player.x;
        world.y = app.screen.height / 2 - player.y;

        fpsAcc += ticker.deltaMS;
        if (fpsAcc >= FPS_UPDATE_MS) {
          fpsAcc = 0;
          setFps(Math.round(ticker.FPS));
        }
      });
    })();

    return () => {
      disposed = true;
      if (mounted) {
        try {
          app.destroy(true, { children: true, texture: true, textureSource: true });
        } catch (err) {
          console.error('[WorldTest] destroy failed', err);
        }
      }
    };
  }, []);

  return (
    <div
      ref={hostRef}
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        touchAction: 'none',
        background: '#0a0a1a',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          zIndex: 10,
          color: '#4effc4',
          fontFamily: 'monospace',
          fontSize: 14,
          background: 'rgba(0,0,0,0.55)',
          padding: '4px 8px',
          borderRadius: 4,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        FPS: {fps}
      </div>
    </div>
  );
}
