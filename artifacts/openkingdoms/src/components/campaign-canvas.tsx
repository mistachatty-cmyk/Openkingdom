import {
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';

export type CanvasRegion = {
  id: string;
  chunkId?: string;
  adjacent: string[];
  terrain?: 'plains' | 'forest' | 'highland' | 'marsh' | 'coast';
  landmark?: string;
  name: string;
  kind: 'player' | 'rival' | 'neutral';
  settlement: 'Village' | 'Town' | 'City';
  forces: number;
  path: string;
  label: [number, number];
};

export type CanvasFront = {
  id: string;
  name: string;
  sourceRegionId: string;
  targetRegionId: string;
  source: [number, number];
  target: [number, number];
  committedForces: number;
  status: 'staged' | 'marching' | 'arrived' | 'resolved';
  travelTurns: number;
};

export type CanvasRoute = {
  id: string;
  source: [number, number];
  target: [number, number];
  partnerRegionId: string;
  status: 'active' | 'disrupted' | 'blocked' | 'shortage' | 'embargoed' | 'expired';
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
  id?: string;
  regions: CanvasRegion[];
  coastlinePath: string;
  fronts: CanvasFront[];
  routes: CanvasRoute[];
  selectedId: string | null;
  selectedFrontId: string | null;
  bannerColor: string;
  palette: CanvasPalette;
  onSelect: (id: string) => void;
  onSelectFront: (id: string) => void;
  onSelectRoute: (partnerRegionId: string) => void;
  onMiss?: () => void;
};

const VIEW_WIDTH = 760;
const VIEW_HEIGHT = 390;
const WORLD_WIDTH = 2600;
const WORLD_HEIGHT = 1600;
const MIN_ZOOM = 0.32;
const DEFAULT_ZOOM = 0.54;
const MAX_ZOOM = 2.8;
const ZOOM_STEP = 0.25;
const PAN_STEP = 48;

type MapView = {
  scale: number;
  x: number;
  y: number;
};

const STARTING_VIEW: MapView = {
  scale: DEFAULT_ZOOM,
  x: VIEW_WIDTH / (2 * DEFAULT_ZOOM) - 1300,
  y: VIEW_HEIGHT / (2 * DEFAULT_ZOOM) - 785,
};

function clampView(view: MapView): MapView {
  const scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.scale));
  const visibleWidth = VIEW_WIDTH / scale;
  const visibleHeight = VIEW_HEIGHT / scale;
  const minX = visibleWidth >= WORLD_WIDTH ? (visibleWidth - WORLD_WIDTH) / 2 : visibleWidth - WORLD_WIDTH;
  const maxX = visibleWidth >= WORLD_WIDTH ? (visibleWidth - WORLD_WIDTH) / 2 : 0;
  const minY = visibleHeight >= WORLD_HEIGHT ? (visibleHeight - WORLD_HEIGHT) / 2 : visibleHeight - WORLD_HEIGHT;
  const maxY = visibleHeight >= WORLD_HEIGHT ? (visibleHeight - WORLD_HEIGHT) / 2 : 0;

  return {
    scale,
    x: Math.min(maxX, Math.max(minX, view.x)),
    y: Math.min(maxY, Math.max(minY, view.y)),
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
  { x: 600, y: 308, width: 160, height: 82 },
];

