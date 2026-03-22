import { useGameStore } from "../../store/game"
import type { TileDescriptor } from "../3d/game-canvas"
import { useGameTick } from "./hooks/use-game-tick"
import { BuildMenu } from "./panels/build-menu"
import { DebugPanel } from "./panels/debug-panel"
import { ExtractorInfoPanel } from "./panels/extractor-info-panel"
import { ResourceBar } from "./panels/resource-bar"
import { TopControls } from "./panels/top-controls"

interface UIOverlayProps {
  debugMode: boolean
  setDebugMode: (mode: boolean) => void
  hoveredTile: TileDescriptor | null
  selectedTileKey: string | null
  setSelectedTileKey: (tileKey: string | null) => void
  onGoHome: () => void
}

export const UIOverlay = ({
  debugMode,
  setDebugMode,
  hoveredTile,
  selectedTileKey,
  setSelectedTileKey,
  onGoHome,
}: UIOverlayProps) => {
  const { inventory, upgradeBuilding } = useGameStore()
  const buildings = useGameStore((state) => state.buildings)

  const selectedBuilding = selectedTileKey ? (buildings.get(selectedTileKey) ?? null) : null
  const now = useGameTick(selectedBuilding)
  const hoveredStructure = hoveredTile ? (buildings.get(hoveredTile.key)?.type ?? "None") : "None"

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10">
      <div className="flex justify-between items-start">
        <ResourceBar inventory={inventory} />
        <TopControls debugMode={debugMode} setDebugMode={setDebugMode} onGoHome={onGoHome} />
      </div>

      {debugMode && <DebugPanel hoveredTile={hoveredTile} structure={hoveredStructure} />}

      {selectedBuilding && selectedTileKey && (
        <ExtractorInfoPanel
          building={selectedBuilding}
          tileKey={selectedTileKey}
          now={now}
          inventory={inventory}
          onClose={() => setSelectedTileKey(null)}
          onUpgrade={upgradeBuilding}
        />
      )}

      <BuildMenu />
    </div>
  )
}
