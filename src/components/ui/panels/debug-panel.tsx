import { EXTRACTABLE_RESOURCE_META } from "../../../game-data/resources"
import type { TileDescriptor } from "../../3d/game-canvas"
import { axialToWorld } from "../../3d/hex-math"

interface DebugPanelProps {
  hoveredTile: TileDescriptor | null
  structure: string
}

export const DebugPanel = ({ hoveredTile, structure }: DebugPanelProps) => {
  const worldCoords = hoveredTile ? axialToWorld(hoveredTile.q, hoveredTile.r) : null
  const hoveredResourceMeta = hoveredTile?.resourceType ? EXTRACTABLE_RESOURCE_META[hoveredTile.resourceType] : null
  const structureLabel = structure === "None" ? "None" : `${structure.at(0)?.toUpperCase()}${structure.slice(1)}`

  return (
    <div className="absolute top-16 right-4 bg-slate-900/95 border border-slate-600 text-white p-3 rounded-lg shadow-lg pointer-events-none text-xs font-mono w-48">
      <div className="text-yellow-400 font-bold mb-2 text-sm">Tile Info</div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-slate-400">Type:</span>
          <span className={!hoveredTile ? "text-slate-500" : hoveredResourceMeta ? "text-blue-300" : "text-green-400"}>
            {!hoveredTile ? "-" : hoveredResourceMeta ? "Resource" : "Basic"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Q, R:</span>
          <span>{hoveredTile ? `${hoveredTile.q}, ${hoveredTile.r}` : "-"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">X, Y:</span>
          <span>{worldCoords ? `${worldCoords[0].toFixed(1)}, 0.0` : "-"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">X, Z:</span>
          <span>{worldCoords ? `${worldCoords[0].toFixed(1)}, ${worldCoords[1].toFixed(1)}` : "-"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Resource:</span>
          <span className={!hoveredTile ? "text-slate-500" : hoveredResourceMeta ? "text-amber-400" : "text-slate-500"}>
            {!hoveredTile ? "-" : hoveredResourceMeta ? hoveredResourceMeta.label : "None"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Building:</span>
          <span className={structure !== "None" ? "text-orange-400" : "text-slate-500"}>{structureLabel}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Key:</span>
          <span className="text-slate-300">{hoveredTile?.key ?? "-"}</span>
        </div>
        {!hoveredTile && <div className="pt-1 text-slate-500">Move mouse over a tile</div>}
      </div>
    </div>
  )
}
