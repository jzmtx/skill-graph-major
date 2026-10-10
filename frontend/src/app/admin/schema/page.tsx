"use client";

import React from "react";
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
    <div className="bg-white border border-stone-300 shadow-sm rounded-xl overflow-hidden min-w-[270px]">
      <Handle type="target" position={Position.Top} className="opacity-0" />
      
      {/* Table Header */}
      <div className={`px-4 py-2.5 flex items-center justify-between border-b border-stone-200 ${data.headerBg || 'bg-stone-100'}`}>
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-emerald-800" />
          <span className="font-bold text-stone-900 tracking-wide text-xs">{data.tableName}</span>
        </div>
      </div>

      {/* Columns */}
      <div className="flex flex-col divide-y divide-stone-100 text-xs">
        {data.columns.map((col: any) => (
          <div key={col.name} className="flex items-center justify-between px-3.5 py-1.5 hover:bg-stone-50 transition-colors relative">
            
            {col.targetHandle && (
              <Handle type="target" id={col.name} position={Position.Left} className="w-2 h-2 bg-emerald-800 !-left-1 !border-none" />
            )}
            
            <div className="flex items-center gap-1.5">
              {col.isPk && <Key className="w-3 h-3 text-amber-700" />}
              {col.isFk && <LinkIcon className="w-3 h-3 text-emerald-700" />}
              {!col.isPk && !col.isFk && <span className="w-3" />}
              
              <span className={`text-[11px] font-medium ${col.isPk ? 'text-stone-900 font-bold' : 'text-stone-700'}`}>
                {col.name}
              </span>
            </div>
            
            <span className="text-[10px] text-stone-400 font-mono">
              {col.type}
            </span>

            {col.sourceHandle && (
              <Handle type="source" id={col.name} position={Position.Right} className="w-2 h-2 bg-emerald-800 !-right-1 !border-none" />
            )}
          </div>
        ))}
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
};

const LinkIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
  </svg>
);

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
      headerBg: "bg-stone-100",
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
      headerBg: "bg-emerald-50",
      columns: [
        { name: "id", type: "UUID", isPk: true },
        { name: "skill_id", type: "UUID", isFk: true, targetHandle: true },
        { name: "resources_json", type: "JSONB" },
      ]
    }
  },
  {
    id: "learning_nodes",
    type: "table",
    position: { x: 500, y: 400 },
    data: {
      tableName: "learning_nodes",
      headerBg: "bg-stone-100",
      columns: [
        { name: "id", type: "UUID", isPk: true, sourceHandle: true },
        { name: "technology_id", type: "UUID", isFk: true, targetHandle: true },
        { name: "concept_name", type: "TEXT" },
        { name: "difficulty_level", type: "TEXT" },
      ]
    }
  },
  {
    id: "node_prerequisites",
    type: "table",
    position: { x: 500, y: 650 },
    data: {
      tableName: "node_prerequisites",
      headerBg: "bg-stone-100",
      columns: [
        { name: "id", type: "UUID", isPk: true },
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
      headerBg: "bg-amber-50",
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
    position: { x: 100, y: 350 },
    data: {
      tableName: "occupation_skills",
      headerBg: "bg-amber-50",
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
    position: { x: 900, y: 400 },
    data: {
      tableName: "roadmaps",
      headerBg: "bg-stone-100",
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
    style: { stroke: "#166534", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#166534" }
  },
  {
    id: "fk_learning_nodes_tech",
    source: "canonical_skills",
    sourceHandle: "id",
    target: "learning_nodes",
    targetHandle: "technology_id",
    type: "smoothstep",
    style: { stroke: "#166534", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#166534" }
  },
  {
    id: "fk_occ_skills_occ",
    source: "occupations",
    sourceHandle: "id",
    target: "occupation_skills",
    targetHandle: "occupation_id",
    type: "smoothstep",
    style: { stroke: "#b45309", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#b45309" }
  },
  {
    id: "fk_occ_skills_skill",
    source: "occupation_skills",
    sourceHandle: "skill_id",
    target: "canonical_skills",
    targetHandle: "id",
    type: "smoothstep",
    style: { stroke: "#b45309", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#b45309" }
  },
  {
    id: "fk_prereq_node",
    source: "learning_nodes",
    sourceHandle: "id",
    target: "node_prerequisites",
    targetHandle: "node_id",
    type: "smoothstep",
    style: { stroke: "#78716c", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#78716c" }
  }
];

export default function SchemaViewerPage() {
  return (
    <div className="h-screen flex flex-col bg-stone-50 font-sans overflow-hidden text-stone-900">
      {/* Header */}
      <div className="p-4 border-b border-stone-200 bg-white flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg text-emerald-800 border border-emerald-200">
            <LayoutTemplate className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-stone-900 leading-tight">Database Architecture & Relational Schema</h1>
            <p className="text-stone-500 text-xs">Entity-Relationship diagram mapping core data entities and foreign keys</p>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative bg-stone-100">
        <ReactFlow
          nodes={initialNodes}
          edges={initialEdges}
          nodeTypes={nodeTypes}
          fitView
          className="bg-stone-100"
          colorMode="light"
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={false}
        >
          <Background color="#E7E5E4" gap={20} size={1} />
          <Controls className="bg-white border-stone-300 fill-stone-700 shadow-xs" />
          <MiniMap 
            nodeColor={() => '#166534'}
            maskColor="rgba(245, 245, 244, 0.7)"
            className="bg-white border border-stone-200 rounded-lg shadow-xs"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
