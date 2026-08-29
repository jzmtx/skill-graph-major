"use client";

import React, { useMemo } from "react";
import { Database, Key, LayoutTemplate } from "lucide-react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  MarkerType,
  Handle,
  Position
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// ─── Custom Table Node ──────────────────────────────────────────────────────
const TableNode = ({ data }: { data: any }) => {
  return (
    <div className="bg-slate-900 border border-slate-700 shadow-2xl rounded-xl overflow-hidden min-w-[280px]">
      <Handle type="target" position={Position.Top} className="opacity-0" />
      
      {/* Table Header */}
      <div className={`px-4 py-3 flex items-center justify-between border-b border-slate-800 ${data.headerBg || 'bg-indigo-600'}`}>
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-white" />
          <span className="font-bold text-white tracking-wide">{data.tableName}</span>
        </div>
      </div>

      {/* Columns */}
      <div className="flex flex-col divide-y divide-slate-800/50">
        {data.columns.map((col: any, idx: number) => (
          <div key={col.name} className="flex items-center justify-between px-4 py-2 hover:bg-slate-800/30 transition-colors relative">
            
            {/* Edge Handles attached to specific columns */}
            {col.targetHandle && (
              <Handle type="target" id={col.name} position={Position.Left} className="w-2 h-2 bg-indigo-500 !-left-1" />
            )}
            
            <div className="flex items-center gap-2">
              {col.isPk && <Key className="w-3.5 h-3.5 text-amber-500" />}
              {col.isFk && <LinkIcon className="w-3.5 h-3.5 text-indigo-400" />}
              {!col.isPk && !col.isFk && <span className="w-3.5" />}
              
              <span className={`text-sm font-medium ${col.isPk ? 'text-amber-100' : 'text-slate-200'}`}>
                {col.name}
              </span>
            </div>
            
            <span className="text-[10px] text-slate-500 font-mono">
              {col.type}
            </span>

            {col.sourceHandle && (
              <Handle type="source" id={col.name} position={Position.Right} className="w-2 h-2 bg-indigo-500 !-right-1" />
            )}
          </div>
        ))}
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
};

// Small helper for Link Icon to avoid importing generic link above
const LinkIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
  </svg>
)

const nodeTypes = {
  table: TableNode,
};

// ─── Initial Schema Data ──────────────────────────────────────────────────────
const initialNodes = [
  {
    id: "canonical_skills",
    type: "table",
    position: { x: 500, y: 100 },
    data: {
      tableName: "canonical_skills",
      headerBg: "bg-indigo-600",
      columns: [
        { name: "id", type: "UUID", isPk: true, sourceHandle: true },
        { name: "title", type: "TEXT" },
        { name: "slug", type: "TEXT", isUnique: true },
        { name: "category", type: "TEXT" },
        { name: "created_at", type: "TIMESTAMP" },
      ]
    }
  },
  {
    id: "skill_resources",
    type: "table",
    position: { x: 900, y: 150 },
    data: {
      tableName: "skill_resources",
      headerBg: "bg-emerald-600",
      columns: [
        { name: "id", type: "UUID", isPk: true },
        { name: "skill_id", type: "UUID", isFk: true, targetHandle: true },
        { name: "official_docs_url", type: "TEXT" },
        { name: "best_video_url", type: "TEXT" },
        { name: "practice_project", type: "TEXT" },
        { name: "sub_topics", type: "JSONB" },
        { name: "status", type: "TEXT" },
        { name: "confidence_score", type: "FLOAT" },
      ]
    }
  },
  {
    id: "learning_nodes",
    type: "table",
    position: { x: 500, y: 450 },
    data: {
      tableName: "learning_nodes",
      headerBg: "bg-blue-600",
      columns: [
        { name: "id", type: "UUID", isPk: true, sourceHandle: true },
        { name: "technology_id", type: "UUID", isFk: true, targetHandle: true },
        { name: "concept_name", type: "TEXT" },
        { name: "difficulty_level", type: "TEXT" },
        { name: "estimated_days", type: "INT" },
      ]
    }
  },
  {
    id: "node_prerequisites",
    type: "table",
    position: { x: 100, y: 450 },
    data: {
      tableName: "node_prerequisites",
      headerBg: "bg-slate-600",
      columns: [
        { name: "node_id", type: "UUID", isFk: true, targetHandle: true },
        { name: "prerequisite_node_id", type: "UUID", isFk: true },
      ]
    }
  },
  {
    id: "occupations",
    type: "table",
    position: { x: 100, y: 100 },
    data: {
      tableName: "occupations",
      headerBg: "bg-amber-600",
      columns: [
        { name: "id", type: "UUID", isPk: true, sourceHandle: true },
        { name: "title", type: "TEXT" },
        { name: "ecosystem", type: "TEXT" },
      ]
    }
  },
  {
    id: "occupation_skills",
    type: "table",
    position: { x: 100, y: 250 },
    data: {
      tableName: "occupation_skills",
      headerBg: "bg-orange-600",
      columns: [
        { name: "occupation_id", type: "UUID", isFk: true, targetHandle: true },
        { name: "skill_id", type: "UUID", isFk: true, sourceHandle: true },
        { name: "is_core", type: "BOOLEAN" },
      ]
    }
  },
  {
    id: "roadmaps",
    type: "table",
    position: { x: 900, y: 450 },
    data: {
      tableName: "roadmaps",
      headerBg: "bg-purple-600",
      columns: [
        { name: "id", type: "UUID", isPk: true },
        { name: "student_id", type: "UUID" },
        { name: "role_name", type: "TEXT" },
        { name: "ecosystem", type: "TEXT" },
        { name: "roadmap_json", type: "JSONB" },
      ]
    }
  }
];

