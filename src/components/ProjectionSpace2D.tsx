import React, { useState, useMemo } from 'react';
import { Product, Point2D, ClusterInfo } from '../types/product';
import { formatINR } from '../utils/formatters';
import { Compass, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ProjectionSpace2DProps {
  points: Point2D[];
  clusters: ClusterInfo[];
  clusterMap: Map<string, number>;
  selectedProductId: string | null;
  onSelectProduct: (product: Product) => void;
  simMatrix: number[][];
  products: Product[];
}

export const ProjectionSpace2D: React.FC<ProjectionSpace2DProps> = ({
  points,
  clusters,
  clusterMap,
  selectedProductId,
  onSelectProduct,
  simMatrix,
  products,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<Point2D | null>(null);
  const [zoom, setZoom] = useState(1);
  const [filterClusterId, setFilterClusterId] = useState<number | 'all'>('all');

  const width = 800;
  const height = 540;
  const padding = 50;

  // Compute cluster centroids for convex grouping / circles
  const clusterCentroids = useMemo(() => {
    const centroids = new Map<number, { x: number; y: number; count: number }>();
    points.forEach((pt) => {
      const cId = pt.clusterId;
      const existing = centroids.get(cId) || { x: 0, y: 0, count: 0 };
      centroids.set(cId, {
        x: existing.x + pt.x,
        y: existing.y + pt.y,
        count: existing.count + 1,
      });
    });

    const result: { clusterId: number; cx: number; cy: number; radius: number }[] = [];
    centroids.forEach((val, cId) => {
      const meanX = val.x / val.count;
      const meanY = val.y / val.count;
      // Approximate radius by max distance of points in cluster to mean
      let maxDist = 0.04;
      points
        .filter((pt) => pt.clusterId === cId)
        .forEach((pt) => {
          const d = Math.hypot(pt.x - meanX, pt.y - meanY);
          if (d > maxDist) maxDist = d;
        });

      result.push({
        clusterId: cId,
        cx: padding + meanX * (width - 2 * padding),
        cy: padding + meanY * (height - 2 * padding),
        radius: Math.max(30, maxDist * (width - 2 * padding) * 1.1),
      });
    });

    return result;
  }, [points, width, height, padding]);

  // Find 2 closest neighbors for selected or hovered product
  const nearestLinks = useMemo(() => {
    const targetProduct = hoveredPoint?.product || products.find((p) => p.id === selectedProductId);
    if (!targetProduct) return [];

    const targetIdx = products.findIndex((p) => p.id === targetProduct.id);
    if (targetIdx === -1) return [];

    const scores = products
      .map((p, idx) => ({ product: p, idx, sim: simMatrix[targetIdx][idx] }))
      .filter((item) => item.product.id !== targetProduct.id)
      .sort((a, b) => b.sim - a.sim)
      .slice(0, 3);

    const targetPt = points.find((pt) => pt.id === targetProduct.id);
    if (!targetPt) return [];

    const x1 = padding + targetPt.x * (width - 2 * padding);
    const y1 = padding + targetPt.y * (height - 2 * padding);

    return scores.map((s) => {
      const otherPt = points.find((pt) => pt.id === s.product.id);
      if (!otherPt) return null;
      const x2 = padding + otherPt.x * (width - 2 * padding);
      const y2 = padding + otherPt.y * (height - 2 * padding);
      return {
        x1,
        y1,
        x2,
        y2,
        sim: s.sim,
        name: s.product.title,
      };
    }).filter(Boolean);
  }, [hoveredPoint, selectedProductId, products, simMatrix, points, padding, width, height]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Compass className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              2D Multidimensional Scaling (MDS) Space
            </h3>
            <p className="text-xs text-slate-400">
              Low-dimensional projection preserving high-dimensional multi-attribute distances
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Cluster filter */}
          <select
            value={filterClusterId}
            onChange={(e) =>
              setFilterClusterId(
                e.target.value === 'all' ? 'all' : parseInt(e.target.value)
              )
            }
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Clusters ({clusters.length})</option>
            {clusters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label.slice(0, 24)}…
              </option>
            ))}
          </select>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded p-0.5">
            <button
              onClick={() => setZoom((z) => Math.max(0.7, z - 0.15))}
              className="p-1 text-slate-400 hover:text-white"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))}
              className="p-1 text-slate-400 hover:text-white"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1 text-slate-400 hover:text-white border-l border-slate-700 ml-0.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2D Canvas */}
      <div className="relative p-6 flex justify-center bg-slate-950 overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-[800px] h-auto border border-slate-800 rounded-lg select-none"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        >
          {/* Subtle grid lines */}
          <line
            x1={width / 2}
            y1={padding}
            x2={width / 2}
            y2={height - padding}
            stroke="#1E293B"
            strokeDasharray="4,4"
          />
          <line
            x1={padding}
            y1={height / 2}
            x2={width - padding}
            y2={height / 2}
            stroke="#1E293B"
            strokeDasharray="4,4"
          />

          {/* Cluster Enclosure Ellipses / Centroids */}
          {clusterCentroids.map((cent) => {
            if (filterClusterId !== 'all' && filterClusterId !== cent.clusterId) return null;
            const cluster = clusters[cent.clusterId];
            const color = cluster ? cluster.color : '#64748B';

            return (
              <g key={`cent-${cent.clusterId}`}>
                <circle
                  cx={cent.cx}
                  cy={cent.cy}
                  r={cent.radius}
                  fill={color}
                  fillOpacity="0.08"
                  stroke={color}
                  strokeWidth="1.2"
                  strokeDasharray="3,3"
                />
                <text
                  x={cent.cx}
                  y={cent.cy - cent.radius - 6}
                  textAnchor="middle"
                  fill={color}
                  fontSize="10"
                  fontWeight="600"
                  className="font-mono"
                >
                  Cluster {cent.clusterId + 1}
                </text>
              </g>
            );
          })}

          {/* Nearest neighbor affinity lines */}
          {nearestLinks.map((link, idx) => {
            if (!link) return null;
            return (
              <g key={`link-${idx}`}>
                <line
                  x1={link.x1}
                  y1={link.y1}
                  x2={link.x2}
                  y2={link.y2}
                  stroke="#38BDF8"
                  strokeWidth="1.8"
                  strokeDasharray="3,3"
                  strokeOpacity="0.75"
                />
                <text
                  x={(link.x1 + link.x2) / 2}
                  y={(link.y1 + link.y2) / 2 - 4}
                  fill="#38BDF8"
                  fontSize="9"
                  textAnchor="middle"
                  className="font-mono"
                >
                  {(link.sim * 100).toFixed(0)}%
                </text>
              </g>
            );
          })}

          {/* Product Data Points */}
          {points.map((pt) => {
            if (filterClusterId !== 'all' && filterClusterId !== pt.clusterId) return null;

            const px = padding + pt.x * (width - 2 * padding);
            const py = padding + pt.y * (height - 2 * padding);
            const cluster = clusters[pt.clusterId];
            const color = cluster ? cluster.color : '#64748B';
            const isSelected = selectedProductId === pt.product.id;
            const isHovered = hoveredPoint?.id === pt.id;

            return (
              <g
                key={pt.id}
                transform={`translate(${px}, ${py})`}
                className="cursor-pointer group"
                onClick={() => onSelectProduct(pt.product)}
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {/* Glow ring for selected */}
                {(isSelected || isHovered) && (
                  <circle
                    cx="0"
                    cy="0"
                    r={isSelected ? 14 : 10}
                    fill={color}
                    fillOpacity="0.25"
                  />
                )}

                {/* Point */}
                <circle
                  cx="0"
                  cy="0"
                  r={isSelected ? 6 : 4.5}
                  fill={color}
                  stroke={isSelected ? '#FFFFFF' : '#0F172A'}
                  strokeWidth={isSelected ? 2 : 1}
                  className="transition-transform duration-100 group-hover:scale-125"
                />

                {/* Label */}
                <text
                  x="7"
                  y="3"
                  fill={isSelected ? '#FFFFFF' : '#94A3B8'}
                  fontSize={isSelected ? '11' : '9.5'}
                  fontWeight={isSelected ? '600' : '400'}
                  className="transition-colors group-hover:fill-white font-sans pointer-events-none"
                >
                  {pt.product.title.length > 20
                    ? `${pt.product.title.slice(0, 18)}…`
                    : pt.product.title}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating tooltip for hovered product */}
        {hoveredPoint && (
          <div className="absolute bottom-10 right-10 p-3 bg-slate-900/95 border border-slate-700 rounded-lg shadow-xl text-xs w-64 backdrop-blur-md pointer-events-none">
            <div className="text-[10px] font-mono text-indigo-400">
              {hoveredPoint.product.brand} · Cluster {hoveredPoint.clusterId + 1}
            </div>
            <div className="font-semibold text-white text-sm my-0.5">
              {hoveredPoint.product.title}
            </div>
            <div className="text-slate-400 text-[11px]">
              {hoveredPoint.product.category} · {formatINR(hoveredPoint.product.price)}
            </div>
            <div className="text-slate-500 text-[10px] mt-1">
              Click to view complete specs and closest alternatives
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
