import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./global.css"

// biome-ignore lint/style/noNonNullAssertion: react setup
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="bg-black text-white mx-10 my-3">Hello</div>
  </StrictMode>
)
