import { useEffect, useRef, useState } from 'react';
import {
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  RingGeometry,
  Scene,
  SphereGeometry,
  TorusGeometry,
  WebGLRenderer,
} from 'three';
import {
  EMBLEMS,
  type EmblemId,
  type NationArchetype,
} from '@/nation-archetypes';

type FoundingPreviewProps = {
  archetype: NationArchetype;
  banner: { name: string; color: string; secondary: string };
  emblemId: EmblemId;
  reducedMotion: boolean;
};

function makeMaterial(color: string, roughness = 0.72) {
  return new MeshStandardMaterial({ color: new Color(color), roughness, metalness: 0.08 });
}

function makeFlagTexture(banner: FoundingPreviewProps['banner'], emblemId: EmblemId) {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 210;
  const context = canvas.getContext('2d');
  if (!context) return undefined;
  context.fillStyle = banner.color;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = banner.secondary;
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(canvas.width * 0.58, 0);
  context.lineTo(0, canvas.height * 0.58);
  context.closePath();
  context.fill();
  context.strokeStyle = 'rgba(255, 245, 210, .55)';
  context.lineWidth = 5;
  context.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
  const emblem = EMBLEMS.find((candidate) => candidate.id === emblemId) ?? EMBLEMS[0];
  context.fillStyle = '#f8e8bf';
  context.font = 'bold 96px Georgia';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(emblem.glyph, canvas.width / 2, canvas.height / 2 + 3);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = 'srgb';
  return texture;
}

function addArchetypeGeometry(group: Group, archetype: NationArchetype) {
  const primary = makeMaterial(archetype.accent);
  const secondary = makeMaterial(archetype.secondary);
  if (archetype.geometry === 'river') {
    const keep = new Mesh(new CylinderGeometry(1.2, 1.45, 1.15, 12), primary);
    keep.position.y = 0.62;
    group.add(keep);
    const water = new Mesh(new TorusGeometry(1.06, 0.16, 8, 32), secondary);
    water.rotation.x = Math.PI / 2;
    water.position.y = 1.22;
    group.add(water);
  } else if (archetype.geometry === 'fortress') {
    const keep = new Mesh(new BoxGeometry(1.65, 1.8, 1.65), primary);
    keep.position.y = 0.9;
    group.add(keep);
    [-0.86, 0.86].forEach((x) => {
      const tower = new Mesh(new CylinderGeometry(0.28, 0.34, 2.3, 8), secondary);
      tower.position.set(x, 1.15, 0.62);
      group.add(tower);
    });
  } else if (archetype.geometry === 'market') {
    [-0.62, 0.62].forEach((x, index) => {
      const stack = new Mesh(new BoxGeometry(0.82, 1.1 + index * 0.25, 0.82), index ? primary : secondary);
      stack.position.set(x, 0.55 + index * 0.12, 0);
      group.add(stack);
    });
    const canopy = new Mesh(new ConeGeometry(1.25, 0.7, 4), primary);
    canopy.position.y = 1.55;
    canopy.rotation.y = Math.PI / 4;
    group.add(canopy);
  } else if (archetype.geometry === 'lantern') {
    const body = new Mesh(new SphereGeometry(0.86, 16, 12), primary);
    body.position.y = 1.05;
    group.add(body);
    const ring = new Mesh(new TorusGeometry(0.98, 0.12, 8, 24), secondary);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.05;
    group.add(ring);
  } else {
    const base = new Mesh(new DodecahedronGeometry(1.12, 0), primary);
    base.position.y = 0.9;
    base.scale.y = 0.72;
    group.add(base);
    const crown = new Mesh(new ConeGeometry(0.68, 0.9, 5), secondary);
    crown.position.y = 1.85;
    group.add(crown);
  }
}

function disposeScene(scene: Scene) {
  scene.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    if (Array.isArray(object.material)) {
      object.material.forEach((material) => material.dispose());
    } else {
      object.material.dispose();
    }
  });
}

