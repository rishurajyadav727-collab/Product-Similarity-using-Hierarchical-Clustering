import React from 'react';
import { Product, ClusterInfo } from '../types/product';
import { formatINR } from '../utils/formatters';
import { X, Check, ArrowRight, Star, AlertCircle } from 'lucide-react';

interface ProductComparatorModalProps {
  productA: Product;
  productB: Product;
  onClose: () => void;
  similarity: number;
  clusters: ClusterInfo[];
  clusterMap: Map<string, number>;
}

export const ProductComparatorModal: React.FC<ProductComparatorModalProps> = ({
  productA,
  productB,
  onClose,
  similarity,
  clusters,
  clusterMap,
}) => {
  const clusterA = clusters[clusterMap.get(productA.id) ?? 0];
  const clusterB = clusters[clusterMap.get(productB.id) ?? 0];

  const priceDiff = Math.abs(productA.price - productB.price);
  const cheaperProduct = productA.price <= productB.price ? productA : productB;
  const pricierProduct = productA.price > productB.price ? productA : productB;

  // Shared vs unique tags
  const tagsA = new Set(productA.tags);
  const tagsB = new Set(productB.tags);
  const sharedTags = productA.tags.filter((t) => tagsB.has(t));
  const uniqueA = productA.tags.filter((t) => !tagsB.has(t));
  const uniqueB = productB.tags.filter((t) => !tagsA.has(t));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-white">
              Pairwise Product Relationship Comparator
            </h3>
            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-800/80 px-2.5 py-0.5 rounded">
              {(similarity * 100).toFixed(1)}% Similarity
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Comparison Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Side by side product cards in INR */}
          <div className="grid grid-cols-2 gap-4">
            {/* Product A */}
            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>{productA.brand}</span>
                <span
                  className="px-2 py-0.5 rounded text-[10px]"
                  style={{
                    backgroundColor: `${clusterA?.color}22`,
                    color: clusterA?.color,
                  }}
                >
                  Cluster {clusterA ? clusterA.id + 1 : 1}
                </span>
              </div>
              <h4 className="text-sm font-semibold text-slate-100">
                {productA.title}
              </h4>
              <div className="text-xs text-slate-400">{productA.category}</div>
              <div className="flex items-baseline justify-between pt-1 border-t border-slate-800">
                <span className="text-xl font-bold font-mono text-slate-100">
                  {formatINR(productA.price)}
                </span>
                <span className="text-xs font-mono text-amber-300">
                  ★ {productA.rating} ({productA.reviewsCount.toLocaleString('en-IN')})
                </span>
              </div>
            </div>

            {/* Product B */}
            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>{productB.brand}</span>
                <span
                  className="px-2 py-0.5 rounded text-[10px]"
                  style={{
                    backgroundColor: `${clusterB?.color}22`,
                    color: clusterB?.color,
                  }}
                >
                  Cluster {clusterB ? clusterB.id + 1 : 1}
                </span>
              </div>
              <h4 className="text-sm font-semibold text-slate-100">
                {productB.title}
              </h4>
              <div className="text-xs text-slate-400">{productB.category}</div>
              <div className="flex items-baseline justify-between pt-1 border-t border-slate-800">
                <span className="text-xl font-bold font-mono text-slate-100">
                  {formatINR(productB.price)}
                </span>
                <span className="text-xs font-mono text-amber-300">
                  ★ {productB.rating} ({productB.reviewsCount.toLocaleString('en-IN')})
                </span>
              </div>
            </div>
          </div>

          {/* Merchandising Assessment */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-lg text-xs space-y-1">
            <span className="font-semibold text-slate-200 block text-xs">
              Indian Marketplace Merchandising Diagnosis:
            </span>
            {similarity >= 0.88 ? (
              <p className="text-amber-200/90 leading-relaxed">
                Critical substitute pair in India. With {(similarity * 100).toFixed(0)}% mathematical affinity and only a {formatINR(priceDiff)} delta, customers on Amazon India / Flipkart will view these as direct substitutes. Stagger festive discounts or bundle with accessories.
              </p>
            ) : (
              <p className="text-indigo-200/90 leading-relaxed">
                Complementary affinity. These products share core Indian shopper lifestyle traits while providing distinct utility. Recommended for "Frequently Bought Together" cart add-on bundles.
              </p>
            )}
          </div>

          {/* Feature Comparison Radar Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Normalized Attribute Comparison
            </h4>

            <div className="space-y-2 text-xs font-mono bg-slate-950 p-4 rounded-lg border border-slate-800">
              <div>
                <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                  <span>Luxury / Brand Prestige Index</span>
                  <span>
                    {(productA.features.luxuryScore * 100).toFixed(0)}% vs{' '}
                    {(productB.features.luxuryScore * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${productA.features.luxuryScore * 100}%` }}
                    />
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 rounded-full"
                      style={{ width: `${productB.features.luxuryScore * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                  <span>Technical / Spec Complexity</span>
                  <span>
                    {(productA.features.technicalityScore * 100).toFixed(0)}% vs{' '}
                    {(productB.features.technicalityScore * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{
                        width: `${productA.features.technicalityScore * 100}%`,
                      }}
                    />
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 rounded-full"
                      style={{
                        width: `${productB.features.technicalityScore * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                  <span>Sustainability / Eco Score</span>
                  <span>
                    {(productA.features.ecoScore * 100).toFixed(0)}% vs{' '}
                    {(productB.features.ecoScore * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${productA.features.ecoScore * 100}%` }}
                    />
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 rounded-full"
                      style={{ width: `${productB.features.ecoScore * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Shared Tags vs Unique Tags */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Taxonomy & Tag Intersection
            </h4>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">
                  Shared Overlapping Tags ({sharedTags.length}):
                </span>
                <div className="flex flex-wrap gap-1">
                  {sharedTags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                  {sharedTags.length === 0 && (
                    <span className="text-[11px] text-slate-500 italic">None</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-1">
                    Unique to {productA.brand}:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {uniqueA.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-mono text-slate-300 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-1">
                    Unique to {productB.brand}:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {uniqueB.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-mono text-slate-300 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded transition-colors"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};
