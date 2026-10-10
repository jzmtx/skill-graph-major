"use client";

import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import { GitGraph, RefreshCw } from "lucide-react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// ─── Custom Nodes ─────────────────────────────────────────────────────────────
const OccupationNode = ({ data }: { data: any }) => (
  <div className="px-4 py-2 rounded-xl bg-stone-900 text-white border-2 border-stone-800 min-w-[150px] text-center shadow-sm relative">
    <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-stone-700 !border-none" />
    <div className="text-[9px] font-bold uppercase tracking-wider text-stone-300 mb-0.5">Career Role</div>
    <div className="text-xs font-bold text-white">{data.label}</div>
    <Handle type="target" position={Position.Top} className="w-2 h-2 bg-stone-700 !border-none" />
  </div>
);

const SkillNode = ({ data }: { data: any }) => {
  const isFoundation = data.difficulty === "foundation";
  const isAdvanced = data.difficulty === "advanced";
  
  const styles = isFoundation 
    ? "bg-white border border-stone-300 text-stone-800" 
    : isAdvanced 
      ? "bg-emerald-50 border-2 border-emerald-800 text-emerald-950"
      : "bg-white border-2 border-emerald-700 text-stone-900";

  return (
    <div className={`px-3.5 py-2 rounded-xl shadow-xs ${styles} min-w-[130px] text-center`}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 !border-none bg-emerald-800" />
      <div className="text-[9px] font-bold uppercase tracking-wider mb-0.5 text-stone-500">
        {data.difficulty || "Core"}
      </div>
      <div className="text-xs font-bold">{data.label}</div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !border-none bg-emerald-800" />
    </div>
  );
};

const nodeTypes = {
  occupation: OccupationNode,
  skill: SkillNode,
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function KnowledgeGraphPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState("");
  const [stats, setStats] = useState({ techs: 0, nodes: 0, edges: 0, occupations: 0 });

  useEffect(() => {
    loadGraph();
  }, []);

  const loadGraph = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await adminApi.getGraphData();

      const techs = data.technologies || [];
      const lnodes = data.nodes || [];
      const dbEdges = data.edges || [];
      const occupations = data.occupations || [];
      const occSkills = data.occupation_skills || [];

      setStats({
        techs: techs.length,
        nodes: lnodes.length,
        edges: dbEdges.length + occSkills.length,
        occupations: occupations.length,
      });

      const rfNodes: any[] = [];
      const rfEdges: any[] = [];

      const cx = 500, cy = 500;

      // 1. Occupations (Outer Ring)
      occupations.forEach((o: any, i: number) => {
        const angle = (i / Math.max(1, occupations.length)) * 2 * Math.PI;
        const r = 600;
        rfNodes.push({
          id: `occ_${o.id}`,
          type: "occupation",
          position: { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r },
          data: { label: o.title }
        });
      });

      // 2. Learning Nodes (Inner Rings by Difficulty)
      const diffOrder = ["foundation", "core", "advanced"];
      const byDiff: Record<string, any[]> = { foundation: [], core: [], advanced: [] };
      lnodes.forEach((n: any) => (byDiff[n.difficulty_level] || byDiff.core).push(n));

      diffOrder.forEach((diff, tier) => {
        const group = byDiff[diff];
        const r = 150 + tier * 150;
        group.forEach((n: any, i: number) => {
          const angle = (i / Math.max(group.length, 1)) * 2 * Math.PI;
          rfNodes.push({
            id: `node_${n.id}`,
            type: "skill",
            position: { 
              x: cx + Math.cos(angle) * r + (Math.random() - 0.5) * 50, 
              y: cy + Math.sin(angle) * r + (Math.random() - 0.5) * 50 
            },
            data: { label: n.concept_name, difficulty: n.difficulty_level, techId: n.technology_id }
          });
        });
      });

      // 3. Edges
      dbEdges.forEach((e: any) => {
        rfEdges.push({
          id: `e_${e.prerequisite_node_id}_${e.node_id}`,
          source: `node_${e.prerequisite_node_id}`,
          target: `node_${e.node_id}`,
          animated: true,
          style: { stroke: "#166534", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#166534" }
        });
      });

      // 4. Occupation to Tech mappings
      const techToNodes = new Map<string, string[]>();
      lnodes.forEach((n: any) => {
        if (!techToNodes.has(n.technology_id)) techToNodes.set(n.technology_id, []);
        techToNodes.get(n.technology_id)!.push(`node_${n.id}`);
      });

      occSkills.forEach((os: any) => {
        const linkedNodes = techToNodes.get(os.skill_id) || [];
        linkedNodes.forEach(nid => {
          rfEdges.push({
            id: `e_occ_${os.occupation_id}_${nid}`,
            source: `occ_${os.occupation_id}`,
            target: nid,
            style: { stroke: "#a16207", strokeWidth: 1.5, strokeDasharray: "4 4" },
          });
        });
      });

      setNodes(rfNodes);
      setEdges(rfEdges);
      setLoading(false);
    } catch {
      setError("Failed to load graph data.");
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-stone-50 font-sans overflow-hidden text-stone-900">
      {/* Header */}
      <div className="p-4 border-b border-stone-200 bg-white flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg text-emerald-800 border border-emerald-200">
            <GitGraph className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-stone-900 leading-tight">Knowledge Graph Ontology</h1>
            <p className="text-stone-500 text-xs">Interactive graph model of concepts, prerequisites, and competency nodes</p>
          </div>
        </div>
        <button
          onClick={loadGraph}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold transition-colors border border-stone-200 shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Recompute Topology
        </button>
      </div>

      {/* Stats Row */}
      <div className="px-4 py-2.5 border-b border-stone-200 flex gap-3 shrink-0 bg-stone-100/70">
        {[
          { label: "Technologies", value: stats.techs, color: "text-stone-800" },
          { label: "Concept Nodes", value: stats.nodes, color: "text-emerald-800" },
          { label: "Prerequisite Edges", value: stats.edges, color: "text-stone-700" },
          { label: "Career Occupations", value: stats.occupations, color: "text-amber-800" },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2 px-2.5 py-1 bg-white border border-stone-200 rounded-md text-xs shadow-xs">
            <span className={`font-bold ${s.color}`}>{s.value}</span>
            <span className="text-stone-500 text-[11px] font-medium">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Canvas */}
      <div className="flex-1 relative bg-stone-100">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-50/80 z-10">
            <div className="w-8 h-8 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          className="bg-stone-100"
          colorMode="light"
        >
          <Background color="#E7E5E4" gap={20} size={1} />
          <Controls className="bg-white border-stone-300 fill-stone-700 shadow-xs" />
          <MiniMap 
            nodeColor={(node) => {
              if (node.type === 'occupation') return '#292524';
              if (node.data?.difficulty === 'advanced') return '#166534';
              return '#a8a29e';
            }}
            maskColor="rgba(245, 245, 244, 0.7)"
            className="bg-white border border-stone-200 rounded-lg shadow-xs"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
