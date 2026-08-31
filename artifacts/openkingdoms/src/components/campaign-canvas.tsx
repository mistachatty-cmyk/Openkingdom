import {
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';

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
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;
const PAN_STEP = 48;

type MapView = {
  scale: number;
  x: number;
  y: number;
};

const STARTING_VIEW: MapView = { scale: MIN_ZOOM, x: 0, y: 0 };

function clampView(view: MapView): MapView {
  const scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.scale));
  const minX = VIEW_WIDTH / scale - VIEW_WIDTH;
  const minY = VIEW_HEIGHT / scale - VIEW_HEIGHT;

  return {
    scale,
    x: Math.min(0, Math.max(minX, view.x)),
    y: Math.min(0, Math.max(minY, view.y)),
  };
}

function keepPointVisible(view: MapView, point: [number, number]): MapView {
  const margin = 34;
  const visibleWidth = VIEW_WIDTH / view.scale;
  const visibleHeight = VIEW_HEIGHT / view.scale;
  const left = -view.x;
  const top = -view.y;
  let x = view.x;
  let y = view.y;

  if (point[0] < left + margin) {
    x = -(point[0] - margin);
  } else if (point[0] > left + visibleWidth - margin) {
    x = -(point[0] - visibleWidth + margin);
  }

  if (point[1] < top + margin) {
    y = -(point[1] - margin);
  } else if (point[1] > top + visibleHeight - margin) {
    y = -(point[1] - visibleHeight + margin);
  }

  return clampView({ ...view, x, y });
}

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
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startView: MapView;
    moved: boolean;
  } | null>(null);
  const [view, setView] = useState<MapView>(STARTING_VIEW);
  const [isDragging, setIsDragging] = useState(false);
  const [viewAnnouncement, setViewAnnouncement] = useState(
    'Map view at 100 percent zoom. Drag to pan; use arrow keys to move.',
  );
  const selectedRegion = regions.find((region) => region.id === selectedId);

  const mapPointFromEvent = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const bounds = canvas.getBoundingClientRect();
    const screenX = ((event.clientX - bounds.left) / bounds.width) * VIEW_WIDTH;
    const screenY = ((event.clientY - bounds.top) / bounds.height) * VIEW_HEIGHT;
    return {
      x: screenX / view.scale - view.x,
      y: screenY / view.scale - view.y,
    };
  };

  const zoomAt = (
    nextScale: number,
    anchorX = VIEW_WIDTH / 2,
    anchorY = VIEW_HEIGHT / 2,
    announcement?: string,
  ) => {
    setView((current) => {
      const scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextScale));
      const focusX = anchorX / current.scale - current.x;
      const focusY = anchorY / current.scale - current.y;
      const next = clampView({
        scale,
        x: anchorX / scale - focusX,
        y: anchorY / scale - focusY,
      });
      return selectedRegion ? keepPointVisible(next, selectedRegion.label) : next;
    });
    setViewAnnouncement(
      announcement ?? `Map zoom set to ${Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextScale)) * 100)} percent.`,
    );
  };

  const resetView = () => {
    setView(STARTING_VIEW);
    setViewAnnouncement('Map view reset to its starting position at 100 percent zoom.');
  };

  const panBy = (x: number, y: number) => {
    setView((current) =>
      clampView({
        ...current,
        x: current.x + x / current.scale,
        y: current.y + y / current.scale,
      }),
    );
  };

  useEffect(() => {
    if (!selectedRegion) return;
    setView((current) => keepPointVisible(current, selectedRegion.label));
  }, [selectedId, selectedRegion]);

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
      context.scale(view.scale, view.scale);
      context.translate(view.x, view.y);
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
       context.restore();
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [bannerColor, palette, regions, selectedId, view]);

  const selectAtPoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const point = mapPointFromEvent(event);
    if (!point) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    for (const region of [...regions].reverse()) {
      if (context.isPointInPath(new Path2D(region.path), point.x, point.y)) {
        onSelect(region.id);
        return;
      }
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(false);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startView: view,
      moved: false,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (distance > 4) {
      drag.moved = true;
      setIsDragging(true);
    }
    if (!drag.moved) return;

    const logicalPerPixel = VIEW_WIDTH / bounds.width / drag.startView.scale;
    setView(
      clampView({
        ...drag.startView,
        x: drag.startView.x + (event.clientX - drag.startX) * logicalPerPixel,
        y: drag.startView.y + (event.clientY - drag.startY) * (VIEW_HEIGHT / bounds.height / drag.startView.scale),
      }),
    );
  };

  const finishPointer = (event: PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!drag.moved) selectAtPoint(event);
  };

  const handleWheel = (event: WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const anchorX = ((event.clientX - bounds.left) / bounds.width) * VIEW_WIDTH;
    const anchorY = ((event.clientY - bounds.top) / bounds.height) * VIEW_HEIGHT;
    const direction = event.deltaY < 0 ? 1 : -1;
    zoomAt(view.scale + direction * ZOOM_STEP, anchorX, anchorY);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        panBy(PAN_STEP, 0);
        break;
      case 'ArrowRight':
        event.preventDefault();
        panBy(-PAN_STEP, 0);
        break;
      case 'ArrowUp':
        event.preventDefault();
        panBy(0, PAN_STEP);
        break;
      case 'ArrowDown':
        event.preventDefault();
        panBy(0, -PAN_STEP);
        break;
      case '+':
      case '=':
        event.preventDefault();
        zoomAt(view.scale + ZOOM_STEP);
        break;
      case '-':
      case '_':
        event.preventDefault();
        zoomAt(view.scale - ZOOM_STEP);
        break;
      case '0':
      case 'Home':
        event.preventDefault();
        resetView();
        break;
    }
  };

  return (
    <div className="campaign-canvas-stage">
      <canvas
        ref={canvasRef}
        className={`map-canvas ${isDragging ? 'is-dragging' : ''}`}
        width={VIEW_WIDTH}
        height={VIEW_HEIGHT}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        aria-label="Interactive campaign map. Use the accessible region index below to select a region."
        aria-describedby="map-navigation-help"
        aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown + - 0"
        data-testid="canvas-campaign-map"
      />
      <div className="map-navigation" aria-label="Map navigation controls">
        <div className="map-zoom-controls">
          <button
            type="button"
            className="map-control-button"
            onClick={() => zoomAt(view.scale + ZOOM_STEP)}
            aria-label="Zoom in"
            title="Zoom in"
            data-testid="button-map-zoom-in"
          >
            <Plus size={15} />
          </button>
          <span className="map-zoom-level" aria-hidden="true">{Math.round(view.scale * 100)}%</span>
          <button
            type="button"
            className="map-control-button"
            onClick={() => zoomAt(view.scale - ZOOM_STEP)}
            aria-label="Zoom out"
            title="Zoom out"
            data-testid="button-map-zoom-out"
          >
            <Minus size={15} />
          </button>
        </div>
        <button
          type="button"
          className="map-control-button map-reset-button"
          onClick={resetView}
          aria-label="Reset map view"
          title="Reset map view"
          data-testid="button-map-reset-view"
        >
          <RotateCcw size={14} />
          <span>Reset view</span>
        </button>
      </div>
      <p className="map-navigation-help" id="map-navigation-help">
        Drag to pan · scroll or +/- to zoom · arrows to move
      </p>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true" data-testid="status-map-view">
        {viewAnnouncement}
      </div>
    </div>
  );
}