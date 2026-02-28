export function WorkspaceShell() {
  return (
    <div className="flex flex-col h-screen w-screen bg-gray-950 text-gray-100">
      {/* Header / menu bar */}
      <header className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-indigo-400">Lorewalker</span>
          <span className="text-xs text-gray-500">Lorebook Editor</span>
        </div>
      </header>

      {/* Tab bar */}
      <div className="flex items-center px-2 bg-gray-900 border-b border-gray-800 shrink-0 h-9">
        <span className="text-xs text-gray-500 px-2">No file open</span>
      </div>

      {/* Main workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: entry list */}
        <aside className="w-64 shrink-0 border-r border-gray-800 bg-gray-950 flex flex-col">
          <div className="p-3 border-b border-gray-800">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Entries</span>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-gray-600">Open a lorebook to get started</p>
          </div>
        </aside>

        {/* Center panel: graph canvas */}
        <main className="flex-1 bg-gray-950 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="text-4xl text-gray-700">⬡</div>
            <p className="text-sm text-gray-500">Drag a SillyTavern JSON file here</p>
            <p className="text-xs text-gray-600">or use File → Open</p>
          </div>
        </main>

        {/* Right panel: editor / analysis / simulator */}
        <aside className="w-80 shrink-0 border-l border-gray-800 bg-gray-950 flex flex-col">
          <div className="p-3 border-b border-gray-800">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Inspector</span>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-gray-600">Select an entry to inspect</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
