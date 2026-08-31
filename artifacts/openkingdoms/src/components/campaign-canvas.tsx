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

type LabelBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const MAP_UI_SAFE_ZONES: LabelBox[] = [
  { x: 0, y: 0, width: 110, height: 92 },
  { x: 608, y: 0, width: 152, height: 108 },
  { x: 0, y: 308, width: 240, height: 82 },
];

function rectanglesOverlap(first: LabelBox, second: LabelBox) {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

function wrapLabel(
  context: CanvasRenderingContext2D,
  name: string,
  maxWidth: number,
) {
  const words = name.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (current && context.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  });
  if (current) lines.push(current);
  return lines.length ? lines : [name];
}

function placeLabel(
  context: CanvasRenderingContext2D,
  region: CanvasRegion,
  occupied: LabelBox[],
  view: MapView,
) {
  const offsets: [number, number][] = [
    [0, 0],
    [0, 43],
    [0, -43],
    [-62, 0],
    [62, 0],
    [-48, 35],
    [48, 35],
    [-48, -35],
    [48, -35],
  ];

  for (let fontSize = 15; fontSize >= 10; fontSize -= 1) {
    context.font = `700 ${fontSize}px Georgia, serif`;
    const lines = wrapLabel(context, region.name, 118);
    const width = Math.min(
      128,
      Math.max(34, ...lines.map((line) => context.measureText(line).width + 12)),
    );
    const height = lines.length * 15 + 28;

    for (const [offsetX, offsetY] of offsets) {
      const x = Math.min(
        VIEW_WIDTH - width / 2 - 8,
        Math.max(width / 2 + 8, region.label[0] + offsetX),
      );
      const y = Math.min(
        VIEW_HEIGHT - height / 2 - 8,
        Math.max(height / 2 + 8, region.label[1] + offsetY),
      );
      const box = { x: x - width / 2, y: y - height / 2, width, height };
      const screenBox = {
        x: (box.x + view.x) * view.scale,
        y: (box.y + view.y) * view.scale,
        width: box.width * view.scale,
        height: box.height * view.scale,
      };

      if (
        !MAP_UI_SAFE_ZONES.some((safeZone) => rectanglesOverlap(screenBox, safeZone)) &&
        !occupied.some((other) => rectanglesOverlap(box, other))
      ) {
        return {
          x,
          y,
          width,
          height,
          lines,
          fontSize,
          offsetX,
          offsetY,
        };
      }
    }
  }

  context.font = '700 10px Georgia, serif';
  return {
    x: region.label[0],
    y: region.label[1],
    width: 90,
    height: 43,
    lines: wrapLabel(context, region.name, 78).slice(0, 2),
    fontSize: 10,
    offsetX: 0,
    offsetY: 0,
  };
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
    const horizontal = x > 0 ? 'left' : x < 0 ? 'right' : '';
    const vertical = y > 0 ? 'up' : y < 0 ? 'down' : '';
    const direction = [horizontal, vertical].filter(Boolean).join(' and ');
    if (direction) {
      setViewAnnouncement(`Map panned ${direction}. Use the arrow keys to continue moving.`);
    }
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

      const occupiedLabels: LabelBox[] = [];
      regions.forEach((region) => {
        const path = new Path2D(region.path);
        const isSelected = region.id === selectedId;
        const label = placeLabel(context, region, occupiedLabels, view);
        occupiedLabels.push({
          x: label.x - label.width / 2,
          y: label.y - label.height / 2,
          width: label.width,
          height: label.height,
        });
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
        if (label.offsetX !== 0 || label.offsetY !== 0) {
          context.strokeStyle = palette.mutedInk;
          context.globalAlpha = 0.58;
          context.lineWidth = 1;
          context.setLineDash([]);
          context.beginPath();
          context.moveTo(region.label[0], region.label[1]);
          context.lineTo(label.x, label.y);
          context.stroke();
        }
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = palette.ink;
        context.font = `700 ${label.fontSize}px Georgia, serif`;
        label.lines.forEach((line, index) => {
          const lineOffset = (index - (label.lines.length - 1) / 2) * 15;
          context.fillText(line, label.x, label.y + lineOffset);
        });
        context.fillStyle = palette.mutedInk;
        context.font = '500 8px "DM Mono", monospace';
        context.fillText(
          `${region.settlement.toUpperCase()} · ${region.forces}`,
          label.x,
          label.y + (label.lines.length - 1) * 7.5 + 25,
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

    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    try {
      for (const region of [...regions].reverse()) {
        if (context.isPointInPath(new Path2D(region.path), point.x, point.y)) {
          onSelect(region.id);
          return;
        }
      }
    } finally {
      context.restore();
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
        data-map-scale={view.scale}
        data-map-x={view.x}
        data-map-y={view.y}
      />
      <div className="map-compass-indicator" aria-hidden="true">
        <span className="map-compass-arrow">↑</span>
        <span>N</span>
      </div>
      <div className="map-scale-indicator" aria-hidden="true">
        <span className="map-scale-line" />
        <span>50 miles</span>
      </div>
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