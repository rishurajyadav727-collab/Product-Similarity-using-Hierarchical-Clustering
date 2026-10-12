import React, { useState, useMemo } from 'react';
import { Product, DendrogramNode, ClusterInfo } from '../types/product';
import { formatINR } from '../utils/formatters';
import { Grid, Eye, Search } from 'lucide-react';

interface SimilarityMatrixProps {
  products: Product[];
  simMatrix: number[][];
  root: DendrogramNode;
  clusters: ClusterInfo[];
  clusterMap: Map<string, number>;
  onSelectProduct: (product: Product) => void;
  onCompareProducts: (pA: Product, pB: Product) => void;
}

export const SimilarityMatrix: React.FC<SimilarityMatrixProps> = ({
  products,
  simMatrix,
  root,
  clusters,
  clusterMap,
  onSelectProduct,
  onCompareProducts,
}) => {
  const [hoveredCell, setHoveredCell] = useState<{
    i: number;
    j: number;
    sim: number;
  } | null>(null);
  const [filterClusterId, setFilterClusterId] = useState<number | 'all'>('all');

  // Order products according to dendrogram leaf traversal (seriation)
  // This clusters similar items together along the diagonal!
  const leafOrder = useMemo(() => {
    const indices: number[] = [];
    function traverse(node: DendrogramNode) {
      if (!node.left && !node.right) {
        if (node.leafIndices[0] !== undefined) {
          indices.push(node.leafIndices[0]);
        }
        return;
      }
      if (node.left) traverse(node.left);
      if (node.right) traverse(node.right);
    }
    traverse(root);
    return indices;
  }, [root]);

  // Filter products by selected cluster if needed
  const displayIndices = useMemo(() => {
    if (filterClusterId === 'all') return leafOrder;
    return leafOrder.filter((idx) => {
      const prod = products[idx];
      return prod && clusterMap.get(prod.id) === filterClusterId;
    });
  }, [leafOrder, filterClusterId, products, clusterMap]);

  const n = displayIndices.length;

  // Cell color interpolator
  function getCellColor(sim: number): string {
    // 0.0 -> #090D16 (near black)
    // 0.5 -> #1E293B (dark slate)
    // 0.7 -> #312E81 (indigo dark)
    // 0.85 -> #4F46E5 (indigo bright)
    // 0.95 -> #06B6D4 (cyan glow)
    // 1.0 -> #38BDF8 (sky blue)
    if (sim >= 0.95) return 'rgb(56, 189, 248)';
    if (sim >= 0.85) return 'rgb(99, 102, 241)';
    if (sim >= 0.70) return 'rgb(67, 56, 202)';
    if (sim >= 0.50) return 'rgb(30, 41, 59)';
    if (sim >= 0.30) return 'rgb(15, 23, 42)';
    return 'rgb(10, 15, 30)';
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Header & Filter Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Grid className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Pairwise Similarity Matrix & Heatmap
            </h3>
            <p className="text-xs text-slate-400">
              Ordered by dendrogram hierarchy to reveal block-diagonal similarity clusters
            </p>
          </div>
        </div>

        {/* Cluster Filter */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Filter Matrix:</span>
          <select
            value={filterClusterId}
            onChange={(e) =>
              setFilterClusterId(
                e.target.value === 'all' ? 'all' : parseInt(e.target.value)
              )
            }
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Products ({products.length}×{products.length})</option>
            {clusters.map((c) => (
              <option key={c.id} value={c.id}>
                Cluster {c.id + 1}: {c.label.slice(0, 24)}… ({c.products.length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Heatmap Grid & Axis View */}
      <div className="p-6 overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Legend Bar */}
          <div className="flex items-center justify-between mb-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span>Similarity Scale:</span>
              <div className="flex items-center h-3 w-48 rounded overflow-hidden border border-slate-700">
                <div className="h-full w-1/4 bg-[#0a0f1e]" title="0 - 25%" />
                <div className="h-full w-1/4 bg-[#1e293b]" title="25% - 50%" />
                <div className="h-full w-1/4 bg-[#4338ca]" title="50% - 75%" />
                <div className="h-full w-1/4 bg-[#38bdf8]" title="75% - 100%" />
              </div>
              <span className="font-mono text-[10px]">0% → 100%</span>
            </div>
            <span className="text-[11px] text-slate-500">
              Hover any cell for pair comparison · Click cell to compare
            </span>
          </div>

          {/* Matrix Container */}
          <div className="relative border border-slate-800 rounded bg-slate-950 p-2">
            <table className="border-collapse table-fixed">
              <tbody>
                {displayIndices.map((rowIdx, r) => {
                  const prodRow = products[rowIdx];
                  const cRowId = clusterMap.get(prodRow.id) ?? 0;
                  const cRowColor = clusters[cRowId]?.color ?? '#64748B';

                  return (
                    <tr key={`r-${prodRow.id}`}>
                      {/* Left header label */}
                      <td className="pr-2 py-0.5 text-right w-44 shrink-0 overflow-hidden">
                        <button
                          onClick={() => onSelectProduct(prodRow)}
                          className="text-[11px] text-slate-400 hover:text-white truncate block w-full text-right transition-colors"
                          title={prodRow.title}
                        >
                          <span
                            className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                            style={{ backgroundColor: cRowColor }}
                          />
                          {prodRow.title.length > 20
                            ? `${prodRow.title.slice(0, 18)}…`
                            : prodRow.title}
                        </button>
                      </td>

                      {/* Cells */}
                      {displayIndices.map((colIdx, c) => {
                        const sim = simMatrix[rowIdx][colIdx];
                        const prodCol = products[colIdx];
                        const isDiag = rowIdx === colIdx;
                        const isHovered =
                          hoveredCell &&
                          hoveredCell.i === rowIdx &&
                          hoveredCell.j === colIdx;

                        return (
                          <td
                            key={`c-${prodRow.id}-${prodCol.id}`}
                            className="p-0.5"
                          >
                            <div
                              onClick={() => onCompareProducts(prodRow, prodCol)}
                              onMouseEnter={() =>
                                setHoveredCell({ i: rowIdx, j: colIdx, sim })
                              }
                              onMouseLeave={() => setHoveredCell(null)}
                              className={`w-6 h-6 rounded-sm cursor-pointer transition-transform hover:scale-125 hover:z-10 relative ${
                                isHovered ? 'ring-2 ring-white z-20' : ''
                              }`}
                              style={{
                                backgroundColor: getCellColor(sim),
                                opacity: isDiag ? 0.35 : 1.0,
                              }}
                              title={`${prodRow.title} ↔ ${prodCol.title}: ${(
                                sim * 100
                              ).toFixed(0)}%`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Hovered Cell Detail Strip */}
          {hoveredCell ? (
            <div className="mt-4 p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-sm text-cyan-400 bg-cyan-950/60 border border-cyan-800 px-2.5 py-0.5 rounded">
                  {(hoveredCell.sim * 100).toFixed(1)}% Similarity
                </span>
                <div className="text-slate-300">
                  <span className="font-semibold text-white">
                    {products[hoveredCell.i].title}
                  </span>
                  <span className="text-slate-400 font-mono text-[11px] ml-1">
                    ({formatINR(products[hoveredCell.i].price)})
                  </span>
                  <span className="text-slate-500 mx-2">vs</span>
                  <span className="font-semibold text-white">
                    {products[hoveredCell.j].title}
                  </span>
                  <span className="text-slate-400 font-mono text-[11px] ml-1">
                    ({formatINR(products[hoveredCell.j].price)})
                  </span>
                </div>
              </div>

              <button
                onClick={() =>
                  onCompareProducts(
                    products[hoveredCell.i],
                    products[hoveredCell.j]
                  )
                }
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium transition-colors"
              >
                Inspect Comparison
              </button>
            </div>
          ) : (
            <div className="mt-4 p-3 bg-slate-950/40 border border-dashed border-slate-800 rounded-lg text-center text-xs text-slate-500">
              Hover over any matrix square to inspect product pair relationship
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
