import { MapControls, OrthographicCamera } from "@react-three/drei"
import type { ThreeEvent } from "@react-three/fiber"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { type RefObject, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import type { MapControls as MapControlsImpl } from "three-stdlib"
import { EXTRACTABLE_RESOURCE_META, getTileResourceType } from "../../game-data/resources"
import type { ExtractableResource } from "../../store/game"
import { useGameStore } from "../../store/game"
import { axialToWorld, HEX_HEIGHT, HEX_SIZE, worldToAxial } from "./hex-math"
import { HexTileContent } from "./hex-tile"

const CAM_POS: [number, number, number] = [28, 28, 28]
const INITIAL_ZOOM = 60
const MIN_ZOOM = 42
const MAX_ZOOM = 90
const BASE_TILE_RENDER_RADIUS = 28
const TILE_RADIUS_OVERSCAN = 20
const MAX_TILES = 8000
const HOME_ANIMATION_MIN_MS = 500
const HOME_ANIMATION_MAX_MS = 1800
const HOME_ANIMATION_MS_PER_WORLD_UNIT = 5

// Bright, visible colors
const BASE_TILE_COLOR = new THREE.Color("#45d66f")
const BASE_TILE_COLOR_VARIANTS = [
  new THREE.Color("#45d66f"),
  new THREE.Color("#3fc964"),
  new THREE.Color("#52dd79"),
] as const
const BORDER_COLOR = "#29663d" // lighter dark green, more pleasant

type TileDescriptor = {
  q: number
  r: number
  key: string
  resourceType: ExtractableResource | null
}

const cubeDistance = (aq: number, ar: number, bq: number, br: number) => {
  const as = -aq - ar
  const bs = -bq - br
  return Math.max(Math.abs(aq - bq), Math.abs(ar - br), Math.abs(as - bs))
}

const tileHash = (q: number, r: number) => {
  return Math.abs((q * 374761393 + r * 668265263) ^ (q * r * 1274126177))
}

const getRadiusForMaxZoom = (camera: THREE.OrthographicCamera) => {
  const raycaster = new THREE.Raycaster()
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const centerHit = new THREE.Vector3()
  const cornerHit = new THREE.Vector3()
  const cameraAtMaxZoomOut = camera.clone()
  cameraAtMaxZoomOut.zoom = MIN_ZOOM
  cameraAtMaxZoomOut.updateProjectionMatrix()
  cameraAtMaxZoomOut.updateMatrixWorld()

  raycaster.setFromCamera(new THREE.Vector2(0, 0), cameraAtMaxZoomOut)
  if (!raycaster.ray.intersectPlane(plane, centerHit)) {
    return BASE_TILE_RENDER_RADIUS + TILE_RADIUS_OVERSCAN
  }

  let maxGroundDistance = 0
  const corners = [
    new THREE.Vector2(-1, -1),
    new THREE.Vector2(-1, 1),
    new THREE.Vector2(1, -1),
    new THREE.Vector2(1, 1),
  ]

  for (const corner of corners) {
    raycaster.setFromCamera(corner, cameraAtMaxZoomOut)
    if (!raycaster.ray.intersectPlane(plane, cornerHit)) {
      continue
    }

    maxGroundDistance = Math.max(maxGroundDistance, centerHit.distanceTo(cornerHit))
  }

  const radiusByDistance = Math.ceil(maxGroundDistance / (Math.sqrt(3) * HEX_SIZE))
  return Math.max(BASE_TILE_RENDER_RADIUS, radiusByDistance + TILE_RADIUS_OVERSCAN)
}

// Create hex shape for proper hexagonal tiles
const createHexShape = (radius: number) => {
  const shape = new THREE.Shape()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    const x = radius * Math.cos(angle)
    const y = radius * Math.sin(angle)
    if (i === 0) {
      shape.moveTo(x, y)
    } else {
      shape.lineTo(x, y)
    }
  }
  shape.closePath()
  return shape
}

interface InfiniteHexFieldProps {
  controlsRef: RefObject<MapControlsImpl | null>
  onTileHover?: (tile: TileDescriptor | null) => void
  onBuildingSelect?: (tileKey: string | null) => void
  selectedTileKey: string | null
  homeRequestNonce: number
  debugMode: boolean
}

