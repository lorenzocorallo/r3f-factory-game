import { useGameStore } from "../../../store/game"

export const BuildMenu = () => {
  const { resetTool, selectedTool, setTool } = useGameStore()

  return (
    <div className="self-center bg-slate-800/90 p-2 rounded-2xl shadow-2xl flex gap-2 pointer-events-auto border-b-4 border-slate-950">
      <button
        type="button"
        onClick={resetTool}
        className={`px-6 py-4 rounded-xl font-bold transition-all ${selectedTool.type === "cursor" ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
      >
        Seleziona
      </button>
      <button
        type="button"
        onClick={() => setTool({ type: "place", object: "extractor" })}
        className={`px-6 py-4 rounded-xl font-bold transition-all flex flex-col items-center ${selectedTool.type === "place" && selectedTool.object === "extractor" ? "bg-orange-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
      >
        <span>Estrattore</span>
        <span className="text-xs font-mono opacity-70 mt-1">On resource tiles</span>
      </button>
    </div>
  )
}
