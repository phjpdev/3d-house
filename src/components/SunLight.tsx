/**
 * Soft window fill aimed at mid-room height so shadows fall mostly downward
 * (avoids long diagonal slashes on back walls).
 */
export function SunLight() {
  return (
    <directionalLight
      castShadow
      intensity={0.18}
      color="#fff4e6"
      position={[0.6, 13.5, 0.45]}
      shadow-bias={-0.00018}
      shadow-normalBias={0.045}
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-camera-near={2}
      shadow-camera-far={22}
      shadow-camera-left={-7.5}
      shadow-camera-right={7.5}
      shadow-camera-top={7.5}
      shadow-camera-bottom={-7.5}
    >
      <object3D attach="target" position={[0, 1.35, 0]} />
    </directionalLight>
  )
}
