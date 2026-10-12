/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { DATASETS, CatalogDataset } from './data/datasets';
import {
  Product,
  LinkageMethod,
  DistanceMetric,
  ClusteringWeights,
} from './types/product';
import {
  performHierarchicalClustering,
  cutDendrogramAtThreshold,
  findThresholdForKClusters,
  detectCannibalizationPairs,
  detectCrossCategorySynergies,
  compute2DProjection,
} from './utils/clustering';
import { formatINR } from './utils/formatters';
import { Dendrogram } from './components/Dendrogram';
import { CategoryInsights } from './components/CategoryInsights';
import { SimilarityMatrix } from './components/SimilarityMatrix';
import { ProjectionSpace2D } from './components/ProjectionSpace2D';
import { ProductCatalogTable } from './components/ProductCatalogTable';
import { ProductInspector } from './components/ProductInspector';
import { ProductComparatorModal } from './components/ProductComparatorModal';
import { ControlToolbar } from './components/ControlToolbar';
import {
  GitBranch,
  Layers,
  Grid,
  Compass,
  Table,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export default function App() {
  // Catalog & Products state
  const [currentDataset, setCurrentDataset] = useState<CatalogDataset>(DATASETS[0]);
  const [activeProducts, setActiveProducts] = useState<Product[]>(DATASETS[0].products);

  // Clustering Hyperparameters
  const [linkage, setLinkage] = useState<LinkageMethod>('ward');
  const [metric, setMetric] = useState<DistanceMetric>('cosine');
  const [weights, setWeights] = useState<ClusteringWeights>({
    priceWeight: 1.0,
    specsWeight: 1.0,
    tagsWeight: 1.0,
    brandWeight: 0.5,
  });

  // Cutting threshold
  const [threshold, setThreshold] = useState<number>(0.48);
  const [targetK, setTargetK] = useState<number>(5);

  // View Navigation
  const [activeTab, setActiveTab] = useState<
    'dendrogram' | 'insights' | 'matrix' | 'projection' | 'catalog'
  >('dendrogram');

  // Inspection & Comparison modals
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [comparatorPair, setComparatorPair] = useState<{
    productA: Product;
    productB: Product;
  } | null>(null);

  // When dataset changes, sync activeProducts
  const handleSelectDataset = (newDataset: CatalogDataset) => {
    setCurrentDataset(newDataset);
    setActiveProducts(newDataset.products);
    setSelectedProduct(null);
    setComparatorPair(null);
  };

  // Perform Hierarchical Clustering
  const clusteringResult = useMemo(() => {
    return performHierarchicalClustering(
      activeProducts,
      weights,
      linkage,
      metric
    );
  }, [activeProducts, weights, linkage, metric]);

  const { root, simMatrix, rawDistMatrix } = clusteringResult;

  // Cut Tree at threshold
  const { clusters, productToClusterMap } = useMemo(() => {
    return cutDendrogramAtThreshold(root, threshold, activeProducts, simMatrix);
  }, [root, threshold, activeProducts, simMatrix]);

  // Handle changing target K clusters
  const handleTargetKChange = (newK: number) => {
    setTargetK(newK);
    const calculatedThreshold = findThresholdForKClusters(
      root,
      newK,
      activeProducts,
      simMatrix
    );
    setThreshold(calculatedThreshold);
  };

  // Detect cannibalization pairs
  const cannibalizationPairs = useMemo(() => {
    return detectCannibalizationPairs(activeProducts, simMatrix, 0.86);
  }, [activeProducts, simMatrix]);

  // Detect cross-category bundle synergies
  const synergies = useMemo(() => {
    return detectCrossCategorySynergies(clusters);
  }, [clusters]);

  // 2D MDS Projection
  const points2D = useMemo(() => {
    return compute2DProjection(activeProducts, rawDistMatrix, productToClusterMap);
  }, [activeProducts, rawDistMatrix, productToClusterMap]);

  // Add / remove products
  const handleAddProduct = (newProd: Product) => {
    setActiveProducts((prev) => [newProd, ...prev]);
  };

  const handleRemoveProduct = (prodId: string) => {
    setActiveProducts((prev) => prev.filter((p) => p.id !== prodId));
    if (selectedProduct?.id === prodId) setSelectedProduct(null);
  };

  // Pair comparison trigger
  const handleCompareProducts = (pA: Product, pB: Product) => {
    setComparatorPair({ productA: pA, productB: pB });
  };

  const pairSimilarity = useMemo(() => {
    if (!comparatorPair) return 0;
    const idxA = activeProducts.findIndex((p) => p.id === comparatorPair.productA.id);
    const idxB = activeProducts.findIndex((p) => p.id === comparatorPair.productB.id);
    if (idxA !== -1 && idxB !== -1) {
      return simMatrix[idxA][idxB];
    }
    return 0;
  }, [comparatorPair, activeProducts, simMatrix]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 
        TOP BAR CONTRACT:
        Zone 1: Single text wordmark
        Zone 2: 4-5 concise single-line text nav links
        Zone 3: 1 primary action
      */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30">
        {/* Zone 1: Brand title */}
        <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
          <GitBranch className="w-5 h-5 text-indigo-400" />
          <span className="text-lg font-bold tracking-tight text-white">
            Clustr India
          </span>
        </div>

        {/* Zone 2: 4-5 nav links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400">
          <button
            onClick={() => setActiveTab('dendrogram')}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              activeTab === 'dendrogram'
                ? 'text-white font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            Dendrogram Tree
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              activeTab === 'insights'
                ? 'text-white font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            Category Insights
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              activeTab === 'matrix'
                ? 'text-white font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            Similarity Matrix
          </button>
          <button
            onClick={() => setActiveTab('projection')}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              activeTab === 'projection'
                ? 'text-white font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            2D MDS Space
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              activeTab === 'catalog'
                ? 'text-white font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            Catalog Explorer
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              // Trigger quick recalculation / reset cut threshold
              setThreshold(0.48);
              setTargetK(5);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recalculate Clusters</span>
          </button>
        </div>
      </header>

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-6 space-y-6">
        {/* Editorial Subheader & Domain Breadcrumb */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-900">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mb-1">
              <span>Indian E-Commerce Intelligence</span>
              <span>/</span>
              <span>Amazon.in · Flipkart · Myntra · Tata CLiQ</span>
              <span>/</span>
              <span className="text-indigo-400">{currentDataset.name}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Indian Product Similarity & Hierarchical Taxonomy
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Explore mathematical merchandise proximity across popular products available in India. Audit category purity, detect cannibalization across INR price tiers, and uncover high-margin cross-sell bundles.
            </p>
          </div>

          {/* Quick Metrics Strip */}
          <div className="flex items-center gap-4 text-xs font-mono bg-slate-900/60 border border-slate-800 px-4 py-2.5 rounded-xl shrink-0">
            <div>
              <span className="text-slate-500 block text-[10px]">Catalog Size</span>
              <span className="text-slate-200 font-semibold">{activeProducts.length} Products</span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <span className="text-slate-500 block text-[10px]">Active Clusters</span>
              <span className="text-indigo-400 font-semibold">{clusters.length} Groups</span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <span className="text-slate-500 block text-[10px]">Linkage</span>
              <span className="text-slate-200 capitalize">{linkage}</span>
            </div>
          </div>
        </div>

        {/* Algorithm & Dataset Parameter Control Strip */}
        <ControlToolbar
          currentDataset={currentDataset}
          onSelectDataset={handleSelectDataset}
          linkage={linkage}
          onLinkageChange={setLinkage}
          metric={metric}
          onMetricChange={setMetric}
          weights={weights}
          onWeightsChange={setWeights}
          threshold={threshold}
          onThresholdChange={setThreshold}
          targetK={targetK}
          onTargetKChange={handleTargetKChange}
          clusters={clusters}
          products={activeProducts}
          root={root}
          simMatrix={simMatrix}
          clusterMap={productToClusterMap}
        />

        {/* View Mode Tabs (mobile fallback & quick segmented control) */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg w-fit md:hidden">
          <button
            onClick={() => setActiveTab('dendrogram')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              activeTab === 'dendrogram' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            Dendrogram
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              activeTab === 'insights' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            Insights
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              activeTab === 'matrix' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            Matrix
          </button>
          <button
            onClick={() => setActiveTab('projection')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              activeTab === 'projection' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            2D Space
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              activeTab === 'catalog' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            Catalog
          </button>
        </div>

        {/* Active Visualizer Panels */}
        {activeTab === 'dendrogram' && (
          <div className="space-y-6">
            <Dendrogram
              root={root}
              products={activeProducts}
              threshold={threshold}
              onThresholdChange={setThreshold}
              clusters={clusters}
              selectedProductId={selectedProduct?.id ?? null}
              onSelectProduct={setSelectedProduct}
              clusterMap={productToClusterMap}
            />

            {/* Quick Summary of Top Clusters Underneath Dendrogram */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {clusters.slice(0, 3).map((c) => (
                <div
                  key={c.id}
                  onClick={() => setActiveTab('insights')}
                  className="p-4 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="text-xs font-semibold text-slate-200">
                      Cluster {c.id + 1}: {c.label}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between text-xs font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                    <span>{c.products.length} Products</span>
                    <span className="text-slate-200">Avg {formatINR(c.avgPrice)}</span>
                    <span className="text-emerald-400">Purity {c.categoryPurity}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <CategoryInsights
            clusters={clusters}
            products={activeProducts}
            cannibalizationPairs={cannibalizationPairs}
            synergies={synergies}
            onSelectProduct={setSelectedProduct}
            selectedProductId={selectedProduct?.id ?? null}
          />
        )}

        {activeTab === 'matrix' && (
          <SimilarityMatrix
            products={activeProducts}
            simMatrix={simMatrix}
            root={root}
            clusters={clusters}
            clusterMap={productToClusterMap}
            onSelectProduct={setSelectedProduct}
            onCompareProducts={handleCompareProducts}
          />
        )}

        {activeTab === 'projection' && (
          <ProjectionSpace2D
            points={points2D}
            clusters={clusters}
            clusterMap={productToClusterMap}
            selectedProductId={selectedProduct?.id ?? null}
            onSelectProduct={setSelectedProduct}
            simMatrix={simMatrix}
            products={activeProducts}
          />
        )}

        {activeTab === 'catalog' && (
          <ProductCatalogTable
            products={activeProducts}
            clusters={clusters}
            clusterMap={productToClusterMap}
            selectedProductId={selectedProduct?.id ?? null}
            onSelectProduct={setSelectedProduct}
            onAddProduct={handleAddProduct}
            onRemoveProduct={handleRemoveProduct}
          />
        )}
      </main>

      {/* Product Deep Inspector Drawer */}
      <ProductInspector
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        clusters={clusters}
        clusterMap={productToClusterMap}
        allProducts={activeProducts}
        simMatrix={simMatrix}
        onSelectProduct={setSelectedProduct}
        onCompareWith={(pA, pB) => setComparatorPair({ productA: pA, productB: pB })}
      />

      {/* Pairwise Product Relationship Comparator Modal */}
      {comparatorPair && (
        <ProductComparatorModal
          productA={comparatorPair.productA}
          productB={comparatorPair.productB}
          similarity={pairSimilarity}
          clusters={clusters}
          clusterMap={productToClusterMap}
          onClose={() => setComparatorPair(null)}
        />
      )}

      {/* Clean Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 px-6 mt-12 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span>Hierarchical Agglomerative Clustering (HAC) for Indian E-Commerce</span>
          <span className="mx-2">·</span>
          <span>Amazon India · Flipkart · Myntra · Tata CLiQ · Nykaa in ₹ INR</span>
        </div>
        <div className="font-mono text-[11px] text-slate-600">
          Ward's Minimum Variance · Cosine / Euclidean Space · Tabular Numerals
        </div>
      </footer>
    </div>
  );
}
