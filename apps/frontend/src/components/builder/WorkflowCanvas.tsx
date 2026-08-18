'use client';
import React from 'react';

export function WorkflowCanvas() {
  return (
    <div className="flex-1 h-full bg-bgCanvas relative flex items-center justify-center bg-[radial-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:20px_20px]">
      <div className="glass-card p-8 text-center border-dashed border-accentIndigo max-w-md">
        <h3 className="text-lg font-semibold mb-2">React Flow DAG Builder Canvas</h3>
        <p className="text-textSecondary text-sm mb-5">
          Drag connectors from the palette or generate a workflow using the AI prompt agent.
        </p>
        <button className="glow-button">+ Add First Trigger Node</button>
      </div>
    </div>
  );
}
