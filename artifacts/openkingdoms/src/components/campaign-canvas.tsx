import { type PointerEvent, useEffect, useRef } from 'react';

export type CanvasRegion = {
  id: string;
  name: string;
  kind: 'player' | 'rival' | 'neutral';
  settlement: 'Village' | 'Town' | 'City';
  forces: number;
  path: string;
  label: [number, number];
};

export type CanvasPalette = {
  water: string;
  land: string;
  player: string;
  rival: string;
  neutral: string;
  ink: string;
  mutedInk: string;
  road: string;
  selection: string;
};

type CampaignCanvasProps = {
  regions: CanvasRegion[];
  selectedId: string | null;
  bannerColor: string;
  palette: CanvasPalette;
  onSelect: (id: string) => void;
};

const VIEW_WIDTH = 760;
const VIEW_HEIGHT = 390;

function drawWrappedName(
  context: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
) {
  const words = name.split(' ');
  if (words.length < 2) {
    context.fillText(name, x, y);
    return;
  }

  context.fillText(words.slice(0, -1).join(' '), x, y - 2);
  context.fillText(words.at(-1) ?? '', x, y + 15);
}

export function CampaignCanvas({
  regions,
  selectedId,
  bannerColor,
  palette,
  onSelect,
}: CampaignCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(bounds.width * pixelRatio));
      canvas.height = Math.max(1, Math.floor(bounds.height * pixelRatio));

      const context = canvas.getContext('2d');
      if (!context) return;

      context.setTransform(
        (bounds.width / VIEW_WIDTH) * pixelRatio,
        0,
        0,
        (bounds.height / VIEW_HEIGHT) * pixelRatio,
        0,
        0,
      );
      context.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      context.fillStyle = palette.water;
      context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

      context.save();
      context.strokeStyle = palette.road;
      context.lineWidth = 2;
      context.setLineDash([6, 7]);
      context.globalAlpha = 0.72;
      context.beginPath();
      context.moveTo(174, 213);
      context.bezierCurveTo(235, 182, 263, 200, 326, 249);
      context.bezierCurveTo(443, 242, 548, 262, 600, 190);
      context.stroke();
      context.beginPath();
      context.moveTo(141, 121);
      context.bezierCurveTo(224, 142, 240, 108, 278, 122);
      context.bezierCurveTo(350, 165, 355, 221, 355, 221);
      context.stroke();
      context.restore();

      regions.forEach((region) => {
        const path = new Path2D(region.path);
        const isSelected = region.id === selectedId;
        context.save();
        context.fillStyle =
          region.kind === 'player'
            ? palette.player
            : region.kind === 'rival'
              ? palette.rival
              : palette.neutral;
        context.strokeStyle = palette.ink;
        context.lineWidth = 1.5;
        context.setLineDash([2, 4]);
        if (isSelected) {
          context.shadowColor = palette.selection;
          context.shadowBlur = 10;
          context.lineWidth = 3;
        }
        context.fill(path);
        context.stroke(path);
        context.restore();

        context.save();
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = palette.ink;
        context.font = '700 15px Georgia, serif';
        drawWrappedName(context, region.name, region.label[0], region.label[1]);
        context.fillStyle = palette.mutedInk;
        context.font = '500 8px "DM Mono", monospace';
        context.letterSpacing = '1px';
        context.fillText(
          `${region.settlement.toUpperCase()} · ${region.forces}`,
          region.label[0],
          region.label[1] + 29,
        );

        if (region.kind === 'player') {
          context.fillStyle = bannerColor;
          context.beginPath();
          context.moveTo(region.label[0] - 5, region.label[1] - 28);
          context.lineTo(region.label[0] + 5, region.label[1] - 28);
          context.lineTo(region.label[0], region.label[1] - 21);
          context.closePath();
          context.fill();
        }

        if (region.kind === 'rival') {
          context.strokeStyle = palette.rival;
          context.lineWidth = 2;
          context.beginPath();
          context.moveTo(region.label[0] - 5, region.label[1] + 36);
          context.lineTo(region.label[0] + 5, region.label[1] + 46);
          context.moveTo(region.label[0] + 5, region.label[1] + 36);
          context.lineTo(region.label[0] - 5, region.label[1] + 46);
          context.stroke();
        }
        context.restore();
      });

      context.save();
      context.strokeStyle = palette.road;
      context.lineWidth = 1;
      context.setLineDash([]);
      context.beginPath();
      context.arc(692, 57, 19, 0, Math.PI * 2);
      context.stroke();
      context.beginPath();
      context.moveTo(692, 42);
      context.lineTo(696, 57);
      context.lineTo(692, 72);
      context.lineTo(688, 57);
      context.closePath();
      context.stroke();
      context.font = '500 9px "DM Mono", monospace';
      context.textAlign = 'center';
      context.fillStyle = palette.road;
      context.fillText('N', 692, 31);
      context.beginPath();
      context.moveTo(44, 342);
      context.lineTo(114, 342);
      context.moveTo(44, 337);
      context.lineTo(44, 347);
      context.moveTo(79, 337);
      context.lineTo(79, 347);
      context.moveTo(114, 337);
      context.lineTo(114, 347);
      context.stroke();
      context.fillText('50 MILES', 79, 360);
      context.restore();
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [bannerColor, palette, regions, selectedId]);

  const selectAtPoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * VIEW_WIDTH;
    const y = ((event.clientY - bounds.top) / bounds.height) * VIEW_HEIGHT;
    const context = canvas.getContext('2d');
    if (!context) return;

    for (const region of [...regions].reverse()) {
      if (context.isPointInPath(new Path2D(region.path), x, y)) {
        onSelect(region.id);
        return;
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="map-canvas"
      width={VIEW_WIDTH}
      height={VIEW_HEIGHT}
      onPointerUp={selectAtPoint}
      aria-label="Interactive campaign map. Use the accessible region index below to select a region."
      data-testid="canvas-campaign-map"
    />
  );
}