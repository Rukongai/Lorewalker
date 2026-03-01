import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  MarkerType,
  ReactFlowProvider,
} from '@xyflow/react'
import type { Node, Edge, NodeChange, EdgeChange, Connection } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { EntryNode } from './EntryNode'
import { RecursionEdge } from './RecursionEdge'
import { GraphControls } from './GraphControls'
import type { ConnectionVisibility } from './GraphControls'
import { GraphAddButton } from './GraphAddButton'
import { EdgeConnectDialog } from './EdgeConnectDialog'
import { useDerivedState, EMPTY_STORE } from '@/hooks/useDerivedState'
import { computeLayout, findCycles } from '@/services/graph-service'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { addKeywordMention, removeKeywordMention } from '@/lib/edge-edit'
import type { EntryNodeData, EntryNodeType } from './EntryNode'
import type { RecursionEdgeData, RecursionEdgeType } from './RecursionEdge'
import type { FindingSeverity } from '@/types'

const nodeTypes = { entryNode: EntryNode }
const edgeTypes = { recursionEdge: RecursionEdge }

const VISIBILITY_CYCLE: ConnectionVisibility[] = ['all', 'selected', 'none']

interface GraphCanvasInnerProps {
  tabId: string
  onNodeDoubleClick?: (entryId: string) => void
  onAddEntry?: () => void
}

