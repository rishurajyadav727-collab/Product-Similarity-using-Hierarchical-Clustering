import React from 'react';
import { Product, ClusterInfo } from '../types/product';
import { formatINR } from '../utils/formatters';
import {
  X,
  Star,
  RotateCcw,
  TrendingUp,
  Tag,
  Sliders,
  DollarSign,
  ArrowRight,
  Shield,
  Layers,
} from 'lucide-react';

interface ProductInspectorProps {
  product: Product | null;
  onClose: () => void;
  clusters: ClusterInfo[];
  clusterMap: Map<string, number>;
  allProducts: Product[];
  simMatrix: number[][];
  onSelectProduct: (product: Product) => void;
  onCompareWith: (productA: Product, productB: Product) => void;
}

export const ProductInspector: React.FC<ProductInspectorProps> = ({
  product,
  onClose,
  clusters,
  clusterMap,
  allProducts,
  simMatrix,
  onSelectProduct,
  onCompareWith,
}) => {
  if (!product) return null;

  const clusterId = clusterMap.get(product.id) ?? 0;
  const cluster = clusters[clusterId];
  const clusterColor = cluster ? cluster.color : '#64748B';

  // Compute nearest substitutes
  const productIdx = allProducts.findIndex((p) => p.id === product.id);
  const nearestSubstitutes = productIdx !== -1
    ? allProducts
        .map((p, idx) => ({
          product: p,
          sim: simMatrix[productIdx][idx],
          priceDiff: p.price - product.price,
        }))
        .filter((item) => item.product.id !== product.id)
        .sort((a, b) => b.sim - a.sim)
        .slice(0, 5)
    : [];

  const feat = product.features;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl z-50 overflow-y-auto flex flex-col backdrop-blur-md">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: clusterColor }}
          />
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
            {product.brand} · SKU: {product.sku}
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6 flex-1">
        {/* Title & Price Header */}
        <div>
          <span className="text-xs font-medium text-indigo-400 block mb-1">
            {product.category}
          </span>
          <h2 className="text-lg font-bold text-white leading-tight">
            {product.title}
          </h2>
          <div className="flex items-baseline gap-3 mt-2 flex-wrap">
            <span className="text-2xl font-bold font-mono text-slate-100 tabular-nums">
              {formatINR(product.price)}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Return Rate: <strong className="text-slate-200">{product.returnRate}%</strong>
            </span>
            <span className="text-xs text-amber-300 font-mono flex items-center gap-0.5">
              <Star className="w-3.5 h-3.5 fill-current" />
              {product.rating} ({product.reviewsCount.toLocaleString('en-IN')})
            </span>
          </div>
        </div>

        {/* Cluster Assignment Badge */}
        {cluster && (
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400">Assigned Cluster</span>
              <span
                className="font-semibold text-xs"
                style={{ color: clusterColor }}
              >
                Cluster {cluster.id + 1}
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-200 mb-1">
              {cluster.label}
            </div>
            <div className="text-[11px] text-slate-400">
              Co-exists with {cluster.products.length - 1} other items with {cluster.categoryPurity}% category purity.
            </div>
          </div>
        )}

        {/* Description */}
        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
          {product.description}
        </p>

        {/* Quantitative Feature Vectors */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>Clustering Feature Indices</span>
          </h4>

          <div className="space-y-2.5 text-xs font-mono">
            <div>
              <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                <span>Luxury / Brand Prestige Index</span>
                <span className="text-slate-200">{(feat.luxuryScore * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full"
                  style={{ width: `${feat.luxuryScore * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                <span>Technical / Specification Tier</span>
                <span className="text-slate-200">{(feat.technicalityScore * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-400 rounded-full"
                  style={{ width: `${feat.technicalityScore * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                <span>Eco / Sustainability Score</span>
                <span className="text-slate-200">{(feat.ecoScore * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full"
                  style={{ width: `${feat.ecoScore * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                <span>Trendiness / Indian Sales Velocity</span>
                <span className="text-slate-200">{(feat.trendinessScore * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-pink-400 rounded-full"
                  style={{ width: `${feat.trendinessScore * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Specs List */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Catalog Specifications
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950 p-3 rounded-lg border border-slate-800">
            {Object.entries(product.specs).map(([key, val]) => (
              <div key={key}>
                <span className="text-slate-500 block text-[10px] capitalize">
                  {key}
                </span>
                <span className="text-slate-300 truncate block">{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-indigo-400" />
            <span>Faceted Indian Tags ({product.tags.length})</span>
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {product.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] text-slate-300 bg-slate-800/90 border border-slate-700/80 px-2 py-0.5 rounded font-mono"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Nearest Mathematical Substitutes in India */}
        <div className="pt-2 border-t border-slate-800">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3 flex items-center justify-between">
            <span>Closest Substitutes in India</span>
            <span className="text-[10px] text-indigo-400 font-mono">
              Top 5 Nearest
            </span>
          </h4>

          <div className="space-y-2.5">
            {nearestSubstitutes.map((sub) => {
              const subClusterId = clusterMap.get(sub.product.id) ?? 0;
              const subColor = clusters[subClusterId]?.color ?? '#64748B';

              return (
                <div
                  key={sub.product.id}
                  className="bg-slate-950 border border-slate-800/80 hover:border-slate-700 p-3 rounded-lg transition-colors flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: subColor }}
                        />
                        <span className="text-[10px] font-mono text-slate-400">
                          {sub.product.brand}
                        </span>
                      </div>
                      <h5 className="text-xs font-semibold text-slate-200">
                        {sub.product.title}
                      </h5>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-bold text-cyan-400 block">
                        {(sub.sim * 100).toFixed(0)}% sim
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {formatINR(sub.product.price)}{' '}
                        {sub.priceDiff !== 0 && (
                          <span
                            className={
                              sub.priceDiff > 0 ? 'text-amber-400' : 'text-emerald-400'
                            }
                          >
                            ({sub.priceDiff > 0 ? `+${formatINR(sub.priceDiff)}` : `-${formatINR(Math.abs(sub.priceDiff))}`})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[11px]">
                    <span className="text-slate-500 font-mono">
                      {sub.product.category}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectProduct(sub.product)}
                        className="text-indigo-400 hover:text-indigo-300 font-medium"
                      >
                        Inspect
                      </button>
                      <button
                        onClick={() => onCompareWith(product, sub.product)}
                        className="text-slate-300 hover:text-white bg-slate-800 px-2 py-0.5 rounded"
                      >
                        Compare
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
