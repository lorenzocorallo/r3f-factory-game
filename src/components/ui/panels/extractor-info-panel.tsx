import { GiClockwork, GiDrill, GiUpgrade } from "react-icons/gi"
import { EXTRACTABLE_RESOURCE_META } from "../../../game-data/resources"
import type { Building, Resource } from "../../../store/game"
import { getExtractorStats, getExtractorUpgradeCost } from "../../../store/game"
import { formatDuration, hasEnoughForCost, useUpgradeCostText } from "../utils/formatting"

interface ExtractorInfoPanelProps {
  building: Building
  tileKey: string
  now: number
  inventory: Record<Resource, number>
  onClose: () => void
  onUpgrade: (tileKey: string) => void
}

export const ExtractorInfoPanel = ({
  building,
  tileKey,
  now,
  inventory,
  onClose,
  onUpgrade,
}: ExtractorInfoPanelProps) => {
  const productionStats = building.type === "extractor" ? getExtractorStats(building.level) : null
  const upgradeCost = building.type === "extractor" ? getExtractorUpgradeCost(building.level) : null
  const canUpgrade = upgradeCost ? hasEnoughForCost(inventory, upgradeCost) : false

  const upgradeCostText = useUpgradeCostText(upgradeCost)

  if (building.type !== "extractor" || !productionStats) {
    return null
  }

  const cycleElapsed = now - building.lastProducedAt
  const cycleTime = productionStats.cycleMs
  const cycleProgress = Math.min(1, (cycleElapsed % cycleTime) / cycleTime)
  const nextCycleMs = Math.max(0, cycleTime - (cycleElapsed % cycleTime))

  return (
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
            <div className="text-lg font-semibold">Extractor Level {building.level}</div>
            <div className="text-xs text-slate-400">
              Mining {EXTRACTABLE_RESOURCE_META[building.resourceType].label}
            </div>
          </div>
        </div>

        <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
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
        <div className="mt-2 text-xs text-slate-400">Next output in {formatDuration(nextCycleMs)}</div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-2">
          <div className="text-slate-400">Yield / cycle</div>
          <div className="font-semibold text-slate-100 mt-1">{productionStats.yieldPerCycle}</div>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-2">
          <div className="text-slate-400">Total extracted</div>
          <div className="font-semibold text-slate-100 mt-1">{building.totalProduced}</div>
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
          onClick={() => onUpgrade(tileKey)}
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
  )
}
