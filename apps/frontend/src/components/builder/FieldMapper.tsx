'use client';
import React from 'react';

export function FieldMapper() {
  return (
    <div className="w-72 border-l border-borderColor bg-bgSecondary p-4">
      <h4 className="text-xs uppercase text-textMuted font-semibold mb-4 tracking-wider">
        Step & Field Configuration
      </h4>
      <div className="text-textSecondary text-xs text-center mt-10">
        Select a node on the canvas to configure parameters and template field mappings.
      </div>
    </div>
  );
}
