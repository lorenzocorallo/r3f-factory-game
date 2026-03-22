import { Text } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { useRef } from "react"
import type * as THREE from "three"

export const FloatingText = ({ text }: { text: string }) => {
  const textRef = useRef<THREE.Group>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame((_, delta) => {
    if (textRef.current && materialRef.current) {
      textRef.current.position.y += delta * 2 // Sale verso l'alto
      materialRef.current.opacity = Math.max(0, materialRef.current.opacity - delta) // Dissolvenza
    }
  })

  return (
    <Text ref={textRef} position={[0, 1.5, 0]} fontSize={0.6} color="#4ade80">
      <meshBasicMaterial ref={materialRef} transparent opacity={1} />
      {text}
    </Text>
  )
}
