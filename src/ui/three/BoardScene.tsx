import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import * as stylex from '@stylexjs/stylex';
import { Canvas, useThree } from '@react-three/fiber';
import { Grid, Html, Instance, Instances, MapControls } from '@react-three/drei';
import type { Plan, PlacedBoard } from '../../solver';
import type { BoardModel } from '../../models';
import { getBoardGeometry } from '../../boards3d/geometry';
import { instancesFor, type InstanceGroup } from '../../boards3d/placement';
import { useTokenColor } from './useTokenColor';
import { colors, font, radius, space } from '../tokens.stylex';
import { mixes } from '../mixes.stylex';

const styles = stylex.create({
  frame: {
    position: 'relative',
    width: '100%',
    height: '100%',
    minHeight: '320px',
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: mixes.border,
    borderRadius: radius.md,
  },
  orbit: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    zIndex: 1,
    fontSize: font.xs,
    fontWeight: 500,
    color: colors.text,
    backgroundColor: mixes.inputBg,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: {
      default: mixes.border,
      ':hover': mixes.borderHover,
    },
    borderRadius: radius.sm,
    paddingBlock: space.xs,
    paddingInline: space.sm,
    cursor: 'pointer',
  },
  orbitActive: {
    color: colors.accent,
    borderColor: colors.accent,
  },
  chip: {
    fontSize: font.xs,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: mixes.border,
    borderRadius: radius.sm,
    paddingBlock: '2px',
    paddingInline: space.sm,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
  },
});

const CAMERA_DISTANCE = 1000;
const FIT_MARGIN = 1.1;

interface Hover {
  key: string;
  index: number;
}

/** Keeps the orthographic camera framing the wall when the plan or viewport changes. */
function FitCamera({ widthMm, heightMm }: { widthMm: number; heightMm: number }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useEffect(() => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;
    camera.zoom = Math.min(size.width / (widthMm * FIT_MARGIN), size.height / (heightMm * FIT_MARGIN));
    camera.position.set(widthMm / 2, -heightMm / 2, CAMERA_DISTANCE);
    camera.lookAt(widthMm / 2, -heightMm / 2, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, widthMm, heightMm]);
  return null;
}

function BoardInstances({
  group,
  model,
  hovered,
  onHover,
  fill,
  hoverFill,
}: {
  group: InstanceGroup;
  model: BoardModel;
  hovered: Hover | null;
  onHover: (h: Hover | null) => void;
  fill: string;
  hoverFill: string;
}) {
  const geometry = useMemo(
    () => getBoardGeometry(group.cols, group.rows, group.mirrorX, group.mirrorY, model),
    [group.cols, group.rows, group.mirrorX, group.mirrorY, model],
  );
  const count = group.positions.length;
  return (
    <Instances key={`${group.key}-${count}`} geometry={geometry} limit={count} range={count}>
      <meshStandardMaterial color="#ffffff" roughness={0.9} metalness={0} />
      {group.positions.map((position, i) => (
        <Instance
          key={i}
          position={position}
          color={hovered?.key === group.key && hovered.index === i ? hoverFill : fill}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHover({ key: group.key, index: i });
          }}
          onPointerOut={() => onHover(null)}
        />
      ))}
    </Instances>
  );
}

function mirrorLabel(b: PlacedBoard): string | null {
  if (b.mirrorX && b.mirrorY) return 'mirror X+Y';
  if (b.mirrorX) return 'mirror X';
  if (b.mirrorY) return 'mirror Y';
  return null;
}

function HoverChip({ board }: { board: PlacedBoard }) {
  const mirror = mirrorLabel(board);
  return (
    <Html
      position={[board.xMm + board.widthMm / 2, -(board.yMm + board.heightMm / 2), 6]}
      center
      zIndexRange={[10, 0]}
    >
      <div {...stylex.props(styles.chip)}>
        {board.cols}×{board.rows} · {board.widthMm}×{board.heightMm} mm{mirror ? ` · ${mirror}` : ''}
      </div>
    </Html>
  );
}

export default function BoardScene({ plan, model }: { plan: Plan; model: BoardModel }) {
  const [orbit, setOrbit] = useState(false);
  const [hovered, setHovered] = useState<Hover | null>(null);
  const groups = useMemo(() => instancesFor(plan, model), [plan, model]);

  const fill = useTokenColor(mixes.vizFillDim, '#3a3a3a');
  const hoverFill = useTokenColor(colors.accent, '#0c8ce9');
  const gridCell = useTokenColor(mixes.vizGrid, '#2a2a2a');
  const gridSection = useTokenColor(mixes.vizLineStrong, '#6b6b6b');

  const widthMm = plan.coveredWidthMm;
  const heightMm = plan.coveredHeightMm;
  const hoveredBoard = hovered ? (groups.find((g) => g.key === hovered.key)?.boards[hovered.index] ?? null) : null;

  return (
    <div {...stylex.props(styles.frame)}>
      <button
        type="button"
        aria-pressed={orbit}
        {...stylex.props(styles.orbit, orbit && styles.orbitActive)}
        onClick={() => setOrbit((o) => !o)}
      >
        Orbit
      </button>
      <Canvas
        orthographic
        dpr={[1, 2]}
        camera={{ position: [widthMm / 2, -heightMm / 2, CAMERA_DISTANCE], zoom: 1, near: 0.1, far: 5000 }}
        onPointerMissed={() => setHovered(null)}
      >
        <FitCamera widthMm={widthMm} heightMm={heightMm} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[-widthMm, heightMm, 800]} intensity={1.2} />
        <Grid
          position={[widthMm / 2, -heightMm / 2, -0.5]}
          rotation={[Math.PI / 2, 0, 0]}
          args={[widthMm * 4, heightMm * 4]}
          cellSize={20}
          cellThickness={0.6}
          cellColor={gridCell}
          sectionSize={100}
          sectionThickness={1}
          sectionColor={gridSection}
          fadeDistance={20000}
          fadeStrength={0.5}
          infiniteGrid
          side={THREE.DoubleSide}
        />
        {groups.map((group) => (
          <BoardInstances
            key={group.key}
            group={group}
            model={model}
            hovered={hovered}
            onHover={setHovered}
            fill={fill}
            hoverFill={hoverFill}
          />
        ))}
        {hoveredBoard && <HoverChip board={hoveredBoard} />}
        <MapControls
          makeDefault
          target={[widthMm / 2, -heightMm / 2, 0]}
          enableRotate={orbit}
          enableDamping
          dampingFactor={0.15}
          screenSpacePanning
        />
      </Canvas>
    </div>
  );
}
