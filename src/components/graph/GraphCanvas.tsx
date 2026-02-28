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
import type { Node, Edge, NodeChange, EdgeChange } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { EntryNode } from './EntryNode'
import { RecursionEdge } from './RecursionEdge'
import { GraphControls } from './GraphControls'
import type { ConnectionVisibility } from './GraphControls'
import { useDerivedState, EMPTY_STORE } from '@/hooks/useDerivedState'
import { computeLayout, findCycles } from '@/services/graph-service'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import type { EntryNodeData } from './EntryNode'
import type { RecursionEdgeData } from './RecursionEdge'

const nodeTypes = { entryNode: EntryNode }
const edgeTypes = { recursionEdge: RecursionEdge }

const VISIBILITY_CYCLE: ConnectionVisibility[] = ['all', 'selected', 'none']

interface GraphCanvasInnerProps {
  tabId: string
}

function GraphCanvasInner({ tabId }: GraphCanvasInnerProps) {
  const realStore = documentStoreRegistry.get(tabId)
  const store = realStore ?? EMPTY_STORE
  const entries = store((s) => s.entries)
  const graphPositions = store((s) => s.graphPositions)
  const selectedEntryId = store((s) => s.selection.selectedEntryId)
  const { graph } = useDerivedState(tabId)
  const { fitView } = useReactFlow()

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<EntryNodeData>>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<RecursionEdgeData>>([])
  const [showBlockedEdges, setShowBlockedEdges] = useState(true)
  const [connectionVisibility, setConnectionVisibility] = useState<ConnectionVisibility>('all')
  const [edgeStyle, setEdgeStyle] = useState<'smooth' | 'straight'>('smooth')
  const didInitialFitRef = useRef(false)

  const cycleInfo = useMemo(() => {
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
  }, [graph])

  // Sync entries + positions + selection → React Flow nodes
  useEffect(() => {
    const newNodes: Node<EntryNodeData>[] = entries.map((entry) => ({
      id: entry.id,
      type: 'entryNode',
      position: graphPositions.get(entry.id) ?? { x: 0, y: 0 },
      selected: entry.id === selectedEntryId,
      data: { entry, isCyclic: cycleInfo.cycleNodeIds.has(entry.id) },
    }))
    setNodes(newNodes)
  }, [entries, graphPositions, selectedEntryId, cycleInfo, setNodes])

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
        const blocked = meta?.blockedByPreventRecursion ?? false
        const isCyclic = cycleInfo.cycleEdgeIds.has(edgeKey)
        if (!showBlockedEdges && blocked) continue
        if (
          connectionVisibility === 'selected' &&
          selectedEntryId !== sourceId &&
          selectedEntryId !== targetId
        ) {
          continue
        }
        newEdges.push({
          id: edgeKey,
          source: sourceId,
          target: targetId,
          type: 'recursionEdge',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isCyclic
              ? 'var(--edge-cycle)'
              : blocked
              ? 'var(--edge-blocked)'
              : 'var(--edge-active)',
          },
          data: { blocked, isCyclic, edgeStyle },
        })
      }
    }
    setEdges(newEdges)
  }, [graph, cycleInfo, showBlockedEdges, connectionVisibility, selectedEntryId, edgeStyle, setEdges])

  // Fit view on first load
  useEffect(() => {
    if (entries.length > 0 && !didInitialFitRef.current) {
      didInitialFitRef.current = true
      setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 150)
    }
  }, [entries.length, fitView])

  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      store.getState().setGraphPosition(node.id, { x: node.position.x, y: node.position.y })
    },
    [store],
  )

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      store.getState().selectEntry(node.id)
    },
    [store],
  )

  const handlePaneClick = useCallback(() => {
    store.getState().clearSelection()
  }, [store])

  const handleAutoLayout = useCallback(() => {
    const newPositions = computeLayout(entries, graph)
    store.setState((s) => ({ ...s, graphPositions: newPositions }))
    setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 50)
  }, [entries, graph, store, fitView])

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => { onNodesChange(changes) },
    [onNodesChange],
  )

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => { onEdgesChange(changes) },
    [onEdgesChange],
  )

  const handleCycleConnectionVisibility = useCallback(() => {
    setConnectionVisibility((v) => {
      const idx = VISIBILITY_CYCLE.indexOf(v)
      return VISIBILITY_CYCLE[(idx + 1) % VISIBILITY_CYCLE.length]
    })
  }, [])

  const handleToggleEdgeStyle = useCallback(() => {
    setEdgeStyle((v) => (v === 'smooth' ? 'straight' : 'smooth'))
  }, [])

  if (entries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
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
        onEdgesChange={handleEdgesChange}
        onNodeDragStop={handleNodeDragStop}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        fitView={false}
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#374151" gap={20} size={1} />
        <MiniMap
          nodeColor={(node) => {
            const d = node.data as EntryNodeData
            if (!d?.entry) return '#374151'
            if (!d.entry.enabled) return 'var(--node-disabled)'
            if (d.entry.constant) return 'var(--node-constant)'
            if (d.entry.selective) return 'var(--node-selective)'
            return 'var(--node-keyword)'
          }}
          maskColor="rgba(0,0,0,0.6)"
          className="!bg-gray-900 !border-gray-700"
        />
        <Controls className="!bg-gray-800 !border-gray-700 [&_button]:!bg-gray-800 [&_button]:!border-gray-600 [&_button]:!text-gray-300 [&_button:hover]:!bg-gray-700" />
        <GraphControls
          onAutoLayout={handleAutoLayout}
          showBlockedEdges={showBlockedEdges}
          onToggleBlockedEdges={() => setShowBlockedEdges((v) => !v)}
          connectionVisibility={connectionVisibility}
          onCycleConnectionVisibility={handleCycleConnectionVisibility}
          edgeStyle={edgeStyle}
          onToggleEdgeStyle={handleToggleEdgeStyle}
        />
      </ReactFlow>
    </div>
  )
}

interface GraphCanvasProps {
  tabId: string
}

export function GraphCanvas({ tabId }: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner tabId={tabId} />
    </ReactFlowProvider>
  )
}
