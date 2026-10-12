import React, { useState } from 'react';
import {
  LinkageMethod,
  DistanceMetric,
  ClusteringWeights,
  Product,
  ClusterInfo,
  DendrogramNode,
} from '../types/product';
import { DATASETS, CatalogDataset } from '../data/datasets';
import {
  Sliders,
  Download,
  Database,
  GitBranch,
  Layers,
  ChevronDown,
  FileSpreadsheet,
  FileCode,
  Sparkles,
} from 'lucide-react';

interface ControlToolbarProps {
  currentDataset: CatalogDataset;
  onSelectDataset: (dataset: CatalogDataset) => void;
  linkage: LinkageMethod;
  onLinkageChange: (linkage: LinkageMethod) => void;
  metric: DistanceMetric;
  onMetricChange: (metric: DistanceMetric) => void;
  weights: ClusteringWeights;
  onWeightsChange: (weights: ClusteringWeights) => void;
  threshold: number;
  onThresholdChange: (threshold: number) => void;
  targetK: number;
  onTargetKChange: (k: number) => void;
  clusters: ClusterInfo[];
  products: Product[];
  root: DendrogramNode;
  simMatrix: number[][];
  clusterMap: Map<string, number>;
}

export const ControlToolbar: React.FC<ControlToolbarProps> = ({
  currentDataset,
  onSelectDataset,
  linkage,
  onLinkageChange,
  metric,
  onMetricChange,
  weights,
  onWeightsChange,
  threshold,
  onThresholdChange,
  targetK,
  onTargetKChange,
  clusters,
  products,
  root,
  simMatrix,
  clusterMap,
}) => {
  const [isWeightsOpen, setIsWeightsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [cutMode, setCutMode] = useState<'threshold' | 'clusters'>('threshold');

  // Export CSV
  const exportCSV = () => {
    const headers = [
      'SKU',
      'Title',
      'Brand',
      'Catalog Category',
      'Price (₹ INR)',
      'Assigned Cluster ID',
      'Cluster Label',
      'Dominant Cluster Category',
      'Taxonomy Aligned',
    ];

    const rows = products.map((p) => {
      const cId = clusterMap.get(p.id) ?? 0;
      const c = clusters[cId];
      const isAligned = c ? p.category === c.dominantCategory : false;

      return [
        `"${p.sku}"`,
        `"${p.title.replace(/"/g, '""')}"`,
        `"${p.brand}"`,
        `"${p.category}"`,
        p.price,
        cId + 1,
        `"${c?.label || ''}"`,
        `"${c?.dominantCategory || ''}"`,
        isAligned ? 'YES' : 'NO (DRIFT)',
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `clustr_ecommerce_${currentDataset.id}_k${clusters.length}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportOpen(false);
  };

  // Export Dendrogram JSON
  const exportJSON = () => {
    const data = {
      dataset: currentDataset.id,
      productsCount: products.length,
      clustersCount: clusters.length,
      cutThreshold: threshold,
      linkageMethod: linkage,
      distanceMetric: metric,
      weights,
      clusters: clusters.map((c) => ({
        id: c.id,
        label: c.label,
        dominantCategory: c.dominantCategory,
        categoryPurity: c.categoryPurity,
        avgPrice: c.avgPrice,
        itemsCount: c.products.length,
        items: c.products.map((p) => ({
          sku: p.sku,
          title: p.title,
          brand: p.brand,
          category: p.category,
          price: p.price,
        })),
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `dendrogram_tree_${currentDataset.id}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportOpen(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left Section: Dataset & Clustering Algorithm Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Dataset Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Dataset:</span>
            <select
              value={currentDataset.id}
              onChange={(e) => {
                const found = DATASETS.find((d) => d.id === e.target.value);
                if (found) onSelectDataset(found);
              }}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-500"
            >
              {DATASETS.map((ds) => (
                <option key={ds.id} value={ds.id}>
                  {ds.name} ({ds.products.length} items)
                </option>
              ))}
            </select>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Linkage Method */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Linkage:</span>
            <select
              value={linkage}
              onChange={(e) => onLinkageChange(e.target.value as LinkageMethod)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="ward">Ward (Min Variance)</option>
              <option value="complete">Complete (Max Distance)</option>
              <option value="average">Average (UPGMA)</option>
              <option value="single">Single (Nearest Neighbor)</option>
            </select>
          </div>

          {/* Distance Metric */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Metric:</span>
            <select
              value={metric}
              onChange={(e) => onMetricChange(e.target.value as DistanceMetric)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="cosine">Cosine (Features & Tags)</option>
              <option value="euclidean">Euclidean (Geometric)</option>
              <option value="manhattan">Manhattan (L1 Robust)</option>
            </select>
          </div>

          {/* Weights Drawer Toggle */}
          <div className="relative">
            <button
              onClick={() => setIsWeightsOpen(!isWeightsOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                isWeightsOpen
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Feature Weights</span>
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </button>

            {/* Weights Popover */}
            {isWeightsOpen && (
              <div className="absolute left-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-2xl z-40 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h4 className="text-xs font-semibold text-white">
                    Clustering Attribute Weights
                  </h4>
                  <button
                    onClick={() =>
                      onWeightsChange({
                        priceWeight: 1.0,
                        specsWeight: 1.0,
                        tagsWeight: 1.0,
                        brandWeight: 0.5,
                      })
                    }
                    className="text-[10px] text-indigo-400 hover:text-indigo-300"
                  >
                    Reset Defaults
                  </button>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>Price Sensitivity</span>
                    <span className="font-mono text-indigo-400">
                      {weights.priceWeight.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.1"
                    value={weights.priceWeight}
                    onChange={(e) =>
                      onWeightsChange({
                        ...weights,
                        priceWeight: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>Technical & Luxury Specs</span>
                    <span className="font-mono text-indigo-400">
                      {weights.specsWeight.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.1"
                    value={weights.specsWeight}
                    onChange={(e) =>
                      onWeightsChange({
                        ...weights,
                        specsWeight: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>Facet Tags & Material Overlap</span>
                    <span className="font-mono text-indigo-400">
                      {weights.tagsWeight.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.1"
                    value={weights.tagsWeight}
                    onChange={(e) =>
                      onWeightsChange({
                        ...weights,
                        tagsWeight: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div className="pt-1 text-[10px] text-slate-500">
                  Weights modify the mathematical feature vectors before computing pairwise distance.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Cluster Formation Mode & Export */}
        <div className="flex items-center gap-3">
          {/* Toggle between Distance Threshold vs Target K */}
          <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setCutMode('threshold')}
              className={`px-2.5 py-1 rounded transition-colors ${
                cutMode === 'threshold'
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cut Distance: {threshold.toFixed(2)}
            </button>
            <button
              onClick={() => setCutMode('clusters')}
              className={`px-2.5 py-1 rounded transition-colors ${
                cutMode === 'clusters'
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Clusters (K={clusters.length})
            </button>
          </div>

          {cutMode === 'clusters' ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="font-mono text-slate-200">K={targetK}</span>
              <input
                type="range"
                min="2"
                max={Math.min(12, products.length)}
                step="1"
                value={targetK}
                onChange={(e) => onTargetKChange(parseInt(e.target.value))}
                className="w-24 accent-indigo-500 cursor-pointer"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="font-mono text-slate-200">d={threshold.toFixed(2)}</span>
              <input
                type="range"
                min="0.05"
                max="0.95"
                step="0.01"
                value={threshold}
                onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
                className="w-24 accent-indigo-500 cursor-pointer"
              />
            </div>
          )}

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {isExportOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-40 overflow-hidden text-xs">
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-slate-200 hover:bg-slate-800 text-left transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Catalog Analysis (CSV)</span>
                </button>
                <button
                  onClick={exportJSON}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-slate-200 hover:bg-slate-800 text-left transition-colors border-t border-slate-800"
                >
                  <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Dendrogram Tree (JSON)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
