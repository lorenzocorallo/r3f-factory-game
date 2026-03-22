import { useEffect, useMemo, useState } from "react"
import type { IconType } from "react-icons"
import { GiClockwork, GiCoalPile, GiDrill, GiHouse, GiOre, GiUpgrade, GiWoodPile } from "react-icons/gi"
import { EXTRACTABLE_RESOURCE_META, RESOURCE_LABELS } from "../../game-data/resources"
import { getExtractorStats, getExtractorUpgradeCost, type Resource, useGameStore } from "../../store/game"
import type { TileDescriptor } from "../3d/game-canvas"
import { axialToWorld } from "../3d/hex-math"

const IS_DEV = import.meta.env.DEV

const RESOURCE_ICONS: Record<Resource, IconType> = {
  iron: GiOre,
  coal: GiCoalPile,
  wood: GiWoodPile,
}

const hasEnoughForCost = (inventory: Record<Resource, number>, cost: Partial<Record<Resource, number>>) => {
  return Object.entries(cost).every(([resource, amount]) => {
    const typedResource = resource as Resource
    const typedAmount = amount ?? 0
    return inventory[typedResource] >= typedAmount
  })
}

const formatDuration = (milliseconds: number) => {
  const totalSeconds = Math.ceil(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes <= 0) {
    return `${seconds}s`
  }

  return `${minutes}m ${seconds}s`
}

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
  const { inventory, resetTool, selectedTool, setTool, upgradeBuilding } = useGameStore()
  const buildings = useGameStore((state) => state.buildings)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const selectedBuilding = selectedTileKey ? buildings.get(selectedTileKey) : null
    if (selectedBuilding?.type !== "extractor") {
      return
    }

    let raf = 0
    const tick = () => {
      setNow(Date.now())
      raf = window.requestAnimationFrame(tick)
    }

    raf = window.requestAnimationFrame(tick)
    return () => {
      window.cancelAnimationFrame(raf)
    }
  }, [selectedTileKey, buildings])

  const worldCoords = hoveredTile ? axialToWorld(hoveredTile.q, hoveredTile.r) : null
  const structure = hoveredTile ? (buildings.get(hoveredTile.key)?.type ?? "None") : "None"
  const hoveredResourceMeta = hoveredTile?.resourceType ? EXTRACTABLE_RESOURCE_META[hoveredTile.resourceType] : null

  const selectedBuilding = selectedTileKey ? (buildings.get(selectedTileKey) ?? null) : null
  const selectedBuildingIsExtractor = selectedBuilding?.type === "extractor"
  const structureLabel = structure === "None" ? "None" : `${structure.at(0)?.toUpperCase()}${structure.slice(1)}`

  const productionStats = selectedBuildingIsExtractor ? getExtractorStats(selectedBuilding.level) : null
  const upgradeCost = selectedBuildingIsExtractor ? getExtractorUpgradeCost(selectedBuilding.level) : null
  const canUpgrade = selectedBuildingIsExtractor && upgradeCost ? hasEnoughForCost(inventory, upgradeCost) : false

  const cycleElapsed = selectedBuildingIsExtractor && productionStats ? now - selectedBuilding.lastProducedAt : 0
  const cycleTime = productionStats?.cycleMs ?? 1
  const cycleProgress = selectedBuildingIsExtractor ? Math.min(1, (cycleElapsed % cycleTime) / cycleTime) : 0
  const nextCycleMs = selectedBuildingIsExtractor ? Math.max(0, cycleTime - (cycleElapsed % cycleTime)) : null

  const upgradeCostText = useMemo(() => {
    if (!upgradeCost) {
      return "Max level"
    }

    return Object.entries(upgradeCost)
      .map(([resource, amount]) => `${amount} ${RESOURCE_LABELS[resource as Resource]}`)
      .join(" + ")
  }, [upgradeCost])

  const inventoryResources: Resource[] = ["iron", "coal", "wood"]

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10">
      {/* TOP LEFT: Resources */}
      <div className="flex justify-between items-start">
        <div className="flex gap-4">
          {inventoryResources.map((resource) => {
            const Icon = RESOURCE_ICONS[resource]

            return (
              <div
                key={resource}
                className="bg-slate-900/90 border-2 border-slate-700 text-white px-3 py-2 rounded-xl shadow-lg flex items-center gap-2 pointer-events-auto min-w-28"
              >
                <Icon className="text-xl text-amber-300" />
                <div className="flex flex-col leading-tight">
                  <span className="text-[11px] uppercase tracking-wide text-slate-400">
                    {RESOURCE_LABELS[resource]}
                  </span>
                  <span className="font-mono text-lg font-bold">{inventory[resource]}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* TOP RIGHT: Debug button (dev only) */}
        <div className="flex gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={onGoHome}
            className="px-3 py-2 rounded-lg text-sm font-mono transition-all bg-slate-800/90 text-slate-200 hover:bg-slate-700 flex items-center justify-center"
            aria-label="Go home"
            title="Go home"
          >
            <GiHouse />
          </button>
          {IS_DEV && (
            <button
              type="button"
              onClick={() => setDebugMode(!debugMode)}
              className={`px-3 py-2 rounded-lg text-sm font-mono transition-all ${
                debugMode ? "bg-yellow-500 text-black" : "bg-slate-800/90 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {debugMode ? "DEBUG ON" : "DEBUG"}
            </button>
          )}
        </div>
      </div>

      {/* TOP RIGHT: Debug info box */}
      {debugMode && (
        <div className="absolute top-16 right-4 bg-slate-900/95 border border-slate-600 text-white p-3 rounded-lg shadow-lg pointer-events-none text-xs font-mono w-48">
          <div className="text-yellow-400 font-bold mb-2 text-sm">Tile Info</div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Type:</span>
              <span
                className={!hoveredTile ? "text-slate-500" : hoveredResourceMeta ? "text-blue-300" : "text-green-400"}
              >
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
              <span
                className={!hoveredTile ? "text-slate-500" : hoveredResourceMeta ? "text-amber-400" : "text-slate-500"}
              >
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
      )}

      {selectedBuildingIsExtractor && productionStats && (
        <div className="absolute right-4 top-24 w-80 bg-slate-900/95 border border-slate-600 rounded-xl shadow-2xl pointer-events-auto p-4 text-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-3">
              <div className="h-16 w-16 rounded-xl border border-slate-500/60 bg-slate-800 flex items-center justify-center relative overflow-hidden">
                <div
                  className="absolute inset-2 bg-slate-700/80"
                  style={{ clipPath: "polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0 50%)" }}
                />
                <GiDrill className="relative text-2xl text-amber-300" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400">Building</div>
                <div className="text-lg font-semibold">Extractor Level {selectedBuilding.level}</div>
                <div className="text-xs text-slate-400">
                  Mining {EXTRACTABLE_RESOURCE_META[selectedBuilding.resourceType].label}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedTileKey(null)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              x
            </button>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <GiClockwork /> Production progress
              </span>
              <span>{Math.round(cycleProgress * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                style={{ width: `${cycleProgress * 100}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Next output in {nextCycleMs !== null ? formatDuration(nextCycleMs) : "-"}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-2">
              <div className="text-slate-400">Yield / cycle</div>
              <div className="font-semibold text-slate-100 mt-1">{productionStats.yieldPerCycle}</div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-2">
              <div className="text-slate-400">Total extracted</div>
              <div className="font-semibold text-slate-100 mt-1">{selectedBuilding.totalProduced}</div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800/70 p-3">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1">
                <GiUpgrade /> Upgrade
              </span>
              <span className="text-slate-400">{upgradeCostText}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                if (selectedTileKey) {
                  upgradeBuilding(selectedTileKey)
                }
              }}
              disabled={!upgradeCost || !canUpgrade}
              className={`mt-3 w-full py-2 rounded-md text-sm font-semibold transition-colors ${
                !upgradeCost || !canUpgrade
                  ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                  : "bg-orange-600 hover:bg-orange-500 text-white"
              }`}
            >
              {!upgradeCost ? "Max level reached" : canUpgrade ? "Upgrade extractor" : "Not enough resources"}
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM: City Skylines Style Build Menu */}
      <div className="self-center bg-slate-800/90 p-2 rounded-2xl shadow-2xl flex gap-2 pointer-events-auto border-b-4 border-slate-950">
        <button
          type="button"
          onClick={resetTool}
          className={`px-6 py-4 rounded-xl font-bold transition-all ${selectedTool.type === "cursor" ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
        >
          Seleziona
        </button>
        <button
          type="button"
          onClick={() => setTool({ type: "place", object: "extractor" })}
          className={`px-6 py-4 rounded-xl font-bold transition-all flex flex-col items-center ${selectedTool.type === "place" && selectedTool.object === "extractor" ? "bg-orange-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
        >
          <span>Estrattore</span>
          <span className="text-xs font-mono opacity-70 mt-1">On resource tiles</span>
        </button>
      </div>
    </div>
  )
}
