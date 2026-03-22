import { create } from "zustand"

export const EXTRACTABLE_RESOURCES = ["iron", "coal"] as const
export type ExtractableResource = (typeof EXTRACTABLE_RESOURCES)[number]

export type Resource = ExtractableResource
export type Structure = "extractor"

export type ResourceCost = Partial<Record<Resource, number>>

export interface ExtractorBuilding {
  type: "extractor"
  level: number
  resourceType: ExtractableResource
  lastProducedAt: number
  totalProduced: number
}

export type Building = ExtractorBuilding

export const EXTRACTOR_MAX_LEVEL = 4

export type ExtractorStats = {
  cycleMs: number
  yieldPerCycle: number
}

const EXTRACTOR_LEVEL_STATS: Record<number, ExtractorStats> = {
  1: { cycleMs: 12000, yieldPerCycle: 1 },
  2: { cycleMs: 9000, yieldPerCycle: 1 },
  3: { cycleMs: 7000, yieldPerCycle: 2 },
  4: { cycleMs: 5000, yieldPerCycle: 2 },
}

export const getExtractorStats = (level: number): ExtractorStats => {
  const normalizedLevel = Math.max(1, Math.min(EXTRACTOR_MAX_LEVEL, level))
  return EXTRACTOR_LEVEL_STATS[normalizedLevel]
}

export const getExtractorUpgradeCost = (level: number): ResourceCost | null => {
  if (level >= EXTRACTOR_MAX_LEVEL) {
    return null
  }

  if (level === 1) {
    return { iron: 20 }
  }

  if (level === 2) {
    return { iron: 35, coal: 10 }
  }

  return { iron: 55, coal: 20 }
}

const hasEnoughResources = (inventory: Record<Resource, number>, cost: ResourceCost) => {
  return Object.entries(cost).every(([resource, amount]) => {
    const typedResource = resource as Resource
    const typedAmount = amount ?? 0
    return inventory[typedResource] >= typedAmount
  })
}

const applyCost = (inventory: Record<Resource, number>, cost: ResourceCost) => {
  const nextInventory = { ...inventory }

  for (const [resource, amount] of Object.entries(cost)) {
    const typedResource = resource as Resource
    const typedAmount = amount ?? 0
    nextInventory[typedResource] = Math.max(0, nextInventory[typedResource] - typedAmount)
  }

  return nextInventory
}

type MouseTool = { type: "cursor" } | { type: "place"; object: Structure }

interface GameState {
  inventory: Record<Resource, number>
  buildings: Map<string, Building>
  selectedTool: MouseTool
  addResource: (type: Resource, amount: number) => void
  setTool: (tool: MouseTool) => void
  resetTool: () => void
  placeExtractor: (q: number, r: number, resourceType: ExtractableResource) => void
  upgradeBuilding: (tileKey: string) => boolean
  tickExtractors: (now: number) => void
}

export const useGameStore = create<GameState>((set, get) => ({
  inventory: { iron: 100, coal: 50 },
  buildings: new Map(),
  selectedTool: { type: "cursor" },

  addResource: (type, amount) =>
    set((state) => ({
      inventory: { ...state.inventory, [type]: state.inventory[type] + amount },
    })),

  setTool: (tool) => set({ selectedTool: tool }),
  resetTool: () => set({ selectedTool: { type: "cursor" } }),

  placeExtractor: (q, r, resourceType) =>
    set((state) => ({
      buildings: new Map(state.buildings).set(`${q},${r}`, {
        type: "extractor",
        level: 1,
        resourceType,
        lastProducedAt: Date.now(),
        totalProduced: 0,
      }),
    })),

  upgradeBuilding: (tileKey) => {
    const state = get()
    const building = state.buildings.get(tileKey)

    if (!building || building.type !== "extractor") {
      return false
    }

    const upgradeCost = getExtractorUpgradeCost(building.level)
    if (!upgradeCost || !hasEnoughResources(state.inventory, upgradeCost)) {
      return false
    }

    const nextBuildings = new Map(state.buildings)
    nextBuildings.set(tileKey, {
      ...building,
      level: Math.min(EXTRACTOR_MAX_LEVEL, building.level + 1),
    })

    set({
      inventory: applyCost(state.inventory, upgradeCost),
      buildings: nextBuildings,
    })

    return true
  },

  tickExtractors: (now) => {
    const state = get()
    let nextInventory: Record<Resource, number> | null = null
    let nextBuildings: Map<string, Building> | null = null

    for (const [tileKey, building] of state.buildings.entries()) {
      if (building.type !== "extractor") {
        continue
      }

      const stats = getExtractorStats(building.level)
      const elapsed = now - building.lastProducedAt
      const completedCycles = Math.floor(elapsed / stats.cycleMs)

      if (completedCycles <= 0) {
        continue
      }

      if (!nextInventory) {
        nextInventory = { ...state.inventory }
      }

      if (!nextBuildings) {
        nextBuildings = new Map(state.buildings)
      }

      const producedAmount = completedCycles * stats.yieldPerCycle
      nextInventory[building.resourceType] += producedAmount

      nextBuildings.set(tileKey, {
        ...building,
        lastProducedAt: building.lastProducedAt + completedCycles * stats.cycleMs,
        totalProduced: building.totalProduced + producedAmount,
      })
    }

    if (!nextInventory || !nextBuildings) {
      return
    }

    set({
      inventory: nextInventory,
      buildings: nextBuildings,
    })
  },
}))
