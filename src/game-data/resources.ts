import type { ExtractableResource, Resource } from "../store/game"

export const RESOURCE_LABELS: Record<Resource, string> = {
  wood: "Wood",
  iron: "Iron",
  coal: "Coal",
}

export const EXTRACTABLE_RESOURCE_META: Record<
  ExtractableResource,
  {
    label: string
    shortLabel: string
    tileColor: string
    accentColor: string
  }
> = {
  iron: {
    label: "Iron Ore",
    shortLabel: "Fe",
    tileColor: "#8b5a2b",
    accentColor: "#d4a24c",
  },
  coal: {
    label: "Coal Ore",
    shortLabel: "C",
    tileColor: "#3f4654",
    accentColor: "#93a0b6",
  },
}

const hashCoords = (q: number, r: number) => {
  const hash = (q * 374761393 + r * 668265263) ^ (q * r * 1274126177)
  return Math.abs(hash)
}

export const getTileResourceType = (q: number, r: number): ExtractableResource | null => {
  const hash = hashCoords(q, r)

  if (hash % 17 !== 0) {
    return null
  }

  return hash % 10 < 6 ? "iron" : "coal"
}
