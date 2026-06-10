import { Canvas } from '@react-three/fiber';
import { ContributionNetworkScene } from './ContributionNetworkScene';

export function DashboardHeroCanvas() {
  return (
    <Canvas
      className="hero-immersive__webgl"
      camera={{ position: [0, 0, 11], fov: 48 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      style={{ pointerEvents: 'none' }}
    >
      <fog attach="fog" args={['#0a0c10', 4, 16]} />
      <ContributionNetworkScene />
    </Canvas>
  );
}
