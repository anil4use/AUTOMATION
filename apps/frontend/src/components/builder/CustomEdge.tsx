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
        style={{ ...style, stroke: '#6366f1', strokeWidth: 2 }}
        markerEnd={markerEnd}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan flex items-center justify-center"
        >
          {data?.onInsertStep && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onInsertStep(id);
              }}
              className="w-6 h-6 rounded-full bg-accentIndigo text-white flex items-center justify-center shadow-lg border-2 border-bgPrimary hover:scale-125 hover:bg-accentPurple transition-all z-10"
              title="Add step"
            >
              <Plus size={14} />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
