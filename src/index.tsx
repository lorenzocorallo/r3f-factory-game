import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./global.css"
import { Game } from "./game"

// biome-ignore lint/style/noNonNullAssertion: react setup
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Game />
  </StrictMode>
)
