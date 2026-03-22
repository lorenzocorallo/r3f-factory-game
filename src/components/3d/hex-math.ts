const SQRT_3 = Math.sqrt(3)

export const HEX_SIZE = 1
export const HEX_HEIGHT = 0.16
export const HEX_VISUAL_SCALE = 0.998

type Axial = {
  q: number
  r: number
  s: number
}

export const axialToWorld = (q: number, r: number) => {
  const x = HEX_SIZE * SQRT_3 * (q + r / 2)
  const z = HEX_SIZE * 1.5 * r
  return [x, z] as const
}

export const worldToAxialFractional = (x: number, z: number): Axial => {
  const q = ((SQRT_3 / 3) * x - z / 3) / HEX_SIZE
  const r = ((2 / 3) * z) / HEX_SIZE
  return { q, r, s: -q - r }
}

export const worldToAxial = (x: number, z: number) => {
  const { q, r } = worldToAxialFractional(x, z)
  return roundAxial(q, r)
}

const roundAxial = (q: number, r: number): Axial => {
  const s = -q - r
  let rq = Math.round(q)
  let rr = Math.round(r)
  let rs = Math.round(s)

  const qDiff = Math.abs(rq - q)
  const rDiff = Math.abs(rr - r)
  const sDiff = Math.abs(rs - s)

  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs
  } else if (rDiff > sDiff) {
    rr = -rq - rs
  } else {
    rs = -rq - rr
  }

  return { q: rq, r: rr, s: rs }
}
