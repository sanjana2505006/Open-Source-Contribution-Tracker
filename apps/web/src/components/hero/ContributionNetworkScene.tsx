import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

const NODE_COUNT = 72;
const SPHERE_RADIUS = 2.2;
const COLORS = ['#58a6ff', '#3fb950', '#a371f7'];

function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - 2 ** (-10 * t);
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

function buildEdges(
  positions: THREE.Vector3[],
  maxDist: number,
): Array<[THREE.Vector3, THREE.Vector3]> {
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
  phase: number;
};

export function ContributionNetworkScene() {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const openRef = useRef(0);
  const nodeRefs = useRef<(THREE.Mesh | null)[]>([]);
  const lineRef = useRef<THREE.LineSegments>(null);
  const { pointer, camera } = useThree();

  const { nodes, edgePairs } = useMemo(() => {
    const nodeList: NodeData[] = Array.from({ length: NODE_COUNT }, (_, i) => ({
      target: fibonacciSphere(i, NODE_COUNT, SPHERE_RADIUS),
      color: COLORS[i % COLORS.length]!,
      size: 0.035 + (i % 4) * 0.01,
      phase: i * 0.7,
    }));
    const targets = nodeList.map((n) => n.target);
    return { nodes: nodeList, edgePairs: buildEdges(targets, 1.25) };
  }, []);

  const origin = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  useFrame((state, delta) => {
    openRef.current = Math.min(1, openRef.current + delta * 0.38);
    const t = easeOutExpo(openRef.current);
    const time = state.clock.elapsedTime;

    const targetCamX = pointer.x * 0.65;
    const targetCamY = pointer.y * 0.35;
    const targetCamZ = THREE.MathUtils.lerp(11, 5.8, t);
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCamX, 0.04);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCamY, 0.04);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, 0.05);
    camera.lookAt(0, 0, 0);

    if (groupRef.current) {
      groupRef.current.rotation.y = time * 0.14 + pointer.x * 0.25;
      groupRef.current.rotation.x = Math.sin(time * 0.28) * 0.1 + pointer.y * 0.12;
    }

    if (coreRef.current) {
      const breathe = 1 + Math.sin(time * 1.4) * 0.05;
      coreRef.current.scale.setScalar(easeOutExpo(Math.min(1, t * 1.4)) * breathe);
      coreRef.current.rotation.y += delta * 0.55;
      coreRef.current.rotation.x += delta * 0.18;
    }

    nodes.forEach((node, i) => {
      const mesh = nodeRefs.current[i];
      if (!mesh) return;

      const drift = new THREE.Vector3(
        node.target.x + Math.sin(time * 0.55 + node.phase) * 0.08,
        node.target.y + Math.cos(time * 0.45 + node.phase) * 0.08,
        node.target.z + Math.sin(time * 0.35 + node.phase) * 0.06,
      );

      mesh.position.lerpVectors(origin, drift, t);
      const pulse = 1 + Math.sin(time * 2.2 + node.phase) * 0.18;
      mesh.scale.setScalar((0.15 + t * 0.85) * pulse);
    });

    if (lineRef.current) {
      const attr = lineRef.current.geometry.attributes.position as THREE.BufferAttribute;
      let idx = 0;
      for (const [a, b] of edgePairs) {
        const start = new THREE.Vector3().lerpVectors(origin, a, t);
        const end = new THREE.Vector3().lerpVectors(origin, b, t);
        attr.setXYZ(idx++, start.x, start.y, start.z);
        attr.setXYZ(idx++, end.x, end.y, end.z);
      }
      attr.needsUpdate = true;
      const mat = lineRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = t * 0.42;
    }
  });

  const lineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(edgePairs.length * 6), 3));
    return geo;
  }, [edgePairs]);

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.25} />
      <pointLight position={[5, 4, 6]} intensity={1.4} color="#58a6ff" />
      <pointLight position={[-4, -3, 3]} intensity={0.7} color="#3fb950" />
      <pointLight position={[0, -5, -2]} intensity={0.4} color="#a371f7" />

      <mesh ref={coreRef} scale={0}>
        <icosahedronGeometry args={[0.62, 2]} />
        <meshStandardMaterial
          color="#58a6ff"
          wireframe
          transparent
          opacity={0.9}
          emissive="#2563eb"
          emissiveIntensity={0.65}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.35, 0.018, 12, 96]} />
        <meshBasicMaterial color="#58a6ff" transparent opacity={0.18} />
      </mesh>

      <lineSegments ref={lineRef} geometry={lineGeometry}>
        <lineBasicMaterial color="#7eb8ff" transparent opacity={0} blending={THREE.AdditiveBlending} />
      </lineSegments>

      {nodes.map((node, i) => (
        <mesh
          key={i}
          ref={(el) => {
            nodeRefs.current[i] = el;
          }}
        >
          <sphereGeometry args={[node.size, 10, 10]} />
          <meshStandardMaterial
            color={node.color}
            emissive={node.color}
            emissiveIntensity={0.75}
            toneMapped={false}
            transparent
            opacity={0.92}
          />
        </mesh>
      ))}
    </group>
  );
}
