import React, { useState, useRef, useMemo } from 'react';
import {
  DendrogramNode,
  Product,
  ClusterInfo,
} from '../types/product';
import { formatINR } from '../utils/formatters';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Sliders,
  Sparkles,
  Info,
} from 'lucide-react';

interface DendrogramProps {
  root: DendrogramNode;
  products: Product[];
  threshold: number;
  onThresholdChange: (newThreshold: number) => void;
  clusters: ClusterInfo[];
  selectedProductId: string | null;
  onSelectProduct: (product: Product | null) => void;
  clusterMap: Map<string, number>;
}

export const Dendrogram: React.FC<DendrogramProps> = ({
  root,
  products,
  threshold,
  onThresholdChange,
  clusters,
  selectedProductId,
  onSelectProduct,
  clusterMap,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredNode, setHoveredNode] = useState<DendrogramNode | null>(null);
  const [hoveredLeaf, setHoveredLeaf] = useState<Product | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [labelMode, setLabelMode] = useState<'name' | 'category' | 'price'>('name');
  const [isDraggingCutLine, setIsDraggingCutLine] = useState(false);

  // SVG dimensions
  const svgWidth = 980;
  const svgHeight = Math.max(680, products.length * 24);
  const margin = { top: 40, right: 300, bottom: 40, left: 60 };
  const innerWidth = svgWidth - margin.left - margin.right;
  const innerHeight = svgHeight - margin.top - margin.bottom;

  // Flatten branches for rendering
  interface SvgBranch {
    id: string;
    node: DendrogramNode;
    path: string;
    color: string;
    isBelowCut: boolean;
    clusterId?: number;
  }

  const { branches, leafNodes } = useMemo(() => {
    const branchList: SvgBranch[] = [];
    const leaves: DendrogramNode[] = [];

    function traverse(node: DendrogramNode) {
      if (!node.left && !node.right) {
        leaves.push(node);
        return;
      }

      const clusterId = node.clusterId !== undefined ? node.clusterId : undefined;
      const isBelowCut = node.height <= threshold;
      const clusterColor =
        isBelowCut && clusterId !== undefined && clusters[clusterId]
          ? clusters[clusterId].color
          : '#475569'; // Slate-600

      const currentX = margin.left + (1 - (node.x ?? 0)) * innerWidth;
      const currentY = margin.top + (node.y ?? 0) * innerHeight;

      if (node.left) {
        const leftX = margin.left + (1 - (node.left.x ?? 0)) * innerWidth;
        const leftY = margin.top + (node.left.y ?? 0) * innerHeight;
        const pathData = `M ${currentX} ${currentY} L ${currentX} ${leftY} L ${leftX} ${leftY}`;
        branchList.push({
          id: `${node.id}-to-${node.left.id}`,
          node,
          path: pathData,
          color: clusterColor,
          isBelowCut,
          clusterId,
        });
        traverse(node.left);
      }

      if (node.right) {
        const rightX = margin.left + (1 - (node.right.x ?? 0)) * innerWidth;
        const rightY = margin.top + (node.right.y ?? 0) * innerHeight;
        const pathData = `M ${currentX} ${currentY} L ${currentX} ${rightY} L ${rightX} ${rightY}`;
        branchList.push({
          id: `${node.id}-to-${node.right.id}`,
          node,
          path: pathData,
          color: clusterColor,
          isBelowCut,
          clusterId,
        });
        traverse(node.right);
      }
    }

    traverse(root);
    return { branches: branchList, leafNodes: leaves };
  }, [root, threshold, clusters, innerWidth, innerHeight, margin.left, margin.top]);

  // Cut line X coordinate in horizontal view
  const cutLineX = margin.left + (1 - threshold) * innerWidth;

  // Pan and Zoom handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCutLine && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = (e.clientX - rect.left - pan.x) / zoom - margin.left;
      const clampedRatio = Math.max(0.01, Math.min(0.99, 1 - relativeX / innerWidth));
      onThresholdChange(Number(clampedRatio.toFixed(3)));
      return;
    }

    if (isPanning) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setIsDraggingCutLine(false);
  };

  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((z) => Math.max(0.6, Math.min(2.5, z * zoomFactor)));
  };

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Dendrogram Header & Interactive Tool Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-100">
              India Catalog Dendrogram Tree
            </h2>
            <span className="text-xs font-mono text-slate-400">
              ({products.length} Indian products · {clusters.length} active clusters)
            </span>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search leaf product */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search product / brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-800/80 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-48 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
              >
                ×
              </button>
            )}
          </div>

          {/* Leaf Label Toggle */}
          <div className="flex items-center p-0.5 bg-slate-800/80 border border-slate-700 rounded-lg text-xs">
            <button
              onClick={() => setLabelMode('name')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                labelMode === 'name' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Name
            </button>
            <button
              onClick={() => setLabelMode('category')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                labelMode === 'category' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Category
            </button>
            <button
              onClick={() => setLabelMode('price')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                labelMode === 'price' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ₹ INR
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 rounded transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-slate-400 px-1 min-w-[38px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 rounded transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={resetZoom}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 rounded transition-colors ml-0.5 border-l border-slate-700"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Threshold Quick Slider Bar */}
      <div className="flex items-center justify-between px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <Sliders className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-medium text-slate-300">Cut Threshold:</span>
          <span className="font-mono text-indigo-300 font-semibold text-sm">
            {threshold.toFixed(3)}
          </span>
          <span className="text-slate-500">
            (Items below this merge distance form clusters)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0.02"
            max="0.98"
            step="0.005"
            value={threshold}
            onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
            className="w-48 accent-indigo-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
          />
          <span className="text-[11px] text-slate-400 font-mono">
            {clusters.length} Clusters
          </span>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="relative w-full h-[640px] overflow-hidden bg-slate-950 cursor-grab active:cursor-grabbing select-none"
      >
        <svg
          width={svgWidth}
          height={svgHeight}
          className="transition-transform duration-75 ease-out origin-top-left"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          <defs>
            <linearGradient id="cutLineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#818CF8" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#6366F1" stopOpacity="1" />
              <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Merge Distance Axis */}
          <g className="text-[10px] font-mono fill-slate-500">
            {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((t) => {
              const xPos = margin.left + (1 - t) * innerWidth;
              return (
                <g key={`axis-${t}`}>
                  <line
                    x1={xPos}
                    y1={margin.top - 10}
                    x2={xPos}
                    y2={margin.top - 4}
                    stroke="#475569"
                    strokeWidth="1"
                  />
                  <line
                    x1={xPos}
                    y1={margin.top}
                    x2={xPos}
                    y2={margin.top + innerHeight}
                    stroke="#334155"
                    strokeWidth="1"
                    strokeDasharray="2,6"
                    opacity="0.3"
                  />
                  <text x={xPos} y={margin.top - 16} textAnchor="middle">
                    d={t.toFixed(1)}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Render Branches */}
          <g>
            {branches.map((b) => (
              <path
                key={b.id}
                d={b.path}
                fill="none"
                stroke={b.color}
                strokeWidth={b.isBelowCut ? 2.2 : 1.4}
                strokeOpacity={b.isBelowCut ? 0.95 : 0.45}
                className="transition-colors duration-200"
              />
            ))}
          </g>

          {/* Render Internal Merge Node Handles */}
          <g>
            {branches.map((b) => {
              const node = b.node;
              const nx = margin.left + (1 - (node.x ?? 0)) * innerWidth;
              const ny = margin.top + (node.y ?? 0) * innerHeight;
              const isCut = node.height <= threshold;

              return (
                <circle
                  key={`node-${node.id}`}
                  cx={nx}
                  cy={ny}
                  r={isCut ? 3.5 : 2.5}
                  fill={b.color}
                  stroke="#0F172A"
                  strokeWidth="1.5"
                  className="cursor-pointer hover:r-5 transition-all"
                  onMouseEnter={(e) => {
                    setHoveredNode(node);
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect) {
                      setTooltipPos({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                      });
                    }
                  }}
                  onMouseLeave={() => setHoveredNode(null)}
                />
              );
            })}
          </g>

          {/* Draggable Cut Line */}
          <g>
            <line
              x1={cutLineX}
              y1={margin.top - 20}
              x2={cutLineX}
              y2={margin.top + innerHeight + 10}
              stroke="transparent"
              strokeWidth="24"
              className="cursor-col-resize"
              onMouseDown={(e) => {
                e.stopPropagation();
                setIsDraggingCutLine(true);
              }}
            />
            <line
              x1={cutLineX}
              y1={margin.top - 20}
              x2={cutLineX}
              y2={margin.top + innerHeight + 10}
              stroke="url(#cutLineGrad)"
              strokeWidth="2.5"
              strokeDasharray="5,4"
              className="cursor-col-resize pointer-events-none drop-shadow"
            />
            <g
              transform={`translate(${cutLineX}, ${margin.top - 18})`}
              className="cursor-col-resize"
              onMouseDown={(e) => {
                e.stopPropagation();
                setIsDraggingCutLine(true);
              }}
            >
              <rect
                x="-36"
                y="-14"
                width="72"
                height="22"
                rx="4"
                fill="#4F46E5"
                stroke="#818CF8"
                strokeWidth="1"
              />
              <text
                x="0"
                y="1"
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="10"
                fontWeight="600"
                className="font-mono select-none"
              >
                CUT {threshold.toFixed(2)}
              </text>
            </g>
          </g>

          {/* Render Leaves (Products) */}
          <g>
            {leafNodes.map((leaf) => {
              const product = leaf.leafData;
              if (!product) return null;

              const clusterId = clusterMap.get(product.id) ?? 0;
              const cluster = clusters[clusterId];
              const clusterColor = cluster ? cluster.color : '#94A3B8';

              const lx = margin.left + (1 - (leaf.x ?? 0)) * innerWidth;
              const ly = margin.top + (leaf.y ?? 0) * innerHeight;

              const isSelected = selectedProductId === product.id;
              const matchesSearch = searchQuery
                ? product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  product.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  product.category.toLowerCase().includes(searchQuery.toLowerCase())
                : false;

              let displayText = product.title;
              if (labelMode === 'category') {
                displayText = `${product.category} · ${product.title}`;
              } else if (labelMode === 'price') {
                displayText = `${formatINR(product.price)} · ${product.title}`;
              }

              return (
                <g
                  key={leaf.id}
                  transform={`translate(${lx}, ${ly})`}
                  className="cursor-pointer group"
                  onClick={() => onSelectProduct(product)}
                  onMouseEnter={(e) => {
                    setHoveredLeaf(product);
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect) {
                      setTooltipPos({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                      });
                    }
                  }}
                  onMouseLeave={() => setHoveredLeaf(null)}
                >
                  <circle
                    cx="0"
                    cy="0"
                    r={isSelected || matchesSearch ? 5 : 3.5}
                    fill={clusterColor}
                    stroke={isSelected ? '#FFFFFF' : '#0F172A'}
                    strokeWidth={isSelected ? 2 : 1}
                    className="transition-all"
                  />

                  <line
                    x1="4"
                    y1="0"
                    x2="18"
                    y2="0"
                    stroke={clusterColor}
                    strokeWidth="1"
                    strokeOpacity="0.6"
                  />

                  {(isSelected || matchesSearch) && (
                    <rect
                      x="18"
                      y="-10"
                      width="260"
                      height="20"
                      rx="4"
                      fill={isSelected ? '#312E81' : '#1E293B'}
                      stroke={isSelected ? '#6366F1' : '#475569'}
                      strokeWidth="1"
                    />
                  )}

                  <rect
                    x="20"
                    y="-6"
                    width="3"
                    height="12"
                    rx="1.5"
                    fill={clusterColor}
                  />

                  <text
                    x="28"
                    y="3.5"
                    fill={isSelected ? '#FFFFFF' : matchesSearch ? '#F8FAFC' : '#CBD5E1'}
                    fontSize={isSelected ? '12' : '11'}
                    fontWeight={isSelected ? '600' : '400'}
                    className="group-hover:fill-white transition-colors"
                  >
                    {displayText.length > 34 ? `${displayText.slice(0, 32)}…` : displayText}
                  </text>

                  <text
                    x="270"
                    y="3.5"
                    textAnchor="end"
                    fill="#94A3B8"
                    fontSize="10"
                    className="font-mono tabular-nums"
                  >
                    {formatINR(product.price)}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Hover Tooltip for Internal Merge Node */}
        {hoveredNode && (
          <div
            className="absolute z-30 pointer-events-none p-3 bg-slate-900/95 border border-slate-700 rounded-lg shadow-xl text-xs max-w-xs backdrop-blur-sm"
            style={{
              left: `${tooltipPos.x + 15}px`,
              top: `${tooltipPos.y - 30}px`,
            }}
          >
            <div className="font-semibold text-slate-200 mb-1 flex items-center justify-between">
              <span>Cluster Branch Split</span>
              <span className="font-mono text-indigo-400">
                Height: {hoveredNode.height.toFixed(3)}
              </span>
            </div>
            <div className="text-slate-400 text-[11px] mb-2">
              Merges <span className="font-semibold text-slate-300">{hoveredNode.size}</span> products into this subtree.
            </div>
            <div className="text-[10px] text-slate-500">
              {hoveredNode.height <= threshold ? (
                <span className="text-emerald-400 font-medium">✓ Below cut threshold (united cluster)</span>
              ) : (
                <span className="text-amber-400 font-medium">× Above cut threshold (separate clusters)</span>
              )}
            </div>
          </div>
        )}

        {/* Hover Tooltip for Product Leaf */}
        {hoveredLeaf && (
          <div
            className="absolute z-30 pointer-events-none p-3 bg-slate-900/95 border border-slate-700 rounded-lg shadow-2xl text-xs w-72 backdrop-blur-md"
            style={{
              left: `${Math.min(svgWidth - 290, tooltipPos.x + 20)}px`,
              top: `${Math.max(10, tooltipPos.y - 40)}px`,
            }}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider">
                  {hoveredLeaf.brand} · {hoveredLeaf.sku}
                </span>
                <h4 className="font-semibold text-slate-100 text-sm leading-snug">
                  {hoveredLeaf.title}
                </h4>
              </div>
              <span className="font-mono font-bold text-slate-100 text-sm shrink-0">
                {formatINR(hoveredLeaf.price)}
              </span>
            </div>

            <div className="text-slate-400 text-[11px] mb-2">
              Category: <span className="text-slate-300">{hoveredLeaf.category}</span>
            </div>

            <div className="grid grid-cols-3 gap-1 py-1.5 border-y border-slate-800 text-[10px] font-mono mb-2">
              <div>
                <span className="text-slate-500 block">Rating</span>
                <span className="text-amber-300">★ {hoveredLeaf.rating}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Return</span>
                <span className="text-slate-300">{hoveredLeaf.returnRate}%</span>
              </div>
              <div>
                <span className="text-slate-500 block">Monthly Vol</span>
                <span className="text-slate-300">{hoveredLeaf.salesVelocity.toLocaleString('en-IN')}/mo</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 text-[10px] text-slate-400">
              {hoveredLeaf.tags.slice(0, 4).map((tag) => (
                <span key={tag} className="text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">
                  #{tag}
                </span>
              ))}
            </div>

            <div className="mt-2 text-[10px] text-indigo-300/80 italic">
              Click to view Indian market substitutes and spec comparison
            </div>
          </div>
        )}

        <div className="absolute bottom-3 left-4 text-[11px] text-slate-500 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-800 pointer-events-none">
          Drag to Pan · Scroll to Zoom · Drag <span className="text-indigo-400 font-semibold">CUT line</span> to split
        </div>
      </div>
    </div>
  );
};
