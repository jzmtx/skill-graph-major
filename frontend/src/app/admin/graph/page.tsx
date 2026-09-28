"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { adminApi } from "@/lib/adminApi";
import { GitGraph, RefreshCw, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
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
  <div className="px-4 py-2 shadow-xl shadow-amber-500/20 rounded-xl bg-slate-900 border-2 border-amber-500 min-w-[150px] text-center relative group">
    <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-amber-500 !border-none" />
    <div className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">Career Role</div>
    <div className="text-sm font-bold text-white">{data.label}</div>
    <Handle type="target" position={Position.Top} className="w-2 h-2 bg-amber-500 !border-none" />
  </div>
);

const SkillNode = ({ data }: { data: any }) => {
  const isFoundation = data.difficulty === "foundation";
  const isAdvanced = data.difficulty === "advanced";
  
  const colors = isFoundation 
    ? { border: "border-cyan-500", text: "text-cyan-400", bg: "bg-cyan-500/10 shadow-cyan-500/20" } 
    : isAdvanced 
      ? { border: "border-pink-500", text: "text-pink-400", bg: "bg-pink-500/10 shadow-pink-500/20" }
      : { border: "border-indigo-500", text: "text-indigo-400", bg: "bg-indigo-500/10 shadow-indigo-500/20" };

  return (
    <div className={`px-4 py-2 shadow-lg rounded-xl bg-slate-900 border ${colors.border} min-w-[130px] text-center`}>
      <Handle type="target" position={Position.Top} className={`w-2 h-2 !border-none ${isFoundation ? "bg-cyan-500" : isAdvanced ? "bg-pink-500" : "bg-indigo-500"}`} />
      <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${colors.text}`}>
        {data.difficulty || "Core"}
      </div>
      <div className="text-sm font-bold text-white">{data.label}</div>
      <Handle type="source" position={Position.Bottom} className={`w-2 h-2 !border-none ${isFoundation ? "bg-cyan-500" : isAdvanced ? "bg-pink-500" : "bg-indigo-500"}`} />
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
  const [error, setError] = useState("");
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
        const angle = (i / occupations.length) * 2 * Math.PI;
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
          style: { stroke: "#818cf8", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#818cf8" }
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
            style: { stroke: "#f59e0b", strokeWidth: 1.5, strokeDasharray: "5 5" },
          });
        });
      });

      setNodes(rfNodes);
      setEdges(rfEdges);
      setLoading(false);
    } catch (e: any) {
      setError("Failed to load graph data.");
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/15 rounded-xl">
            <GitGraph className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Knowledge Graph Explorer</h1>
            <p className="text-slate-400 text-sm">Visual map of all technologies, learning nodes, and prerequisites</p>
          </div>
        </div>
        <button
          onClick={loadGraph}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm transition-all"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats Row */}
      <div className="px-5 py-3 border-b border-slate-800 flex gap-4 shrink-0 bg-slate-900/50">
        {[
          { label: "Technologies", value: stats.techs, color: "text-slate-400", bg: "bg-slate-800" },
          { label: "Learning Nodes", value: stats.nodes, color: "text-indigo-400", bg: "bg-indigo-500/10" },
          { label: "Prerequisite Edges", value: stats.edges, color: "text-purple-400", bg: "bg-purple-500/10" },
          { label: "Career Roles", value: stats.occupations, color: "text-amber-400", bg: "bg-amber-500/10" },
        ].map(s => (
          <div key={s.label} className={`flex items-center gap-2 px-3 py-1.5 ${s.bg} rounded-lg`}>
            <span className={`text-lg font-bold ${s.color}`}>{s.value}</span>
            <span className="text-slate-400 text-xs">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 z-10">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          className="bg-slate-950"
          colorMode="dark"
        >
          <Background color="#1e293b" gap={20} size={1} />
          <Controls className="bg-slate-900 border-slate-800 fill-slate-300" />
          <MiniMap 
            nodeColor={(node) => {
              if (node.type === 'occupation') return '#f59e0b';
              if (node.data?.difficulty === 'foundation') return '#06b6d4';
              if (node.data?.difficulty === 'advanced') return '#ec4899';
              return '#6366f1';
            }}
            maskColor="rgba(15, 23, 42, 0.7)"
            className="bg-slate-900 border border-slate-800 rounded-xl"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
