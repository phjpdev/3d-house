/**
 * Soft window fill aimed at mid-room height so shadows fall mostly downward
 * (avoids long diagonal slashes on back walls).
 */
export function SunLight() {
  return (
    <directionalLight
      castShadow
      intensity={0.22}
      color="#fff4e8"
      position={[0.55, 13.2, 0.42]}
      shadow-bias={-0.00014}
      shadow-normalBias={0.038}
      shadow-mapSize-width={3072}
      shadow-mapSize-height={3072}
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
