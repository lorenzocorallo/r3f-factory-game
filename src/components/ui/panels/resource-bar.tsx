import OreSvg from "../../../assets/icons/resource_ore.svg?react"
import { RESOURCE_LABELS } from "../../../game-data/resources"
import type { Resource } from "../../../store/game"

const RESOURCE_ICONS: Record<Resource, React.ReactNode> = {
  iron: <OreSvg className="text-amber-300 size-7" />,
  coal: <OreSvg className="text-black size-7" />,
}

const inventoryResources: Resource[] = ["iron", "coal"]

interface ResourceBarProps {
  inventory: Record<Resource, number>
}

export const ResourceBar = ({ inventory }: ResourceBarProps) => {
  return (
    <div className="flex gap-6 bg-slate-700/60 px-3 py-2 rounded-xl shadow-lg items-center border-2 border-slate-700">
      {inventoryResources.map((resource) => {
        return (
          <div
            title={RESOURCE_LABELS[resource]}
            key={resource}
            className="text-white flex items-center gap-1 pointer-events-auto"
          >
            {RESOURCE_ICONS[resource]}
            <span className="font-mono text-lg font-bold">{inventory[resource]}</span>
          </div>
        )
      })}
    </div>
  )
}