const InfiniteHexField = ({
  controlsRef,
  onTileHover,
  onBuildingSelect,
  selectedTileKey,
  homeRequestNonce,
  debugMode,
}: InfiniteHexFieldProps) => {
  const camera = useThree((state) => state.camera)
  const selectedTool = useGameStore((state) => state.selectedTool)
  const buildings = useGameStore((state) => state.buildings)
  const placeExtractor = useGameStore((state) => state.placeExtractor)
  const [center, setCenter] = useState(() => worldToAxial(0, 0))
  const [hoveredTileKey, setHoveredTileKey] = useState<string | null>(null)
  const fillMeshRef = useRef<THREE.InstancedMesh>(null)
  const borderMeshRef = useRef<THREE.InstancedMesh>(null)
  const homeAnimationRef = useRef({
    active: false,
    startMs: 0,
    durationMs: HOME_ANIMATION_MIN_MS,
    startTarget: new THREE.Vector3(),
    endTarget: new THREE.Vector3(),
    startPosition: new THREE.Vector3(),
    endPosition: new THREE.Vector3(),
  })

  const tempObject = useMemo(() => new THREE.Object3D(), [])
  const tempColor = useMemo(() => new THREE.Color(), [])
  const resourceColors = useMemo(
    () =>
      new Map<ExtractableResource, THREE.Color>([
        ["iron", new THREE.Color(EXTRACTABLE_RESOURCE_META.iron.tileColor)],
        ["coal", new THREE.Color(EXTRACTABLE_RESOURCE_META.coal.tileColor)],
      ]),
    []
  )

  // Create geometries
  const fillGeometry = useMemo(() => {
    // When debugMode is off, scale up slightly (1.01) so adjacent hexes overlap and prevent hairline gaps
    const shape = createHexShape(debugMode ? HEX_SIZE * 0.94 : HEX_SIZE * 1.01)
    return new THREE.ExtrudeGeometry(shape, {
      depth: HEX_HEIGHT,
      bevelEnabled: false,
    })
  }, [debugMode])

  const borderGeometry = useMemo(() => {
    const shape = createHexShape(HEX_SIZE)
    return new THREE.ExtrudeGeometry(shape, {
      depth: HEX_HEIGHT,
      bevelEnabled: false,
    })
  }, [])

  const radius = useMemo(() => {
    if (!(camera instanceof THREE.OrthographicCamera)) {
      return BASE_TILE_RENDER_RADIUS + TILE_RADIUS_OVERSCAN
    }

    return getRadiusForMaxZoom(camera)
  }, [camera])

  const centerRaycaster = useMemo(() => new THREE.Raycaster(), [])
  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])
  const centerHit = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const controls = controlsRef.current
    const target = controls?.target
    if (!target) {
      return
    }

    const homeAnimation = homeAnimationRef.current
    if (homeAnimation.active) {
      const elapsedMs = performance.now() - homeAnimation.startMs
      const rawProgress = Math.min(1, elapsedMs / homeAnimation.durationMs)
      const easedProgress = 1 - (1 - rawProgress) ** 3

      target.copy(homeAnimation.startTarget).lerp(homeAnimation.endTarget, easedProgress)
      camera.position.copy(homeAnimation.startPosition).lerp(homeAnimation.endPosition, easedProgress)
      camera.updateMatrixWorld()
      controls.update()

      if (rawProgress >= 1) {
        homeAnimation.active = false
      }
    }

    centerRaycaster.setFromCamera(new THREE.Vector2(0, 0), camera)
    if (centerRaycaster.ray.intersectPlane(groundPlane, centerHit)) {
      const { q, r } = worldToAxial(centerHit.x, centerHit.z)
      setCenter((prev) => (prev.q === q && prev.r === r ? prev : { q, r, s: -q - r }))
    }
  })

  const tiles = useMemo<TileDescriptor[]>(() => {
    const renderedTiles: TileDescriptor[] = []

    for (let q = center.q - radius; q <= center.q + radius; q++) {
      for (let r = center.r - radius; r <= center.r + radius; r++) {
        if (cubeDistance(q, r, center.q, center.r) > radius) {
          continue
        }

        renderedTiles.push({ q, r, key: `${q},${r}`, resourceType: getTileResourceType(q, r) })
      }
    }

    return renderedTiles
  }, [center.q, center.r, radius])

  const contentTiles = useMemo(
    () => tiles.filter((tile) => tile.resourceType !== null || buildings.has(tile.key)),
    [tiles, buildings]
  )
  const tilesByKey = useMemo(() => new Map(tiles.map((tile) => [tile.key, tile])), [tiles])
  const hoveredTileKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (selectedTileKey !== null && !tilesByKey.has(selectedTileKey)) {
      onBuildingSelect?.(null)
    }
  }, [tilesByKey, selectedTileKey, onBuildingSelect])

  useEffect(() => {
    if (homeRequestNonce < 1) {
      return
    }

    const controls = controlsRef.current
    if (!controls) {
      return
    }

    const currentTarget = controls.target
    const homeAnimation = homeAnimationRef.current
    const worldDistance = currentTarget.length()

    homeAnimation.startTarget.copy(currentTarget)
    homeAnimation.endTarget.set(0, 0, 0)
    homeAnimation.startPosition.copy(camera.position)

    const cameraOffset = camera.position.clone().sub(currentTarget)
    homeAnimation.endPosition.copy(homeAnimation.endTarget).add(cameraOffset)

    homeAnimation.durationMs = Math.min(
      HOME_ANIMATION_MAX_MS,
      Math.max(HOME_ANIMATION_MIN_MS, worldDistance * HOME_ANIMATION_MS_PER_WORLD_UNIT)
    )
    homeAnimation.startMs = performance.now()
    homeAnimation.active = true
  }, [homeRequestNonce, controlsRef, camera])

  useEffect(() => {
    if (!debugMode) {
      onTileHover?.(null)
    }
  }, [debugMode, onTileHover])

  // Update instanced meshes
  useLayoutEffect(() => {
    const fillMesh = fillMeshRef.current
    if (!fillMesh) {
      return
    }

    for (let index = 0; index < tiles.length; index++) {
      const tile = tiles[index]
      const [x, z] = axialToWorld(tile.q, tile.r)

      // Position and rotate to lay flat
      tempObject.position.set(x, debugMode ? 0.002 : 0, z)
      tempObject.rotation.set(-Math.PI / 2, 0, 0)
      tempObject.updateMatrix()
      fillMesh.setMatrixAt(index, tempObject.matrix)

      // Set explicit per-instance color to keep tiles always readable
      const baseColor = tile.resourceType
        ? (resourceColors.get(tile.resourceType) ?? BASE_TILE_COLOR)
        : BASE_TILE_COLOR_VARIANTS[tileHash(tile.q, tile.r) % BASE_TILE_COLOR_VARIANTS.length]
      tempColor.copy(baseColor)
      fillMesh.setColorAt(index, tempColor)
    }

    fillMesh.count = tiles.length
    fillMesh.instanceMatrix.needsUpdate = true
    if (fillMesh.instanceColor) {
      fillMesh.instanceColor.needsUpdate = true
    }
    fillMesh.computeBoundingSphere()

    // Update border mesh
    const borderMesh = borderMeshRef.current
    if (!debugMode || !borderMesh) {
      return
    }

    for (let index = 0; index < tiles.length; index++) {
      const tile = tiles[index]
      const [x, z] = axialToWorld(tile.q, tile.r)
      tempObject.position.set(x, 0, z)
      tempObject.rotation.set(-Math.PI / 2, 0, 0)
      tempObject.updateMatrix()
      borderMesh.setMatrixAt(index, tempObject.matrix)
    }

    borderMesh.count = tiles.length
    borderMesh.instanceMatrix.needsUpdate = true
  }, [tiles, tempObject, tempColor, debugMode, resourceColors])

  const handleTileClick = (event: ThreeEvent<MouseEvent>) => {
    const { q, r } = worldToAxial(event.point.x, event.point.z)
    const tile = tilesByKey.get(`${q},${r}`)
    if (!tile) {
      return
    }

    if (selectedTool.type === "place" && selectedTool.object === "extractor") {
      if (!tile.resourceType || buildings.has(tile.key)) {
        return
      }

      event.stopPropagation()
      placeExtractor(tile.q, tile.r, tile.resourceType)
      onBuildingSelect?.(tile.key)
      return
    }

    const hasBuilding = buildings.has(tile.key)
    onBuildingSelect?.(hasBuilding ? tile.key : null)
  }

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()

    const { q, r } = worldToAxial(event.point.x, event.point.z)
    const key = `${q},${r}`

    if (hoveredTileKeyRef.current === key) {
      return
    }

    hoveredTileKeyRef.current = key
    setHoveredTileKey(key)

    if (!debugMode || !onTileHover) {
      return
    }

    const tile = tilesByKey.get(key)
    onTileHover(tile ?? { q, r, key, resourceType: getTileResourceType(q, r) })
  }

  const handlePointerLeave = () => {
    hoveredTileKeyRef.current = null
    setHoveredTileKey(null)
    if (debugMode) {
      onTileHover?.(null)
    }
  }

  const [centerX, centerZ] = useMemo(() => axialToWorld(center.q, center.r), [center.q, center.r])
  const interactionPlaneSize = useMemo(() => (radius + TILE_RADIUS_OVERSCAN) * HEX_SIZE * 8, [radius])

  return (
    <group>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: R3F mesh handles pointer events for world picking */}
      <mesh
        position={[centerX, HEX_HEIGHT + 0.01, centerZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={handleTileClick}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <planeGeometry args={[interactionPlaneSize, interactionPlaneSize]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {debugMode && (
        <instancedMesh ref={borderMeshRef} args={[borderGeometry, undefined, MAX_TILES]} frustumCulled={false}>
          <meshBasicMaterial color={BORDER_COLOR} />
        </instancedMesh>
      )}

      <instancedMesh ref={fillMeshRef} args={[fillGeometry, undefined, MAX_TILES]} frustumCulled={false}>
        <meshStandardMaterial toneMapped={false} />
      </instancedMesh>

      {contentTiles.map((tile) => (
        <HexTileContent
          key={tile.key}
          q={tile.q}
          r={tile.r}
          tileKey={tile.key}
          resourceType={tile.resourceType}
          showResourceTip={hoveredTileKey === tile.key && tile.resourceType !== null}
          selectedBuilding={selectedTileKey === tile.key}
          onSelectBuilding={onBuildingSelect}
        />
      ))}
    </group>
  )
}

interface GameCanvasProps {
  debugMode: boolean
  onTileHover?: (tile: TileDescriptor | null) => void
  onBuildingSelect?: (tileKey: string | null) => void
  selectedTileKey: string | null
  homeRequestNonce: number
}

export const GameCanvas = ({
  debugMode,
  onTileHover,
  onBuildingSelect,
  selectedTileKey,
  homeRequestNonce,
}: GameCanvasProps) => {
  const controlsRef = useRef<MapControlsImpl | null>(null)

  return (
    <Canvas dpr={[1, 1.75]} className="bg-slate-950" gl={{ antialias: true, powerPreference: "high-performance" }}>
      <OrthographicCamera
        makeDefault
        zoom={INITIAL_ZOOM}
        position={CAM_POS}
        near={1}
        far={300}
        up={[0, 1, 0]}
        onUpdate={(cam) => cam.lookAt(0, 0, 0)}
      />
      <MapControls
        ref={controlsRef}
        enableRotate={false}
        screenSpacePanning
        enableDamping={false}
        panSpeed={1}
        zoomSpeed={1.35}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        target={[0, 0, 0]}
        mouseButtons={{ LEFT: undefined, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
      />
      <color attach="background" args={["#e8f5e9"]} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} />
      <InfiniteHexField
        controlsRef={controlsRef}
        debugMode={debugMode}
        onTileHover={onTileHover}
        onBuildingSelect={onBuildingSelect}
        selectedTileKey={selectedTileKey}
        homeRequestNonce={homeRequestNonce}
      />
    </Canvas>
  )
}

export type { TileDescriptor }
