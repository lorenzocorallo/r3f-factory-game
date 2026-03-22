import { GiHouse } from "react-icons/gi"

const IS_DEV = import.meta.env.DEV

interface TopControlsProps {
  onGoHome: () => void
  debugMode: boolean
  setDebugMode: (mode: boolean) => void
}

export const TopControls = ({ onGoHome, debugMode, setDebugMode }: TopControlsProps) => {
  return (
    <div className="flex gap-2 pointer-events-auto">
      <button
        type="button"
        onClick={onGoHome}
        className="px-3 py-2 rounded-lg text-sm font-mono transition-all bg-slate-800/90 text-slate-200 hover:bg-slate-700 flex items-center justify-center"
        aria-label="Go home"
        title="Go home"
      >
        <GiHouse />
      </button>
      {IS_DEV && (
        <button
          type="button"
          onClick={() => setDebugMode(!debugMode)}
          className={`px-3 py-2 rounded-lg text-sm font-mono transition-all ${
            debugMode ? "bg-yellow-500 text-black" : "bg-slate-800/90 text-slate-400 hover:bg-slate-700"
          }`}
        >
          {debugMode ? "DEBUG ON" : "DEBUG"}
        </button>
      )}
    </div>
  )
}
