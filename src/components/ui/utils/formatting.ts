import { useMemo } from "react"
import { RESOURCE_LABELS } from "../../../game-data/resources"
import type { Resource } from "../../../store/game"

export const formatDuration = (milliseconds: number) => {
  const totalSeconds = Math.ceil(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes <= 0) {
    return `${seconds}s`
  }

  return `${minutes}m ${seconds}s`
}

export const hasEnoughForCost = (inventory: Record<Resource, number>, cost: Partial<Record<Resource, number>>) => {
  return Object.entries(cost).every(([resource, amount]) => {
    const typedResource = resource as Resource
    const typedAmount = amount ?? 0
    return inventory[typedResource] >= typedAmount
  })
}

export const useUpgradeCostText = (upgradeCost: Partial<Record<Resource, number>> | null) => {
  return useMemo(() => {
    if (!upgradeCost) {
      return "Max level"
    }

    return Object.entries(upgradeCost)
      .map(([resource, amount]) => `${amount} ${RESOURCE_LABELS[resource as Resource]}`)
      .join(" + ")
  }, [upgradeCost])
}