function rectanglesOverlap(first: LabelBox, second: LabelBox) {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

function pointToSegmentDistance(
  point: { x: number; y: number },
  start: [number, number],
  end: [number, number],
) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) return Math.hypot(point.x - start[0], point.y - start[1]);
  const projection = Math.max(0, Math.min(1, ((point.x - start[0]) * dx + (point.y - start[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point.x - (start[0] + projection * dx), point.y - (start[1] + projection * dy));
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
        WORLD_WIDTH - width / 2 - 8,
        Math.max(width / 2 + 8, region.label[0] + offsetX),
      );
      const y = Math.min(
        WORLD_HEIGHT - height / 2 - 8,
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
  id,
  regions,
  coastlinePath,
  fronts,
  routes,
  selectedId,
  selectedFrontId,
  bannerColor,
  palette,
  onSelect,
  onSelectFront,
  onSelectRoute,
  onMiss,
}: CampaignCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startView: MapView;
    moved: boolean;
  } | null>(null);
  const pointersRef = useRef(new Map<number, { clientX: number; clientY: number }>());
  const pinchRef = useRef<{
    distance: number;
    anchorX: number;
    anchorY: number;
    startView: MapView;
  } | null>(null);
  const suppressTapRef = useRef(false);
  const [view, setView] = useState<MapView>(STARTING_VIEW);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);
  const [viewAnnouncement, setViewAnnouncement] = useState(
    'Realm board view at 54 percent zoom. Select a province, then drag to pan or use arrow keys to move.',
  );
  const [performanceStats, setPerformanceStats] = useState({
    visible: regions.length,
    drawMs: 0,
    frameMs: 0,
    interactionMs: 0,
    memory: 'unknown',
  });
  const pathCacheRef = useRef(new Map<string, Path2D>());
  const coastlineCacheRef = useRef<{ source: string; path: Path2D } | null>(null);
  const lastDrawAtRef = useRef<number | null>(null);
  const statsFrameRef = useRef(0);
  const selectedRegion = regions.find((region) => region.id === selectedId);
  const regionLookup = useMemo(
    () => new Map(regions.map((region) => [region.id, region])),
    [regions],
  );
  const spatialIndex = useMemo(() => {
    const index = new Map<string, CanvasRegion[]>();
    regions.forEach((region) => {
      const key = region.chunkId ?? 'chunk-0-0';
      const bucket = index.get(key) ?? [];
      bucket.push(region);
      index.set(key, bucket);
    });
    return index;
  }, [regions]);

  const getVisibleRegions = useMemo(() => (currentView: MapView) => {
    const left = -currentView.x;
    const top = -currentView.y;
    const right = left + VIEW_WIDTH / currentView.scale;
    const bottom = top + VIEW_HEIGHT / currentView.scale;
    const firstChunkX = Math.max(0, Math.floor(left / 500) - 1);
    const lastChunkX = Math.min(Math.floor(WORLD_WIDTH / 500), Math.floor(right / 500) + 1);
    const firstChunkY = Math.max(0, Math.floor(top / 350) - 1);
    const lastChunkY = Math.min(Math.floor(WORLD_HEIGHT / 350), Math.floor(bottom / 350) + 1);
    const visible = new Map<string, CanvasRegion>();

    for (let chunkX = firstChunkX; chunkX <= lastChunkX; chunkX += 1) {
      for (let chunkY = firstChunkY; chunkY <= lastChunkY; chunkY += 1) {
        (spatialIndex.get(`chunk-${chunkX}-${chunkY}`) ?? []).forEach((region) => {
          if (
            region.label[0] >= left - 240 &&
            region.label[0] <= right + 240 &&
            region.label[1] >= top - 180 &&
            region.label[1] <= bottom + 180
          ) {
            visible.set(region.id, region);
          }
        });
      }
    }
    return [...visible.values()];
  }, [regions, spatialIndex]);

  const screenPointFromClient = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return null;
    return {
      x: ((clientX - bounds.left) / bounds.width) * VIEW_WIDTH,
      y: ((clientY - bounds.top) / bounds.height) * VIEW_HEIGHT,
    };
  };

  const mapPointFromClient = (clientX: number, clientY: number, currentView = view) => {
    const screen = screenPointFromClient(clientX, clientY);
    if (!screen) return null;
    return {
      x: screen.x / currentView.scale - currentView.x,
      y: screen.y / currentView.scale - currentView.y,
    };
  };

  const mapPointFromEvent = (event: PointerEvent<HTMLCanvasElement>) =>
    mapPointFromClient(event.clientX, event.clientY);

  const hitTest = (point: { x: number; y: number }, currentView: MapView) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!context) return null;
    const visibleRegions = getVisibleRegions(currentView);
    const selectedNeighbors = new Set(
      selectedId
        ? [selectedId, ...(regionLookup.get(selectedId)?.adjacent ?? [])]
        : [],
    );
    const visibleBounds = {
      left: -currentView.x - 240,
      right: -currentView.x + VIEW_WIDTH / currentView.scale + 240,
      top: -currentView.y - 180,
      bottom: -currentView.y + VIEW_HEIGHT / currentView.scale + 180,
    };
    const isPointVisible = (candidate: [number, number]) => (
      candidate[0] >= visibleBounds.left &&
      candidate[0] <= visibleBounds.right &&
      candidate[1] >= visibleBounds.top &&
      candidate[1] <= visibleBounds.bottom
    );

    for (const front of [...fronts].reverse()) {
      if (
        !selectedId ||
        (front.id !== selectedFrontId &&
          front.sourceRegionId !== selectedId &&
          front.targetRegionId !== selectedId)
      ) continue;
      const markerX = (front.source[0] + front.target[0]) / 2;
      const markerY = (front.source[1] + front.target[1]) / 2;
      if (isPointVisible([markerX, markerY]) && Math.hypot(point.x - markerX, point.y - markerY) <= 28) {
        return { kind: 'front' as const, id: front.id };
      }
    }

    for (const route of [...routes].reverse()) {
      if (!selectedId || !selectedNeighbors.has(route.partnerRegionId)) continue;
      if (
        (isPointVisible(route.source) || isPointVisible(route.target)) &&
        pointToSegmentDistance(point, route.source, route.target) <= 16
      ) {
        return { kind: 'route' as const, id: route.partnerRegionId };
      }
    }

    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    try {
      for (const region of [...visibleRegions].reverse()) {
        const path = pathCacheRef.current.get(region.id) ?? new Path2D(region.path);
        pathCacheRef.current.set(region.id, path);
        if (context.isPointInPath(path, point.x, point.y)) {
          return { kind: 'region' as const, id: region.id };
        }
      }
    } finally {
      context.restore();
    }
    return null;
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
      return next;
    });
    setViewAnnouncement(
      announcement ?? `Map zoom set to ${Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextScale)) * 100)} percent.`,
    );
  };

  const resetView = () => {
    setView(STARTING_VIEW);
    setViewAnnouncement('Realm board reset to its starting position at 54 percent zoom.');
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

  useEffect(() => () => {
    pointersRef.current.clear();
    dragRef.current = null;
    pinchRef.current = null;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const drawStartedAt = performance.now();
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

      const visibleRegions = getVisibleRegions(view);
      const isCompact = bounds.width < 600;
       const detailTier = isCompact
         ? view.scale < 0.46 ? 'overview' : view.scale < 1.2 ? 'regional' : 'close'
         : view.scale < 0.42 ? 'overview' : view.scale < 1.05 ? 'regional' : 'close';
      const visibleBounds = {
        left: -view.x - 240,
        right: -view.x + VIEW_WIDTH / view.scale + 240,
        top: -view.y - 180,
        bottom: -view.y + VIEW_HEIGHT / view.scale + 180,
      };
      const isPointVisible = (point: [number, number]) => (
        point[0] >= visibleBounds.left &&
        point[0] <= visibleBounds.right &&
        point[1] >= visibleBounds.top &&
        point[1] <= visibleBounds.bottom
      );

      context.save();
      context.scale(view.scale, view.scale);
      context.translate(view.x, view.y);

       const coastline = coastlineCacheRef.current?.source === coastlinePath
         ? coastlineCacheRef.current.path
         : new Path2D(coastlinePath);
       coastlineCacheRef.current = { source: coastlinePath, path: coastline };
      context.fillStyle = palette.land;
      context.strokeStyle = palette.road;
      context.lineWidth = detailTier === 'overview' ? 8 : 5;
      context.globalAlpha = 0.92;
      context.fill(coastline);
      context.globalAlpha = 0.72;
      context.stroke(coastline);
      context.globalAlpha = 1;

       // Ordinary roads stay quiet until a province is being inspected. Routes
       // and fronts remain separate, higher-priority overlays.
       const selectedNeighbors = new Set(
         selectedId
           ? [selectedId, ...(regionLookup.get(selectedId)?.adjacent ?? [])]
           : [],
       );
      context.strokeStyle = palette.road;
       context.lineWidth = detailTier === 'close' ? 2 : 1.25;
       context.setLineDash([]);
       context.globalAlpha = detailTier === 'overview' ? 0 : 0.34;
       if (detailTier !== 'overview') {
         visibleRegions.forEach((region) => {
           region.adjacent.forEach((adjacentId) => {
             if (region.id > adjacentId || !selectedNeighbors.has(region.id) && !selectedNeighbors.has(adjacentId)) return;
             const adjacent = regionLookup.get(adjacentId);
             if (!adjacent || !isPointVisible(adjacent.label)) return;
             context.beginPath();
             context.moveTo(region.label[0], region.label[1]);
             context.lineTo(adjacent.label[0], adjacent.label[1]);
             context.stroke();
           });
         });
       }
      context.globalAlpha = 1;

      const routeColors: Record<CanvasRoute['status'], string> = {
        active: palette.selection,
        disrupted: palette.rival,
        blocked: palette.mutedInk,
        shortage: palette.neutral,
        embargoed: palette.rival,
        expired: palette.mutedInk,
      };
      routes.forEach((route) => {
         if (!selectedId || !selectedNeighbors.has(route.partnerRegionId)) return;
        if (!isPointVisible(route.source) && !isPointVisible(route.target)) return;
        context.save();
        context.strokeStyle = routeColors[route.status];
        context.lineWidth = detailTier === 'overview' ? 3 : 1.5;
        context.setLineDash(route.status === 'active' ? [2, 5] : [7, 5]);
        context.globalAlpha = route.status === 'active' ? 0.8 : 0.58;
        context.beginPath();
        context.moveTo(route.source[0], route.source[1]);
         const routeMidX = (route.source[0] + route.target[0]) / 2;
         const routeMidY = (route.source[1] + route.target[1]) / 2 - Math.min(110, Math.hypot(route.target[0] - route.source[0], route.target[1] - route.source[1]) * 0.12);
         context.quadraticCurveTo(routeMidX, routeMidY, route.target[0], route.target[1]);
        context.stroke();
        context.restore();
      });

      const occupiedLabels: LabelBox[] = [];
      visibleRegions.forEach((region) => {
        let path = pathCacheRef.current.get(region.id);
        if (!path) {
          path = new Path2D(region.path);
          pathCacheRef.current.set(region.id, path);
        }
        const isSelected = region.id === selectedId;
        const isHovered = region.id === hoveredRegionId;
         const selectedRegion = selectedId ? regionLookup.get(selectedId) : undefined;
         const isAdjacent = Boolean(selectedRegion?.adjacent.includes(region.id));
        context.save();
        context.fillStyle =
          region.kind === 'player'
            ? palette.player
            : region.kind === 'rival'
              ? palette.rival
              : palette.neutral;
          context.strokeStyle = isSelected || isHovered ? palette.selection : isAdjacent ? palette.selection : palette.ink;
          context.lineWidth = isSelected ? 3 : isHovered ? 2.5 : isAdjacent ? 2 : detailTier === 'overview' ? 1 : 1.5;
         if (isAdjacent && !isSelected) {
           context.setLineDash([5, 4]);
         }
         context.setLineDash([]);
        if (isSelected || isHovered) {
          context.shadowColor = palette.selection;
          context.shadowBlur = isSelected ? 10 : 6;
        }
        context.fill(path);
        context.stroke(path);
        context.restore();

        if (detailTier === 'overview') {
          context.save();
          context.fillStyle = region.kind === 'rival' ? palette.rival : region.kind === 'player' ? bannerColor : palette.mutedInk;
          context.beginPath();
          context.arc(region.label[0], region.label[1], region.kind === 'player' ? 6 : 3, 0, Math.PI * 2);
          context.fill();
          context.restore();
          return;
        }

        const label = placeLabel(context, region, occupiedLabels, view);
        occupiedLabels.push({
          x: label.x - label.width / 2,
          y: label.y - label.height / 2,
          width: label.width,
          height: label.height,
        });
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
        if (detailTier === 'close') {
          context.fillStyle = palette.mutedInk;
          context.font = '500 8px "DM Mono", monospace';
          context.fillText(
            `${region.settlement.toUpperCase()} · ${region.forces}`,
            label.x,
            label.y + (label.lines.length - 1) * 7.5 + 25,
          );
          context.save();
          context.strokeStyle = palette.mutedInk;
          context.fillStyle = palette.mutedInk;
          context.globalAlpha = 0.66;
          context.lineWidth = 1.2;
          const terrainX = region.label[0] + 22;
          const terrainY = region.label[1] - 20;
          if (region.terrain === 'forest') {
            for (let tree = -1; tree <= 1; tree += 1) {
              context.beginPath();
              context.moveTo(terrainX + tree * 6, terrainY + 5);
              context.lineTo(terrainX + tree * 6 - 4, terrainY - 3);
              context.lineTo(terrainX + tree * 6 + 4, terrainY - 3);
              context.closePath();
              context.stroke();
            }
          } else if (region.terrain === 'highland') {
            context.beginPath();
            context.moveTo(terrainX - 7, terrainY + 5);
            context.lineTo(terrainX, terrainY - 5);
            context.lineTo(terrainX + 7, terrainY + 5);
            context.stroke();
          } else if (region.terrain === 'coast') {
            context.beginPath();
            context.arc(terrainX, terrainY, 6, 0, Math.PI);
            context.stroke();
            context.beginPath();
            context.arc(terrainX, terrainY + 4, 6, Math.PI, Math.PI * 2);
            context.stroke();
          } else if (region.terrain === 'marsh') {
            context.beginPath();
            context.moveTo(terrainX - 7, terrainY - 2);
            context.quadraticCurveTo(terrainX - 2, terrainY + 4, terrainX + 3, terrainY - 2);
            context.quadraticCurveTo(terrainX + 6, terrainY - 5, terrainX + 8, terrainY);
            context.stroke();
          } else {
            context.beginPath();
            context.arc(terrainX, terrainY, 4, 0, Math.PI * 2);
            context.stroke();
          }
          if (region.landmark) {
            context.strokeRect(terrainX + 10, terrainY - 4, 8, 8);
          }
          context.restore();
        }

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

       fronts.forEach((front) => {
         if (
           !selectedId ||
           (front.id !== selectedFrontId &&
             front.sourceRegionId !== selectedId &&
             front.targetRegionId !== selectedId)
         ) return;
        const marker: [number, number] = [
          (front.source[0] + front.target[0]) / 2,
          (front.source[1] + front.target[1]) / 2,
        ];
        if (!isPointVisible(marker)) return;
        const isSelected = front.id === selectedFrontId;
        context.save();
        const frontColor = front.status === 'arrived' ? palette.selection : front.status === 'marching' ? palette.neutral : palette.road;
        context.strokeStyle = isSelected ? palette.selection : frontColor;
        context.fillStyle = isSelected ? palette.selection : palette.road;
        context.lineWidth = isSelected ? 3 : 2;
        context.setLineDash(front.status === 'arrived' ? [] : [4, 4]);
        context.beginPath();
        context.moveTo(front.source[0], front.source[1]);
        context.lineTo(front.target[0], front.target[1]);
        context.stroke();
        context.setLineDash([]);
        context.beginPath();
        context.arc(marker[0], marker[1], isSelected ? 9 : 7, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = palette.water;
        context.font = '700 8px "DM Mono", monospace';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(
          front.status === 'arrived' ? String(front.committedForces) : `${front.committedForces} · ${front.travelTurns}t`,
          marker[0],
          marker[1],
        );
        if (detailTier !== 'overview') {
          context.fillStyle = palette.ink;
          context.font = '700 10px Georgia, serif';
          context.fillText(front.name.slice(0, 22), marker[0], marker[1] - 17);
          context.fillStyle = front.status === 'arrived' ? palette.selection : palette.mutedInk;
          context.font = '700 8px "DM Mono", monospace';
          context.fillText(front.status.toUpperCase(), marker[0], marker[1] + 17);
        }
        context.restore();
      });
      context.restore();

      const drawMs = performance.now() - drawStartedAt;
      const frameMs = lastDrawAtRef.current === null ? 0 : drawStartedAt - lastDrawAtRef.current;
      lastDrawAtRef.current = drawStartedAt;
      statsFrameRef.current += 1;
      if (statsFrameRef.current === 1 || statsFrameRef.current % 6 === 0) {
        const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
        const heap = (performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
        const memory = heap && heap.jsHeapSizeLimit > 0
          ? `${Math.round((heap.usedJSHeapSize / heap.jsHeapSizeLimit) * 100)}% heap`
          : deviceMemory && deviceMemory <= 2 ? 'tight device' : 'normal';
        setPerformanceStats((current) => ({
          ...current,
          visible: visibleRegions.length,
          drawMs: Math.round(drawMs * 10) / 10,
          frameMs: Math.round(frameMs * 10) / 10,
          memory,
        }));
      }
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [bannerColor, coastlinePath, fronts, getVisibleRegions, hoveredRegionId, palette, regionLookup, regions, routes, selectedFrontId, selectedId, spatialIndex, view]);

  const selectAtPoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const interactionStartedAt = performance.now();
    const point = mapPointFromEvent(event);
    if (!point) return;
    const hit = hitTest(point, view);
    if (hit?.kind === 'front') onSelectFront(hit.id);
    else if (hit?.kind === 'route') onSelectRoute(hit.id);
    else if (hit?.kind === 'region') onSelect(hit.id);
    else {
      onMiss?.();
      setViewAnnouncement('Nothing is marked at that point. Select a province, front, or highlighted route.');
    }
    setPerformanceStats((current) => ({
      ...current,
      interactionMs: Math.round((performance.now() - interactionStartedAt) * 10) / 10,
    }));
  };

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointersRef.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    if (pointersRef.current.size >= 2) {
      const [first, second] = [...pointersRef.current.values()];
      const midpoint = {
        clientX: (first.clientX + second.clientX) / 2,
        clientY: (first.clientY + second.clientY) / 2,
      };
      const anchor = mapPointFromClient(midpoint.clientX, midpoint.clientY, view);
      if (anchor) {
        pinchRef.current = {
          distance: Math.max(1, Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY)),
          anchorX: anchor.x,
          anchorY: anchor.y,
          startView: view,
        };
        suppressTapRef.current = true;
        dragRef.current = null;
        setIsDragging(true);
      }
      return;
    }
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
    if (pointersRef.current.has(event.pointerId)) {
      pointersRef.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    }
    if (pinchRef.current && pointersRef.current.size >= 2) {
      const [first, second] = [...pointersRef.current.values()];
      const midpoint = {
        clientX: (first.clientX + second.clientX) / 2,
        clientY: (first.clientY + second.clientY) / 2,
      };
      const screen = screenPointFromClient(midpoint.clientX, midpoint.clientY);
      if (!screen) return;
      const pinch = pinchRef.current;
      const distance = Math.max(1, Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY));
      const nextScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinch.startView.scale * (distance / pinch.distance)));
      setView(clampView({
        scale: nextScale,
        x: screen.x / nextScale - pinch.anchorX,
        y: screen.y / nextScale - pinch.anchorY,
      }));
      return;
    }
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      if (event.pointerType === 'mouse' && !isDragging) {
        const point = mapPointFromEvent(event);
        const hit = point ? hitTest(point, view) : null;
        setHoveredRegionId(hit?.kind === 'region' ? hit.id : null);
      }
      return;
    }
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
    pointersRef.current.delete(event.pointerId);
    if (pinchRef.current) {
      pinchRef.current = null;
      dragRef.current = null;
      setIsDragging(false);
      suppressTapRef.current = true;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      return;
    }
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      return;
    }
    dragRef.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!drag.moved && !suppressTapRef.current) selectAtPoint(event);
    suppressTapRef.current = false;
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
      case '[':
      case ']': {
        event.preventDefault();
        const visibleRegions = getVisibleRegions(view);
        if (!visibleRegions.length) break;
        const currentIndex = Math.max(0, visibleRegions.findIndex((region) => region.id === selectedId));
        const direction = event.key === ']' ? 1 : -1;
        const nextRegion = visibleRegions[(currentIndex + direction + visibleRegions.length) % visibleRegions.length];
        onSelect(nextRegion.id);
        setViewAnnouncement(`Selected ${nextRegion.name}. Use ] for the next province or [ for the previous.`);
        break;
      }
    }
  };

  return (
    <div className="campaign-canvas-stage">
       <canvas
        ref={canvasRef}
         id={id}
        className={`map-canvas ${isDragging ? 'is-dragging' : ''}`}
        width={VIEW_WIDTH}
        height={VIEW_HEIGHT}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
         onPointerLeave={() => setHoveredRegionId(null)}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        tabIndex={0}
          aria-label="Interactive illustrated campaign map. Use the province index or [ and ] to select provinces; use arrow keys to pan."
        aria-describedby="map-navigation-help"
         aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown + - 0 [ ]"
        data-testid="canvas-campaign-map"
        data-map-scale={view.scale}
        data-map-x={view.x}
        data-map-y={view.y}
         data-hovered-region={hoveredRegionId ?? ''}
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
             disabled={view.scale >= MAX_ZOOM}
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
             disabled={view.scale <= MIN_ZOOM}
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
         Select a province in the index or press [ / ] · drag to pan · scroll or +/- to zoom
      </p>
      <div className="map-performance" aria-label="Map performance">
         <span>Realm board · {regions.length} provinces</span>
        <span>{performanceStats.visible} visible</span>
        <span>{performanceStats.drawMs} ms draw</span>
        <span>{performanceStats.frameMs ? `${performanceStats.frameMs} ms frame` : 'frame time —'}</span>
        <span>{performanceStats.interactionMs ? `${performanceStats.interactionMs} ms select` : 'select latency —'}</span>
        <span>{performanceStats.memory}</span>
      </div>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true" data-testid="status-map-view">
        {viewAnnouncement}
      </div>
    </div>
  );
}