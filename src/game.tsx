import { useEffect, useState } from "react"
import { GameCanvas, type TileDescriptor } from "./components/3d/game-canvas"
import { UIOverlay } from "./components/ui/overlay"
import { useGameStore } from "./store/game"

export function Game() {
  const [debugMode, setDebugMode] = useState(false)
  const [hoveredTile, setHoveredTile] = useState<TileDescriptor | null>(null)
  const [selectedTileKey, setSelectedTileKey] = useState<string | null>(null)
  const [homeRequestNonce, setHomeRequestNonce] = useState(0)
  const tickExtractors = useGameStore((state) => state.tickExtractors)

  useEffect(() => {
    const timer = window.setInterval(() => {
      tickExtractors(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [tickExtractors])

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-950">
      <GameCanvas
        debugMode={debugMode}
        onTileHover={setHoveredTile}
        onBuildingSelect={setSelectedTileKey}
        selectedTileKey={selectedTileKey}
        homeRequestNonce={homeRequestNonce}
      />
      <UIOverlay
        debugMode={debugMode}
        setDebugMode={setDebugMode}
        hoveredTile={hoveredTile}
        selectedTileKey={selectedTileKey}
        setSelectedTileKey={setSelectedTileKey}
        onGoHome={() => setHomeRequestNonce((value) => value + 1)}
      />
    </div>
  )
}
