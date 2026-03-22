import { Billboard, Text } from "@react-three/drei"
import type { ThreeEvent } from "@react-three/fiber"
import { memo } from "react"
import { EXTRACTABLE_RESOURCE_META } from "../../game-data/resources"
import type { ExtractableResource } from "../../store/game"
import { useGameStore } from "../../store/game"
import { axialToWorld } from "./hex-math"
import { Extractor } from "./structures/extractor"

interface HexTileContentProps {
  q: number
  r: number
  tileKey: string
  resourceType: ExtractableResource | null
  showResourceTip: boolean
  selectedBuilding: boolean
  onSelectBuilding?: (tileKey: string | null) => void
}

const ResourceNode = memo(({ resourceType }: { resourceType: ExtractableResource }) => {
  const meta = EXTRACTABLE_RESOURCE_META[resourceType]

  return (
    <group position={[0, 0.34, 0]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.24, 0.3, 0.2, 6]} />
        <meshStandardMaterial color={meta.tileColor} roughness={0.68} metalness={0.2} />
      </mesh>
      <mesh position={[0.08, 0.2, 0.02]} castShadow>
        <icosahedronGeometry args={[0.12, 0]} />
        <meshStandardMaterial color={meta.accentColor} emissive={meta.tileColor} emissiveIntensity={0.15} />
      </mesh>
    </group>
  )
})

ResourceNode.displayName = "ResourceNode"

export const HexTileContent = memo(
  ({ q, r, tileKey, resourceType, showResourceTip, selectedBuilding, onSelectBuilding }: HexTileContentProps) => {
    const building = useGameStore((state) => state.buildings.get(tileKey))
    const resourceMeta = resourceType ? EXTRACTABLE_RESOURCE_META[resourceType] : null

    const [x, z] = axialToWorld(q, r)

    const handleExtractorClick = (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation()
      onSelectBuilding?.(tileKey)
    }

    return (
      <group position={[x, 0, z]}>
        {resourceType && !building && <ResourceNode resourceType={resourceType} />}

        {resourceMeta && showResourceTip && (
          <group position={[0, 0.06, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.95, 0.22]} />
              <meshBasicMaterial color="#0f172a" transparent opacity={0.85} />
            </mesh>
            <Billboard position={[0, 0.005, 0]}>
              <Text
                fontSize={0.16}
                color={resourceMeta.accentColor}
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.02}
                outlineColor="#0b1020"
              >
                {resourceMeta.label}
              </Text>
            </Billboard>
          </group>
        )}

        {building?.type === "extractor" && (
          <Extractor
            level={building.level}
            resourceType={building.resourceType}
            selected={selectedBuilding}
            onClick={handleExtractorClick}
          />
        )}
      </group>
    )
  }
)

HexTileContent.displayName = "HexTileContent"