export function FoundingPreview({
  archetype,
  banner,
  emblemId,
  reducedMotion,
}: FoundingPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let context: WebGLRenderingContext | null = null;
    try {
      context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    } catch {
      context = null;
    }
    if (!context) {
      setFallback(true);
      return;
    }
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ canvas, context, alpha: true, antialias: true });
    } catch {
      setFallback(true);
      return;
    }
    setFallback(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new Scene();
    const camera = new PerspectiveCamera(25, 1, 0.1, 100);
    camera.position.set(4.5, 3.25, 6.8);
    camera.lookAt(0, 1.05, 0);
    scene.add(new AmbientLight(0xffedc7, 1.7));
    const keyLight = new DirectionalLight(new Color(archetype.accent), 3.3);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);
    const fillLight = new PointLight(new Color(archetype.secondary), 5, 10);
    fillLight.position.set(-3, 2, 2);
    scene.add(fillLight);

    const artifact = new Group();
    const plinth = new Mesh(new CylinderGeometry(1.85, 2.08, 0.28, 32), makeMaterial('#30445b', 0.55));
    plinth.position.y = 0.14;
    artifact.add(plinth);
    const ring = new Mesh(new RingGeometry(1.25, 1.48, 32), makeMaterial(archetype.secondary, 0.5));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.3;
    artifact.add(ring);
    addArchetypeGeometry(artifact, archetype);

    const pole = new Mesh(new CylinderGeometry(0.045, 0.06, 3.3, 8), makeMaterial('#dec27a', 0.38));
    pole.position.set(1.25, 1.8, 0);
    artifact.add(pole);
    const flagTexture = makeFlagTexture(banner, emblemId);
    if (flagTexture) {
      const flag = new Mesh(new PlaneGeometry(1.55, 1.02), new MeshStandardMaterial({
        map: flagTexture,
        side: 2,
        roughness: 0.72,
        transparent: true,
      }));
      flag.position.set(0.52, 2.8, 0);
      flag.rotation.y = -0.08;
      artifact.add(flag);
    }
    scene.add(artifact);

    const resize = () => {
      const width = canvas.clientWidth || 280;
      const height = canvas.clientHeight || 220;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    let frame = 0;
    const animate = () => {
      if (!reducedMotion) {
        artifact.rotation.y += 0.004;
        artifact.position.y = Math.sin(frame * 0.018) * 0.035;
      }
      renderer.render(scene, camera);
      frame += 1;
      if (!reducedMotion) frame = requestAnimationFrame(animate);
    };
    if (reducedMotion) {
      renderer.render(scene, camera);
    } else {
      frame = requestAnimationFrame(animate);
    }
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      disposeScene(scene);
      renderer.dispose();
    };
  }, [archetype, banner, emblemId, reducedMotion]);

  return (
    <div
      className={`founding-preview ${fallback ? 'is-fallback' : ''}`}
      aria-label={`${archetype.name} founding preview with the ${banner.name} banner and ${EMBLEMS.find((candidate) => candidate.id === emblemId)?.name ?? 'crown'} emblem`}
      data-testid="founding-preview"
    >
      <div className="founding-preview-label">
        <span className="panel-kicker">Founding preview</span>
        <strong>{archetype.shortName}</strong>
      </div>
      {fallback ? (
        <div className="founding-preview-fallback" data-testid="founding-preview-fallback">
          <span style={{ background: `linear-gradient(135deg, ${banner.color} 55%, ${banner.secondary} 56%)` }}>
            {EMBLEMS.find((candidate) => candidate.id === emblemId)?.glyph}
          </span>
          <p>3D preview unavailable. The founding choices remain fully usable.</p>
        </div>
      ) : (
        <canvas ref={canvasRef} aria-hidden="true" data-testid="founding-preview-canvas" />
      )}
    </div>
  );
}