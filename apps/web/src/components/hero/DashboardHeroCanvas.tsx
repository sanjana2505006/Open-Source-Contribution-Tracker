import { Canvas } from '@react-three/fiber';
import { ContributionNetworkScene } from './ContributionNetworkScene';

export function DashboardHeroCanvas() {
  return (
    <Canvas
      className="hero-canvas__webgl"
      camera={{ position: [0, 0, 6.5], fov: 42 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
    >
      <fog attach="fog" args={['#0a0c10', 5, 14]} />
      <ContributionNetworkScene />
    </Canvas>
  );
}
