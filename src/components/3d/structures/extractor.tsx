import type { ThreeEvent } from "@react-three/fiber"
import { useFrame } from "@react-three/fiber"
import { type ReactNode, useMemo, useRef } from "react"
import type * as THREE from "three"
import type { ExtractableResource } from "../../../store/game"

interface ExtractorProps {
  level: number
  resourceType: ExtractableResource
  selected?: boolean
  customAsset?: ReactNode
  onClick?: (event: ThreeEvent<MouseEvent>) => void
}

const RESOURCE_EMISSIVE: Record<ExtractableResource, string> = {
  iron: "#9a6f3f",
  coal: "#576274",
}

const RESOURCE_CORE: Record<ExtractableResource, string> = {
  iron: "#f4bf76",
  coal: "#c6d0df",
}

const ProceduralExtractor = ({ level, resourceType, selected, onClick }: Omit<ExtractorProps, "customAsset">) => {
  const drillRef = useRef<THREE.Group>(null)
  const pulseRef = useRef<THREE.MeshStandardMaterial>(null)
  const pulseOffset = useMemo(() => Math.random() * Math.PI * 2, [])

  useFrame((state, delta) => {
    if (!drillRef.current) {
      return
    }

    drillRef.current.rotation.y += delta * (0.7 + level * 0.16)

    if (pulseRef.current) {
      const pulse = 0.32 + Math.sin(state.clock.elapsedTime * 1.8 + pulseOffset) * 0.12
      pulseRef.current.emissiveIntensity = pulse + level * 0.05
    }
  })

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: R3F groups support scene pointer events.
    <group position={[0, 0.32, 0]} onClick={onClick}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.58, 0.64, 0.24, 6]} />
        <meshStandardMaterial color={selected ? "#fb923c" : "#334155"} metalness={0.32} roughness={0.56} />
      </mesh>

      <mesh position={[0, 0.16, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.52, 0.15, 6]} />
        <meshStandardMaterial
          ref={pulseRef}
          color={RESOURCE_CORE[resourceType]}
          emissive={RESOURCE_EMISSIVE[resourceType]}
          emissiveIntensity={0.3}
          metalness={0.22}
          roughness={0.4}
        />
      </mesh>

      <group ref={drillRef} position={[0, 0.38, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.16, 0.16, 0.36, 6]} />
          <meshStandardMaterial color="#0f172a" metalness={0.45} roughness={0.35} />
        </mesh>
        <mesh position={[0, -0.26, 0]} castShadow>
          <coneGeometry args={[0.12, 0.34, 6]} />
          <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.24, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.08, 6]} />
          <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.26} />
        </mesh>
      </group>

      <mesh position={[0, 0.54, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.34, 0.1, 6]} />
        <meshStandardMaterial color="#64748b" metalness={0.36} roughness={0.44} />
      </mesh>
    </group>
  )
}

export const Extractor = ({ customAsset, ...props }: ExtractorProps) => {
  if (customAsset !== null && customAsset !== undefined) {
    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: R3F groups support scene pointer events.
      <group position={[0, 0.32, 0]} onClick={props.onClick}>
        {customAsset}
      </group>
    )
  }

  return <ProceduralExtractor {...props} />
}
