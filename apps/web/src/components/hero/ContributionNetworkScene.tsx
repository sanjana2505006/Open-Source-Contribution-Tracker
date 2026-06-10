import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

const NODE_COUNT = 52;
const SPHERE_RADIUS = 2.4;
const COLORS = ['#58a6ff', '#3fb950', '#a371f7', '#58a6ff'];

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function fibonacciSphere(index: number, total: number, radius: number): THREE.Vector3 {
  const phi = Math.acos(1 - (2 * (index + 0.5)) / total);
  const theta = Math.PI * (1 + Math.sqrt(5)) * index;
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
  );
}

function buildEdges(positions: THREE.Vector3[], maxDist: number): Array<[THREE.Vector3, THREE.Vector3]> {
  const segments: Array<[THREE.Vector3, THREE.Vector3]> = [];
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      if (positions[i]!.distanceTo(positions[j]!) < maxDist) {
        segments.push([positions[i]!, positions[j]!]);
      }
    }
  }
  return segments;
}

type NodeData = {
  target: THREE.Vector3;
  color: string;
  size: number;
};

export function ContributionNetworkScene() {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const openRef = useRef(0);
  const nodeRefs = useRef<(THREE.Mesh | null)[]>([]);
  const lineRef = useRef<THREE.LineSegments>(null);

  const { nodes, edgePairs } = useMemo(() => {
    const nodeList: NodeData[] = Array.from({ length: NODE_COUNT }, (_, i) => ({
      target: fibonacciSphere(i, NODE_COUNT, SPHERE_RADIUS),
      color: COLORS[i % COLORS.length]!,
      size: 0.04 + (i % 5) * 0.012,
    }));
    const targets = nodeList.map((n) => n.target);
    return {
      nodes: nodeList,
      edgePairs: buildEdges(targets, 1.35),
    };
  }, []);

  useFrame((state, delta) => {
    openRef.current = Math.min(1, openRef.current + delta * 0.55);
    const t = easeOutCubic(openRef.current);

    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.22;
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        Math.sin(state.clock.elapsedTime * 0.35) * 0.12,
        0.04,
      );
    }

    if (coreRef.current) {
      const coreScale = t < 0.7 ? easeOutCubic(t / 0.7) * 1.15 : 1 + Math.sin(state.clock.elapsedTime * 1.2) * 0.04;
      coreRef.current.scale.setScalar(coreScale);
      coreRef.current.rotation.y += delta * 0.5;
      coreRef.current.rotation.z += delta * 0.2;
    }

    nodes.forEach((node, i) => {
      const mesh = nodeRefs.current[i];
      if (!mesh) return;
      mesh.position.lerpVectors(new THREE.Vector3(0, 0, 0), node.target, t);
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2 + i * 0.4) * 0.15;
      mesh.scale.setScalar((0.2 + t * 0.8) * pulse);
    });

    if (lineRef.current) {
      const attr = lineRef.current.geometry.attributes.position as THREE.BufferAttribute;
      let idx = 0;
      for (const [a, b] of edgePairs) {
        const start = new THREE.Vector3().lerpVectors(new THREE.Vector3(0, 0, 0), a, t);
        const end = new THREE.Vector3().lerpVectors(new THREE.Vector3(0, 0, 0), b, t);
        attr.setXYZ(idx++, start.x, start.y, start.z);
        attr.setXYZ(idx++, end.x, end.y, end.z);
      }
      attr.needsUpdate = true;
      const mat = lineRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = t * 0.35;
    }
  });

  const lineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(edgePairs.length * 2 * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [edgePairs]);

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.35} />
      <pointLight position={[4, 4, 4]} intensity={1.2} color="#58a6ff" />
      <pointLight position={[-3, -2, 2]} intensity={0.6} color="#3fb950" />

      <mesh ref={coreRef} scale={0}>
        <icosahedronGeometry args={[0.55, 1]} />
        <meshStandardMaterial
          color="#58a6ff"
          wireframe
          transparent
          opacity={0.85}
          emissive="#1a4a8a"
          emissiveIntensity={0.4}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.1, 0.012, 8, 64]} />
        <meshBasicMaterial color="#58a6ff" transparent opacity={0.2} />
      </mesh>

      <lineSegments ref={lineRef} geometry={lineGeometry}>
        <lineBasicMaterial color="#58a6ff" transparent opacity={0} />
      </lineSegments>

      {nodes.map((node, i) => (
        <mesh
          key={i}
          ref={(el) => {
            nodeRefs.current[i] = el;
          }}
          position={[0, 0, 0]}
        >
          <sphereGeometry args={[node.size, 12, 12]} />
          <meshStandardMaterial
            color={node.color}
            emissive={node.color}
            emissiveIntensity={0.55}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
