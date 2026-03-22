import { useEffect, useState } from "react"
import type { Building } from "../../../store/game"

export const useGameTick = (selectedBuilding: Building | null) => {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
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
  }, [selectedBuilding])

  return now
}