const initialEdges = [
  {
    id: "fk_skill_resources_skill",
    source: "canonical_skills",
    sourceHandle: "id",
    target: "skill_resources",
    targetHandle: "skill_id",
    type: "smoothstep",
    animated: true,
    style: { stroke: "#10b981", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" }
  },
  {
    id: "fk_learning_nodes_tech",
    source: "canonical_skills",
    sourceHandle: "id",
    target: "learning_nodes",
    targetHandle: "technology_id",
    type: "smoothstep",
    style: { stroke: "#6366f1", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1" }
  },
  {
    id: "fk_occ_skills_occ",
    source: "occupations",
    sourceHandle: "id",
    target: "occupation_skills",
    targetHandle: "occupation_id",
    type: "smoothstep",
    style: { stroke: "#d97706", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#d97706" }
  },
  {
    id: "fk_occ_skills_skill",
    source: "occupation_skills",
    sourceHandle: "skill_id",
    target: "canonical_skills",
    targetHandle: "id",
    type: "smoothstep",
    style: { stroke: "#d97706", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#d97706" }
  },
  {
    id: "fk_prereq_node",
    source: "learning_nodes",
    sourceHandle: "id",
    target: "node_prerequisites",
    targetHandle: "node_id",
    type: "smoothstep",
    style: { stroke: "#475569", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#475569" }
  }
];

export default function SchemaViewerPage() {
  return (
    <div className="h-screen flex flex-col bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/15 rounded-xl">
            <LayoutTemplate className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">V2 Database Schema Visualizer</h1>
            <p className="text-slate-400 text-sm">Entity-Relationship diagram mapping the core architecture</p>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={initialNodes}
          edges={initialEdges}
          nodeTypes={nodeTypes}
          fitView
          className="bg-slate-950"
          colorMode="dark"
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={false}
        >
          <Background color="#1e293b" gap={20} size={1} />
          <Controls className="bg-slate-900 border-slate-800 fill-slate-300" />
          <MiniMap 
            nodeColor={(node) => {
              if (node.id === 'canonical_skills') return '#4f46e5';
              if (node.id === 'skill_resources') return '#059669';
              if (node.id === 'occupations') return '#d97706';
              return '#475569';
            }}
            maskColor="rgba(15, 23, 42, 0.7)"
            className="bg-slate-900 border border-slate-800 rounded-xl"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