function GraphCanvasInner({ tabId, onNodeDoubleClick, onAddEntry }: GraphCanvasInnerProps) {
  const graphSettings = useWorkspaceStore((s) => s.graphSettings)
  const checkRecursionLoops = useWorkspaceStore((s) => s.checkRecursionLoops)
  const theme = useWorkspaceStore((s) => s.theme)
  const isLightTheme =
    theme === 'catppuccin-latte' ||
    theme === 'nord-aurora' ||
    theme === 'rose-pine-dawn' ||
    theme === 'tokyo-night-day'
  const reactFlowColorMode = isLightTheme ? 'light' : 'dark'
  const realStore = documentStoreRegistry.get(tabId)
  const store = realStore ?? EMPTY_STORE
  const entries = store((s) => s.entries)
  const graphPositions = store((s) => s.graphPositions)
  const selectedEntryId = store((s) => s.selection.selectedEntryId)
  const findings = store((s) => s.findings)
  const lastResult = store((s) => s.simulatorState.lastResult)
  const { graph } = useDerivedState(tabId)

  // Graph search
  const [searchQuery, setSearchQuery] = useState('')

  // Context menu for right-click
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; flowX: number; flowY: number } | null>(null)

  // Edge connect dialog
  const [pendingConnect, setPendingConnect] = useState<{ sourceId: string; targetId: string } | null>(null)

  // Compute worst severity per entry for health dots
  const SEVERITY_RANK: Record<FindingSeverity, number> = { error: 2, warning: 1, suggestion: 0 }
  const entryWorstSeverity = useMemo(() => {
    const map = new Map<string, FindingSeverity>()
    for (const finding of findings) {
      for (const id of finding.entryIds) {
        const current = map.get(id)
        if (!current || SEVERITY_RANK[finding.severity] > SEVERITY_RANK[current]) {
          map.set(id, finding.severity)
        }
      }
    }
    return map
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findings])

  // Compute activation status map from lastResult
  const activationStatusMap = useMemo(() => {
    const map = new Map<string, 'activated-constant' | 'activated-keyword' | 'activated-recursion' | 'skipped'>()
    if (!lastResult) return map
    for (const ae of lastResult.activatedEntries) {
      map.set(ae.entryId, `activated-${ae.activatedBy}` as 'activated-constant' | 'activated-keyword' | 'activated-recursion')
    }
    for (const se of lastResult.skippedEntries) {
      if (!map.has(se.entryId)) map.set(se.entryId, 'skipped')
    }
    return map
  }, [lastResult])

  // Compute matched IDs for search
  const matchedIds = useMemo(() => {
    if (!searchQuery.trim()) return null
    const q = searchQuery.toLowerCase()
    const ids = new Set<string>()
    for (const e of entries) {
      if (
        e.name.toLowerCase().includes(q) ||
        e.content.toLowerCase().includes(q) ||
        e.keys.some((k) => k.toLowerCase().includes(q))
      ) {
        ids.add(e.id)
      }
    }
    return ids
  }, [entries, searchQuery])

  const { fitView, getNode, setCenter } = useReactFlow()

  const graphDisplayDefaults = useWorkspaceStore((s) => s.graphDisplayDefaults)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<EntryNodeData>>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<RecursionEdgeData>>([])
  const [showBlockedEdges, setShowBlockedEdges] = useState(graphDisplayDefaults.showBlockedEdges)
  const [connectionVisibility, setConnectionVisibility] = useState<ConnectionVisibility>(
    graphDisplayDefaults.connectionVisibility,
  )
  const [edgeStyle, setEdgeStyle] = useState<'bezier' | 'straight' | 'smoothstep'>(
    graphDisplayDefaults.edgeStyle,
  )
  const didInitialFitRef = useRef(false)
  const lastClickRef = useRef<{ id: string; time: number } | null>(null)

  const cycleInfo = useMemo(() => {
    if (!checkRecursionLoops) return { cycleNodeIds: new Set<string>(), cycleEdgeIds: new Set<string>() }
    const result = findCycles(graph)
    const cycleNodeIds = new Set<string>()
    const cycleEdgeIds = new Set<string>()
    for (const cycle of result.cycles) {
      for (let i = 0; i < cycle.length; i++) {
        cycleNodeIds.add(cycle[i])
        const nextId = cycle[(i + 1) % cycle.length]
        cycleEdgeIds.add(`${cycle[i]}\u2192${nextId}`)
      }
    }
    return { cycleNodeIds, cycleEdgeIds }
  }, [graph, checkRecursionLoops])

  // Activated entry IDs set for edge highlighting
  const activatedEntryIds = useMemo(() => {
    if (!lastResult) return new Set<string>()
    return new Set(lastResult.activatedEntries.map((ae) => ae.entryId))
  }, [lastResult])

  // Sync entries + positions + selection → React Flow nodes
  useEffect(() => {
    const newNodes: Node<EntryNodeData>[] = entries.map((entry) => ({
      id: entry.id,
      type: 'entryNode',
      position: graphPositions.get(entry.id) ?? { x: 0, y: 0 },
      selected: entry.id === selectedEntryId,
      data: {
        entry,
        isCyclic: cycleInfo.cycleNodeIds.has(entry.id),
        edgeDirection: graphSettings.edgeDirection,
        severity: entryWorstSeverity.get(entry.id) ?? null,
        activationStatus: activationStatusMap.get(entry.id) ?? null,
        isDimmed: matchedIds !== null && !matchedIds.has(entry.id),
      },
    }))
    setNodes(newNodes)
  }, [entries, graphPositions, selectedEntryId, cycleInfo, graphSettings, entryWorstSeverity, activationStatusMap, matchedIds, setNodes])

  // Sync graph → React Flow edges
  useEffect(() => {
    if (connectionVisibility === 'none') {
      setEdges([])
      return
    }

    const newEdges: Edge<RecursionEdgeData>[] = []
    for (const [sourceId, targets] of graph.edges) {
      for (const targetId of targets) {
        const edgeKey = `${sourceId}\u2192${targetId}`
        const meta = graph.edgeMeta.get(edgeKey)
        const blocked = (meta?.blockedByPreventRecursion ?? false) || (meta?.blockedByExcludeRecursion ?? false)
        const isCyclic = cycleInfo.cycleEdgeIds.has(edgeKey)
        const isActivated = activatedEntryIds.has(sourceId) && activatedEntryIds.has(targetId)
        if (!showBlockedEdges && blocked) continue
        if (
          connectionVisibility === 'selected' &&
          selectedEntryId !== sourceId &&
          selectedEntryId !== targetId
        ) {
          continue
        }
        const isIncoming = selectedEntryId != null && selectedEntryId === targetId

        const markerColor = isActivated
          ? 'var(--color-ctp-yellow)'
          : isCyclic
          ? 'var(--edge-cycle)'
          : blocked
          ? 'var(--edge-blocked)'
          : isIncoming
          ? 'var(--edge-incoming)'
          : 'var(--edge-active)'

        newEdges.push({
          id: edgeKey,
          source: sourceId,
          target: targetId,
          type: 'recursionEdge',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: markerColor,
          },
          data: { blocked, isCyclic, isIncoming, isActivated, edgeStyle },
        })
      }
    }
    setEdges(newEdges)
  }, [graph, cycleInfo, showBlockedEdges, connectionVisibility, selectedEntryId, edgeStyle, activatedEntryIds, setEdges])

  // Fit view on first load — wait until positions are computed for all entries
  useEffect(() => {
    if (entries.length > 0 && graphPositions.size >= entries.length && !didInitialFitRef.current) {
      didInitialFitRef.current = true
      setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 50)
    }
  }, [entries.length, graphPositions.size, fitView])

  // Navigate to selected node when selection changes
  useEffect(() => {
    if (!selectedEntryId) return
    const timer = setTimeout(() => {
      const node = getNode(selectedEntryId)
      if (!node) return
      const x = node.position.x + (node.measured?.width ?? 180) / 2
      const y = node.position.y + (node.measured?.height ?? 60) / 2
      setCenter(x, y, { duration: 400, zoom: 1.2 })
    }, 50)
    return () => clearTimeout(timer)
  }, [selectedEntryId, getNode, setCenter])

  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      store.getState().setGraphPosition(node.id, { x: node.position.x, y: node.position.y })
    },
    [store],
  )

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      store.getState().selectEntry(node.id)
      const now = Date.now()
      if (
        lastClickRef.current &&
        lastClickRef.current.id === node.id &&
        now - lastClickRef.current.time < 300
      ) {
        onNodeDoubleClick?.(node.id)
        lastClickRef.current = null
      } else {
        lastClickRef.current = { id: node.id, time: now }
      }
    },
    [store, onNodeDoubleClick],
  )

  const handlePaneClick = useCallback(() => {
    store.getState().clearSelection()
    setContextMenu(null)
  }, [store])

  const handleAutoLayout = useCallback(() => {
    const newPositions = computeLayout(entries, graph, undefined, graphSettings)
    store.setState((s) => ({ ...s, graphPositions: newPositions }))
    setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 50)
  }, [entries, graph, graphSettings, store, fitView])

  const handleNodesDelete = useCallback(
    (deleted: Node[]) => {
      deleted.forEach((node) => store.getState().removeEntry(node.id))
    },
    [store],
  )

  const handleEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      for (const edge of deletedEdges) {
        const meta = graph.edgeMeta.get(`${edge.source}\u2192${edge.target}`)
        if (!meta) continue
        const sourceEntry = entries.find((e) => e.id === edge.source)
        if (!sourceEntry) continue
        const keyword = meta.matchedKeywords[0]
        if (keyword) {
          const newContent = removeKeywordMention(sourceEntry.content, keyword)
          store.getState().updateEntry(edge.source, { content: newContent })
        }
      }
    },
    [graph, entries, store],
  )

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      const targetEntry = entries.find((e) => e.id === connection.target)
      if (!targetEntry || targetEntry.keys.length === 0) return
      setPendingConnect({ sourceId: connection.source, targetId: connection.target })
    },
    [entries],
  )

  const handlePaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
    event.preventDefault()
    const target = event.currentTarget as HTMLElement | null
    const bounds = target?.getBoundingClientRect() ?? { left: 0, top: 0 }
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      flowX: event.clientX - bounds.left,
      flowY: event.clientY - bounds.top,
    })
  }, [])

  const handleContextMenuAddEntry = useCallback(() => {
    if (!contextMenu) return
    const id = store.getState().addEntry()
    store.getState().setGraphPosition(id, { x: contextMenu.flowX, y: contextMenu.flowY })
    store.getState().selectEntry(id)
    setContextMenu(null)
    onAddEntry?.()
  }, [store, contextMenu, onAddEntry])

  const handleNodesChange = useCallback(
    (changes: NodeChange<EntryNodeType>[]) => { onNodesChange(changes) },
    [onNodesChange],
  )

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<RecursionEdgeType>[]) => { onEdgesChange(changes) },
    [onEdgesChange],
  )

  const handleCycleConnectionVisibility = useCallback(() => {
    setConnectionVisibility((v) => {
      const idx = VISIBILITY_CYCLE.indexOf(v)
      return VISIBILITY_CYCLE[(idx + 1) % VISIBILITY_CYCLE.length]
    })
  }, [])

  const handleToggleEdgeStyle = useCallback(() => {
    setEdgeStyle((v) => {
      if (v === 'bezier') return 'straight'
      if (v === 'straight') return 'smoothstep'
      return 'bezier'
    })
  }, [])

  const handleAddEntry = useCallback(() => {
    const id = store.getState().addEntry()
    store.getState().selectEntry(id)
    onAddEntry?.()
  }, [store, onAddEntry])

  if (entries.length === 0) {
    return (
      <div className="relative flex-1 flex items-center justify-center text-ctp-overlay1 text-sm">
        <GraphAddButton onAdd={handleAddEntry} disabled={!realStore} />
        No entries to display
      </div>
    )
  }

  return (
    <div className="relative flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onNodesDelete={handleNodesDelete}
        onEdgesChange={handleEdgesChange}
        onEdgesDelete={handleEdgesDelete}
        onConnect={handleConnect}
        deleteKeyCode={['Delete', 'Backspace']}
        onNodeDragStop={handleNodeDragStop}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onPaneContextMenu={handlePaneContextMenu}
        fitView={false}
        colorMode={reactFlowColorMode}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--color-ctp-surface1)" gap={20} size={1} />
        <MiniMap
          nodeColor={(node) => {
            const d = node.data as EntryNodeData
            if (!d?.entry) return '#374151'
            if (!d.entry.enabled) return 'var(--node-disabled)'
            if (d.entry.constant) return 'var(--node-constant)'
            if (d.entry.selective) return 'var(--node-selective)'
            return 'var(--node-keyword)'
          }}
          maskColor={isLightTheme ? 'rgba(239,241,245,0.7)' : 'rgba(0,0,0,0.6)'}
          className={`!bg-ctp-mantle !border-ctp-surface1${isLightTheme ? ' shadow-md' : ''}`}
          pannable
          zoomable
        />
        <Controls className="!bg-ctp-surface0 !border-ctp-surface1 [&_button]:!bg-ctp-surface0 [&_button]:!border-ctp-overlay0 [&_button]:!text-ctp-subtext0 [&_button:hover]:!bg-ctp-surface1" />
        <GraphAddButton onAdd={handleAddEntry} />
        <GraphControls
          onAutoLayout={handleAutoLayout}
          showBlockedEdges={showBlockedEdges}
          onToggleBlockedEdges={() => setShowBlockedEdges((v) => !v)}
          connectionVisibility={connectionVisibility}
          onCycleConnectionVisibility={handleCycleConnectionVisibility}
          edgeStyle={edgeStyle}
          onToggleEdgeStyle={handleToggleEdgeStyle}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </ReactFlow>

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-ctp-surface0 border border-ctp-surface1 rounded shadow-lg py-1 text-xs"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={handleContextMenuAddEntry}
            className="w-full px-3 py-1.5 text-left text-ctp-subtext1 hover:bg-ctp-surface1 hover:text-ctp-text transition-colors"
          >
            Add entry here
          </button>
        </div>
      )}

      {/* Edge connect dialog */}
      {pendingConnect && (
        <EdgeConnectDialog
          sourceId={pendingConnect.sourceId}
          targetId={pendingConnect.targetId}
          entries={entries}
          onConfirm={(keyword) => {
            const sourceEntry = entries.find((e) => e.id === pendingConnect.sourceId)
            if (sourceEntry) {
              const newContent = addKeywordMention(sourceEntry.content, keyword)
              store.getState().updateEntry(pendingConnect.sourceId, { content: newContent })
            }
            setPendingConnect(null)
          }}
          onCancel={() => setPendingConnect(null)}
        />
      )}
    </div>
  )
}

interface GraphCanvasProps {
  tabId: string
  onNodeDoubleClick?: (entryId: string) => void
  onAddEntry?: () => void
}

export function GraphCanvas({ tabId, onNodeDoubleClick, onAddEntry }: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner tabId={tabId} onNodeDoubleClick={onNodeDoubleClick} onAddEntry={onAddEntry} />
    </ReactFlowProvider>
  )
}
