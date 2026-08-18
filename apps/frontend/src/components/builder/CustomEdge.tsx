import React from 'react';
import { getSmoothStepPath, EdgeProps, EdgeLabelRenderer } from 'reactflow';
import { Plus } from 'lucide-react';

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={{ ...style, stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '4 4' }}
        markerEnd={markerEnd}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          {data?.onInsertStep && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onInsertStep(id);
              }}
              className="w-7 h-7 rounded-full bg-accentPurple text-white flex items-center justify-center shadow-glow border-2 border-bgPrimary hover:scale-125 transition-all"
              title="Insert App Step Here"
            >
              <Plus size={14} />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
