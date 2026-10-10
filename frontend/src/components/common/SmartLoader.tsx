"use client";

import React from 'react';
import { motion } from 'framer-motion';

/**
 * Slim Micro-Progress Bar at the top of the viewport
 * Indicates background data sync without blocking UI interactions.
 */
export function SmartTopBarLoader({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-stone-100 overflow-hidden pointer-events-none">
      <motion.div
        className="h-full bg-gradient-to-r from-emerald-800 via-orange-500 to-amber-500"
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{
          repeat: Infinity,
          duration: 1.2,
          ease: "easeInOut"
        }}
        style={{ width: "60%" }}
      />
    </div>
  );
}

/**
 * Classical Academic Full Page / Container Smart Loader
 * Avoids harsh AI neon spinners. Uses warm stone, forest emerald, and soft amber pulses.
 */
export function SmartPageLoader({ 
  message = "Synchronizing competency records...", 
  subtext = "Retrieving verified benchmarks and industry standards" 
}: { 
  message?: string; 
  subtext?: string; 
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[45vh] p-8 text-center animate-in fade-in duration-300">
      <div className="relative mb-5 flex items-center justify-center">
        {/* Soft pulse rings */}
        <span className="absolute w-16 h-16 rounded-full bg-emerald-100/60 animate-ping" />
        <span className="absolute w-12 h-12 rounded-full bg-orange-100/70 animate-pulse" />
        
        {/* Monogram emblem */}
        <div className="relative w-12 h-12 rounded-xl bg-emerald-800 text-white font-serif font-bold text-lg flex items-center justify-center shadow-xs border border-orange-200/80">
          S
        </div>
      </div>

      <h3 className="text-base font-bold text-stone-900 font-serif tracking-tight">
        {message}
      </h3>
      <p className="text-xs text-stone-500 mt-1 max-w-sm leading-relaxed">
        {subtext}
      </p>

      {/* Micro-bar indicator */}
      <div className="w-32 h-1 bg-stone-200 rounded-full mt-4 overflow-hidden">
        <motion.div 
          className="h-full bg-gradient-to-r from-emerald-800 to-orange-500"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}

/**
 * Smart Card Skeleton for Metric & Dashboard Cards
 */
export function SmartCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-stone-200 rounded-xl p-5 shadow-2xs space-y-3">
          <div className="flex justify-between items-center">
            <div className="h-3 w-24 bg-stone-200 rounded" />
            <div className="w-5 h-5 bg-stone-100 rounded-full" />
          </div>
          <div className="h-8 w-20 bg-stone-200 rounded" />
          <div className="h-2.5 w-36 bg-stone-100 rounded" />
        </div>
      ))}
    </div>
  );
}

/**
 * Smart Dashboard Skeleton (Preserves exact layout during initial load)
 */
export function SmartDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-28 bg-orange-100 rounded-full" />
          <div className="h-4 w-36 bg-stone-100 rounded-full" />
        </div>
        <div className="h-8 w-64 bg-stone-200 rounded-lg" />
        <div className="h-4 w-96 max-w-full bg-stone-100 rounded" />
      </div>

      {/* Metric Cards Skeleton */}
      <SmartCardSkeleton count={4} />

      {/* Main Gauge / Body Skeleton */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 shadow-2xs space-y-6">
        <div className="flex justify-between items-center border-b border-stone-100 pb-4">
          <div className="space-y-1">
            <div className="h-3 w-32 bg-stone-200 rounded" />
            <div className="h-6 w-48 bg-stone-200 rounded" />
          </div>
          <div className="h-6 w-40 bg-stone-100 rounded-lg" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center py-4">
          <div className="flex justify-center">
            <div className="w-40 h-40 rounded-full border-8 border-stone-100 border-t-emerald-800/40 animate-spin" />
          </div>
          <div className="md:col-span-2 space-y-4">
            <div className="h-4 w-full bg-stone-100 rounded" />
            <div className="h-4 w-5/6 bg-stone-100 rounded" />
            <div className="h-4 w-2/3 bg-stone-100 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * List / Opportunity Item Skeleton
 */
export function SmartListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-stone-200 rounded-xl p-5 shadow-2xs space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="h-3 w-20 bg-emerald-100 rounded" />
              <div className="h-5 w-48 bg-stone-200 rounded" />
              <div className="h-3 w-32 bg-stone-100 rounded" />
            </div>
            <div className="h-8 w-24 bg-stone-200 rounded-lg" />
          </div>
          <div className="h-3 w-full bg-stone-100 rounded" />
          <div className="flex gap-2 pt-2">
            <div className="h-5 w-16 bg-stone-100 rounded" />
            <div className="h-5 w-16 bg-stone-100 rounded" />
            <div className="h-5 w-16 bg-stone-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
