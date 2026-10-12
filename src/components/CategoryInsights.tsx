import React, { useState } from 'react';
import {
  ClusterInfo,
  Product,
  CannibalizationPair,
  CrossCategorySynergy,
} from '../types/product';
import { formatINR } from '../utils/formatters';
import {
  Layers,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Tag,
  DollarSign,
  Shuffle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface CategoryInsightsProps {
  clusters: ClusterInfo[];
  products: Product[];
  cannibalizationPairs: CannibalizationPair[];
  synergies: CrossCategorySynergy[];
  onSelectProduct: (product: Product) => void;
  selectedProductId: string | null;
}

export const CategoryInsights: React.FC<CategoryInsightsProps> = ({
  clusters,
  products,
  cannibalizationPairs,
  synergies,
  onSelectProduct,
  selectedProductId,
}) => {
  const [activeTab, setActiveTab] = useState<'clusters' | 'cannibalization' | 'drift' | 'bundles'>('clusters');
  const [expandedClusterId, setExpandedClusterId] = useState<number | null>(null);

  // Overall catalog metrics
  const totalProducts = products.length;
  const weightedPurity = clusters.length > 0
    ? (
        clusters.reduce((acc, c) => acc + c.categoryPurity * c.products.length, 0) /
        (totalProducts || 1)
      ).toFixed(1)
    : '0.0';

  const avgCoherence = clusters.length > 0
    ? (
        (clusters.reduce((acc, c) => acc + c.coherenceScore, 0) / clusters.length) * 100
      ).toFixed(1)
    : '0.0';

  // Find products that are taxonomy outliers (their category != cluster dominant category)
  const driftProducts = clusters.flatMap((c) => {
    return c.products
      .filter((p) => p.category !== c.dominantCategory)
      .map((p) => ({
        product: p,
        clusterLabel: c.label,
        dominantCategory: c.dominantCategory,
        clusterColor: c.color,
      }));
  });

  return (
    <div className="space-y-6">
      {/* Top Level Strategic Catalog Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">India Taxonomy Purity</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100 tabular-nums">
              {weightedPurity}%
            </span>
            <span className="text-xs text-slate-400">
              {Number(weightedPurity) > 75 ? 'Strong marketplace alignment' : 'Cross-category diffusion'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Measures how cleanly existing marketplace category departments match mathematical clustering across Indian consumer traits.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Intra-Cluster Coherence</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100 tabular-nums">
              {avgCoherence}%
            </span>
            <span className="text-xs text-slate-400">
              Across {clusters.length} Indian clusters
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Average feature similarity within discovered clusters; shows persona cohesion in price-sensitive Indian e-commerce.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Cannibalization Risk</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
              {cannibalizationPairs.length}
            </span>
            <span className="text-xs text-slate-400">
              Near-duplicate pairs (&gt;86% sim)
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Identifies overlapping products (e.g. boAt vs Noise at ₹1,099 vs ₹1,299) dividing Indian shopper clicks.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Cross-Sell Synergies</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-purple-400 tabular-nums">
              {synergies.length}
            </span>
            <span className="text-xs text-slate-400">
              Multi-category bundles
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Natural cross-department Indian merchandising combos (e.g. Kurta + Kolhapuri Chappals, or Laptop + TWS earbuds).
          </p>
        </div>
      </div>

      {/* Main Tabbed Analysis Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex-wrap gap-4">
          <div className="flex items-center gap-1 p-1 bg-slate-800/90 border border-slate-700/80 rounded-lg">
            <button
              onClick={() => setActiveTab('clusters')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'clusters'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Discovered Clusters ({clusters.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('cannibalization')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'cannibalization'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Cannibalization Risks ({cannibalizationPairs.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('drift')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'drift'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Taxonomy Drift ({driftProducts.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('bundles')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'bundles'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Cross-Sell Bundles ({synergies.length})</span>
            </button>
          </div>

          <div className="text-xs text-slate-400">
            Click any product to inspect mathematical affinity & substitutes
          </div>
        </div>

        {/* Tab 1: Discovered Clusters Breakdown */}
        {activeTab === 'clusters' && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clusters.map((cluster) => {
                const isExpanded = expandedClusterId === cluster.id;
                return (
                  <div
                    key={cluster.id}
                    className="bg-slate-950/70 border border-slate-800 rounded-lg p-4.5 hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Cluster Header */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0"
                            style={{ backgroundColor: cluster.color }}
                          />
                          <div>
                            <h3 className="text-sm font-semibold text-slate-100">
                              {cluster.label}
                            </h3>
                            <span className="text-[11px] text-slate-400 font-mono">
                              Dominant: {cluster.dominantCategory} · Purity: {cluster.categoryPurity}%
                            </span>
                          </div>
                        </div>

                        <span className="text-xs font-mono font-semibold text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 shrink-0">
                          {cluster.products.length} Products
                        </span>
                      </div>

                      {/* Cluster Metrics Grid in INR */}
                      <div className="grid grid-cols-4 gap-2 py-2.5 border-y border-slate-800/80 my-3 text-[11px] font-mono">
                        <div>
                          <span className="text-slate-500 block text-[10px]">Avg Price</span>
                          <span className="text-slate-200 font-medium">{formatINR(cluster.avgPrice)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Price Spread</span>
                          <span className="text-slate-300">{formatINR(cluster.minPrice)}–{formatINR(cluster.maxPrice)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Avg Rating</span>
                          <span className="text-amber-300 font-medium">★ {cluster.avgRating}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Coherence</span>
                          <span className="text-indigo-300 font-medium">{(cluster.coherenceScore * 100).toFixed(0)}%</span>
                        </div>
                      </div>

                      {/* Top Characteristic Tags */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-3">
                        <Tag className="w-3 h-3 text-slate-500 shrink-0" />
                        {cluster.topTags.map((t) => (
                          <span
                            key={t.tag}
                            className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded font-mono"
                          >
                            {t.tag} ({t.count})
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Member Products Preview */}
                    <div>
                      <div className="space-y-1.5 mb-2">
                        {(isExpanded ? cluster.products : cluster.products.slice(0, 3)).map((prod) => (
                          <div
                            key={prod.id}
                            onClick={() => onSelectProduct(prod)}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs cursor-pointer transition-colors ${
                              selectedProductId === prod.id
                                ? 'bg-indigo-950/80 border border-indigo-700/60 text-white'
                                : 'bg-slate-900/60 hover:bg-slate-800/80 text-slate-300'
                            }`}
                          >
                            <span className="truncate pr-2">
                              {prod.brand} {prod.title}
                            </span>
                            <span className="font-mono text-slate-400 shrink-0 text-[11px]">
                              {formatINR(prod.price)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {cluster.products.length > 3 && (
                        <button
                          onClick={() => setExpandedClusterId(isExpanded ? null : cluster.id)}
                          className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors pt-1"
                        >
                          {isExpanded ? (
                            <>
                              <span>Show fewer items</span>
                              <ChevronUp className="w-3 h-3" />
                            </>
                          ) : (
                            <>
                              <span>+{cluster.products.length - 3} more items in cluster</span>
                              <ChevronDown className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Cannibalization Risk Detector */}
        {activeTab === 'cannibalization' && (
          <div className="p-6 space-y-4">
            <div className="bg-amber-950/20 border border-amber-900/40 p-4 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200/90 leading-relaxed">
                <span className="font-semibold text-amber-100 block mb-0.5">
                  Indian Marketplace Cannibalization Vulnerability
                </span>
                These product pairs share more than 86% feature similarity in the Indian market. On platforms like Flipkart and Amazon India, launching close substitutes at near-identical price points causes search ad bid competition against yourself and causes shopper hesitation.
              </div>
            </div>

            {cannibalizationPairs.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No high-risk cannibalization pairs detected at this threshold.
              </div>
            ) : (
              <div className="space-y-3">
                {cannibalizationPairs.map((pair, idx) => (
                  <div
                    key={`cannibal-${idx}`}
                    className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded">
                          {(pair.similarity * 100).toFixed(0)}% Similarity
                        </span>
                        <span className="text-xs text-slate-400">
                          Price Delta: <strong className="font-mono text-slate-200">{formatINR(pair.priceDiff)}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div
                          onClick={() => onSelectProduct(pair.productA)}
                          className="p-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded cursor-pointer transition-colors"
                        >
                          <div className="text-[10px] text-slate-500 font-mono uppercase">
                            {pair.productA.brand} · SKU: {pair.productA.sku}
                          </div>
                          <div className="text-xs font-semibold text-slate-200 truncate">
                            {pair.productA.title}
                          </div>
                          <div className="text-[11px] font-mono text-indigo-300 mt-1">
                            {formatINR(pair.productA.price)} · ★ {pair.productA.rating}
                          </div>
                        </div>

                        <div
                          onClick={() => onSelectProduct(pair.productB)}
                          className="p-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded cursor-pointer transition-colors"
                        >
                          <div className="text-[10px] text-slate-500 font-mono uppercase">
                            {pair.productB.brand} · SKU: {pair.productB.sku}
                          </div>
                          <div className="text-xs font-semibold text-slate-200 truncate">
                            {pair.productB.title}
                          </div>
                          <div className="text-[11px] font-mono text-indigo-300 mt-1">
                            {formatINR(pair.productB.price)} · ★ {pair.productB.rating}
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 pt-1 italic">
                        {pair.reason}
                      </p>
                    </div>

                    <div className="shrink-0 flex flex-col gap-2">
                      <button
                        onClick={() => onSelectProduct(pair.productA)}
                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors"
                      >
                        Compare Pair
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Taxonomy Drift & Misclassification */}
        {activeTab === 'drift' && (
          <div className="p-6 space-y-4">
            <div className="bg-indigo-950/20 border border-indigo-900/40 p-4 rounded-lg flex items-start gap-3">
              <Shuffle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-200/90 leading-relaxed">
                <span className="font-semibold text-indigo-100 block mb-0.5">
                  Cross-Category Drift (Taxonomy Mismatches in India)
                </span>
                These products belong to a specific department in your catalog, yet hierarchical clustering places them in a cluster dominated by a different category. Ideal for identifying cross-category products (e.g., smart plugs bridging Electricals and Smart Home).
              </div>
            </div>

            {driftProducts.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                Perfect alignment! All products clustered inside their primary catalog department.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {driftProducts.map((item, idx) => (
                  <div
                    key={`drift-${idx}`}
                    onClick={() => onSelectProduct(item.product)}
                    className="bg-slate-950/70 border border-slate-800 p-4 rounded-lg hover:border-slate-700 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-mono text-slate-400 text-[11px]">
                        {item.product.brand} · {formatINR(item.product.price)}
                      </span>
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: item.clusterColor }}
                      />
                    </div>

                    <h4 className="text-sm font-semibold text-slate-100 mb-2 truncate">
                      {item.product.title}
                    </h4>

                    <div className="grid grid-cols-2 gap-2 text-xs py-2 bg-slate-900/80 px-2.5 rounded border border-slate-800/80">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Tagged Category</span>
                        <span className="text-amber-300 font-medium">{item.product.category}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Behaves Like</span>
                        <span className="text-indigo-300 font-medium">{item.dominantCategory}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                      Merchandising Action: Create multi-category navigation links or feature in "{item.dominantCategory}" festive sales banners.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Cross-Category Synergy & Bundling */}
        {activeTab === 'bundles' && (
          <div className="p-6 space-y-4">
            <div className="bg-purple-950/20 border border-purple-900/40 p-4 rounded-lg flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div className="text-xs text-purple-200/90 leading-relaxed">
                <span className="font-semibold text-purple-100 block mb-0.5">
                  High-Affinity Cross-Sell Bundling for India
                </span>
                Hierarchical clustering uncovered these distinct categories co-existing within single branches. Perfect for festive Diwali hampers, combo offers, and "Frequently Bought Together" recommendation widgets.
              </div>
            </div>

            {synergies.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No multi-category clusters at current threshold. Lower the threshold or select complete linkage to surface broader affinity groupings.
              </div>
            ) : (
              <div className="space-y-4">
                {synergies.map((syn, idx) => (
                  <div
                    key={`synergy-${idx}`}
                    className="bg-slate-950/70 border border-slate-800 rounded-lg p-5"
                  >
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <h4 className="text-sm font-semibold text-purple-200">
                        {syn.clusterTitle}
                      </h4>
                      <span className="text-[11px] font-mono text-purple-400 bg-purple-950/60 border border-purple-800/60 px-2.5 py-0.5 rounded">
                        {syn.categories.length} Indian Categories Combined
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                      {syn.explanation}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {syn.recommendedBundle.map((prod) => (
                        <div
                          key={prod.id}
                          onClick={() => onSelectProduct(prod)}
                          className="bg-slate-900 border border-slate-800 p-3 rounded-lg hover:border-slate-700 transition-colors cursor-pointer"
                        >
                          <span className="text-[10px] text-purple-400 font-mono block">
                            {prod.category}
                          </span>
                          <span className="text-xs font-semibold text-slate-200 block truncate my-1">
                            {prod.title}
                          </span>
                          <span className="text-xs font-mono text-slate-300">
                            {formatINR(prod.price)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
