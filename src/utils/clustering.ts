import {
  Product,
  LinkageMethod,
  DistanceMetric,
  ClusteringWeights,
  DendrogramNode,
  ClusterInfo,
  CannibalizationPair,
  CrossCategorySynergy,
  Point2D,
} from '../types/product';
import { formatINR } from './formatters';

// Distinct, accessible high-contrast cluster color palette
export const CLUSTER_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#14B8A6', // Teal
  '#6366F1', // Indigo
  '#84CC16', // Lime
  '#D946EF', // Fuchsia
  '#E11D48', // Rose
];

/**
 * Builds normalized numerical & tag vector for each product
 */
export function buildProductVectors(
  products: Product[],
  weights: ClusteringWeights
): { vectors: number[][]; tagVocab: string[] } {
  if (products.length === 0) return { vectors: [], tagVocab: [] };

  // Collect unique tags
  const tagSet = new Set<string>();
  products.forEach((p) => p.tags.forEach((t) => tagSet.add(t.toLowerCase())));
  const tagVocab = Array.from(tagSet);

  // Price normalization bounds
  const prices = products.map((p) => p.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice > minPrice ? maxPrice - minPrice : 1;

  // Reviews bounds
  const revs = products.map((p) => p.reviewsCount);
  const minRev = Math.min(...revs);
  const maxRev = Math.max(...revs);
  const revRange = maxRev > minRev ? maxRev - minRev : 1;

  const vectors = products.map((p) => {
    // 1. Normalized continuous attributes
    const normPrice = (p.price - minPrice) / priceRange;
    const normRating = (p.rating - 1) / 4; // 1 to 5 scale
    const normReviews = Math.log10(p.reviewsCount + 1) / Math.log10(maxRev + 2);
    const normReturn = p.returnRate / 10; // normalized 0 to 1 assuming max ~10%

    // 2. Feature scores
    const feat = p.features;

    // 3. Tag one-hot / frequencies
    const pTagSet = new Set(p.tags.map((t) => t.toLowerCase()));
    const tagVector = tagVocab.map((t) => (pTagSet.has(t) ? 1.0 : 0.0));

    // Weight allocations
    const wPrice = weights.priceWeight;
    const wSpecs = weights.specsWeight;
    const wTags = weights.tagsWeight;

    const continuousPart = [
      normPrice * wPrice * 1.5,
      normRating * 0.4,
      normReviews * 0.3,
      normReturn * 0.3,
      feat.luxuryScore * wSpecs * 1.4,
      feat.technicalityScore * wSpecs * 1.4,
      feat.ecoScore * wSpecs * 1.0,
      feat.trendinessScore * wSpecs * 1.0,
    ];

    const weightedTags = tagVector.map((val) => val * (wTags / Math.sqrt(tagVocab.length || 1)) * 2.2);

    return [...continuousPart, ...weightedTags];
  });

  return { vectors, tagVocab };
}

/**
 * Distance calculation between two feature vectors
 */
export function computeDistance(
  vA: number[],
  vB: number[],
  metric: DistanceMetric
): number {
  const len = vA.length;
  if (len === 0) return 0;

  if (metric === 'cosine') {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < len; i++) {
      dot += vA[i] * vB[i];
      normA += vA[i] * vA[i];
      normB += vB[i] * vB[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    if (denom === 0) return 0;
    const cosSim = Math.max(-1, Math.min(1, dot / denom));
    return 1 - cosSim; // Cosine distance in [0, 2]
  }

  if (metric === 'manhattan') {
    let sum = 0;
    for (let i = 0; i < len; i++) {
      sum += Math.abs(vA[i] - vB[i]);
    }
    return sum;
  }

  // Euclidean
  let sumSq = 0;
  for (let i = 0; i < len; i++) {
    const diff = vA[i] - vB[i];
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq);
}

/**
 * Computes full pairwise distance matrix
 */
export function computeDistanceMatrix(
  vectors: number[][],
  metric: DistanceMetric
): number[][] {
  const n = vectors.length;
  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = computeDistance(vectors[i], vectors[j], metric);
      matrix[i][j] = d;
      matrix[j][i] = d;
    }
  }

  return matrix;
}

/**
 * Computes normalized similarity matrix in range [0, 1]
 */
export function computeSimilarityMatrix(
  distMatrix: number[][]
): number[][] {
  const n = distMatrix.length;
  if (n === 0) return [];

  let maxDist = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (distMatrix[i][j] > maxDist) {
        maxDist = distMatrix[i][j];
      }
    }
  }

  if (maxDist === 0) maxDist = 1;

  const simMatrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(1));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        simMatrix[i][j] = 1.0;
      } else {
        const sim = Math.max(0, 1 - distMatrix[i][j] / maxDist);
        simMatrix[i][j] = Number(sim.toFixed(4));
      }
    }
  }

  return simMatrix;
}

/**
 * Agglomerative Hierarchical Clustering Tree Construction
 */
export function performHierarchicalClustering(
  products: Product[],
  weights: ClusteringWeights,
  linkage: LinkageMethod,
  metric: DistanceMetric
): {
  root: DendrogramNode;
  distMatrix: number[];
  simMatrix: number[][];
  rawDistMatrix: number[][];
  maxRawHeight: number;
} {
  const n = products.length;
  if (n === 0) {
    throw new Error('Cannot cluster empty product catalog');
  }

  const { vectors } = buildProductVectors(products, weights);
  const rawDistMatrix = computeDistanceMatrix(vectors, metric);
  const simMatrix = computeSimilarityMatrix(rawDistMatrix);

  if (n === 1) {
    const singleLeaf: DendrogramNode = {
      id: `leaf-0`,
      height: 0,
      size: 1,
      leafIndices: [0],
      label: products[0].title,
      leafData: products[0],
      x: 0.5,
      y: 0.5,
    };
    return {
      root: singleLeaf,
      distMatrix: [0],
      simMatrix: [[1]],
      rawDistMatrix,
      maxRawHeight: 1,
    };
  }

  // Active clusters map: key is cluster id
  interface ClusterState {
    node: DendrogramNode;
    leafIndices: number[];
    size: number;
    // For Ward's method: centroid vector
    centroid: number[];
  }

  let clusters: ClusterState[] = products.map((p, idx) => ({
    node: {
      id: `leaf-${idx}`,
      height: 0,
      size: 1,
      leafIndices: [idx],
      label: p.title,
      leafData: p,
    },
    leafIndices: [idx],
    size: 1,
    centroid: [...vectors[idx]],
  }));

  // Inter-cluster distance helper
  function getClusterDistance(cA: ClusterState, cB: ClusterState): number {
    if (linkage === 'ward') {
      // Ward's distance between two clusters:
      // D_ward = sqrt( (2 * nA * nB / (nA + nB)) ) * Euclidean(centroidA, centroidB)
      let sumSq = 0;
      for (let k = 0; k < cA.centroid.length; k++) {
        const diff = cA.centroid[k] - cB.centroid[k];
        sumSq += diff * diff;
      }
      const weightFactor = (cA.size * cB.size) / (cA.size + cB.size);
      return Math.sqrt(weightFactor * sumSq);
    }

    if (linkage === 'single') {
      let minD = Infinity;
      for (const i of cA.leafIndices) {
        for (const j of cB.leafIndices) {
          const d = rawDistMatrix[i][j];
          if (d < minD) minD = d;
        }
      }
      return minD;
    }

    if (linkage === 'complete') {
      let maxD = -Infinity;
      for (const i of cA.leafIndices) {
        for (const j of cB.leafIndices) {
          const d = rawDistMatrix[i][j];
          if (d > maxD) maxD = d;
        }
      }
      return maxD;
    }

    // Average (UPGMA)
    let sumD = 0;
    let count = 0;
    for (const i of cA.leafIndices) {
      for (const j of cB.leafIndices) {
        sumD += rawDistMatrix[i][j];
        count++;
      }
    }
    return count > 0 ? sumD / count : 0;
  }

  let step = 0;
  let maxRawHeight = 0.001;

  while (clusters.length > 1) {
    let bestDist = Infinity;
    let bestI = 0;
    let bestJ = 1;

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const d = getClusterDistance(clusters[i], clusters[j]);
        if (d < bestDist) {
          bestDist = d;
          bestI = i;
          bestJ = j;
        }
      }
    }

    if (bestDist > maxRawHeight) {
      maxRawHeight = bestDist;
    }

    const cA = clusters[bestI];
    const cB = clusters[bestJ];

    // Compute merged centroid
    const newSize = cA.size + cB.size;
    const newCentroid = new Array(cA.centroid.length).fill(0);
    for (let k = 0; k < newCentroid.length; k++) {
      newCentroid[k] = (cA.centroid[k] * cA.size + cB.centroid[k] * cB.size) / newSize;
    }

    const mergedNode: DendrogramNode = {
      id: `merge-${step++}`,
      left: cA.node,
      right: cB.node,
      height: bestDist,
      size: newSize,
      leafIndices: [...cA.leafIndices, ...cB.leafIndices],
    };

    const newCluster: ClusterState = {
      node: mergedNode,
      leafIndices: mergedNode.leafIndices,
      size: newSize,
      centroid: newCentroid,
    };

    // Filter out bestI and bestJ and push newCluster
    const nextClusters: ClusterState[] = [];
    for (let idx = 0; idx < clusters.length; idx++) {
      if (idx !== bestI && idx !== bestJ) {
        nextClusters.push(clusters[idx]);
      }
    }
    nextClusters.push(newCluster);
    clusters = nextClusters;
  }

  const root = clusters[0].node;

  // Normalize heights in [0, 1] recursively
  function normalizeHeights(node: DendrogramNode, maxH: number) {
    if (!node.left && !node.right) {
      node.height = 0;
      return;
    }
    node.height = Math.max(0.01, node.height / (maxH || 1));
    if (node.left) normalizeHeights(node.left, maxH);
    if (node.right) normalizeHeights(node.right, maxH);
  }

  normalizeHeights(root, maxRawHeight);

  // Compute 2D layout coordinates for dendrogram leaves and internal nodes
  computeDendrogramLayout(root, products);

  return {
    root,
    distMatrix: rawDistMatrix.flat(),
    simMatrix,
    rawDistMatrix,
    maxRawHeight,
  };
}

/**
 * Computes SVG layout positions for dendrogram
 * Leaves are ordered to reduce crossing (heuristics)
 */
export function computeDendrogramLayout(
  root: DendrogramNode,
  products: Product[]
): void {
  // 1. Collect leaf order
  const orderedLeaves: DendrogramNode[] = [];

  function traverseLeaves(node: DendrogramNode) {
    if (!node.left && !node.right) {
      orderedLeaves.push(node);
      return;
    }
    // Sibling heuristic: put lighter/smaller subtree first or preserve natural similarity
    if (node.left) traverseLeaves(node.left);
    if (node.right) traverseLeaves(node.right);
  }

  traverseLeaves(root);

  const numLeaves = orderedLeaves.length;
  orderedLeaves.forEach((leaf, idx) => {
    // Leaf y coordinate is distributed evenly from 0 to 1
    leaf.y = numLeaves > 1 ? idx / (numLeaves - 1) : 0.5;
    leaf.x = 0; // leaves start at base
  });

  // 2. Compute internal node positions bottom-up
  function assignInternalPositions(node: DendrogramNode) {
    if (!node.left && !node.right) return;

    if (node.left) assignInternalPositions(node.left);
    if (node.right) assignInternalPositions(node.right);

    const leftY = node.left?.y ?? 0;
    const rightY = node.right?.y ?? 0;

    // Node Y is midpoint of children
    node.y = (leftY + rightY) / 2;
    // Node X is proportional to height [0, 1]
    node.x = node.height;
  }

  assignInternalPositions(root);
}

/**
 * Cuts dendrogram at a specified height threshold in [0, 1]
 * Returns array of clusters with full statistics
 */
export function cutDendrogramAtThreshold(
  root: DendrogramNode,
  threshold: number,
  products: Product[],
  simMatrix: number[][]
): {
  clusters: ClusterInfo[];
  productToClusterMap: Map<string, number>;
} {
  const clusterSubtrees: DendrogramNode[] = [];

  function traverseCut(node: DendrogramNode) {
    if (node.height <= threshold || (!node.left && !node.right)) {
      clusterSubtrees.push(node);
      return;
    }

    if (node.left) traverseCut(node.left);
    if (node.right) traverseCut(node.right);
  }

  traverseCut(root);

  // Sort clusters descending by size
  clusterSubtrees.sort((a, b) => b.size - a.size);

  const productToClusterMap = new Map<string, number>();

  const clusters: ClusterInfo[] = clusterSubtrees.map((node, clusterIdx) => {
    const clusterColor = CLUSTER_COLORS[clusterIdx % CLUSTER_COLORS.length];
    const memberProducts = node.leafIndices.map((idx) => products[idx]);

    // Tag each node in subtree with clusterId
    function tagSubtree(n: DendrogramNode) {
      n.clusterId = clusterIdx;
      if (n.left) tagSubtree(n.left);
      if (n.right) tagSubtree(n.right);
    }
    tagSubtree(node);

    memberProducts.forEach((p) => {
      productToClusterMap.set(p.id, clusterIdx);
    });

    // Category distribution
    const catCounts = new Map<string, number>();
    memberProducts.forEach((p) => {
      catCounts.set(p.category, (catCounts.get(p.category) || 0) + 1);
    });

    let dominantCat = '';
    let maxCatCount = 0;
    catCounts.forEach((count, cat) => {
      if (count > maxCatCount) {
        maxCatCount = count;
        dominantCat = cat;
      }
    });

    const categoryPurity = Number(((maxCatCount / memberProducts.length) * 100).toFixed(1));

    // Pricing stats
    const prices = memberProducts.map((p) => p.price);
    const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / memberProducts.length);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const ratings = memberProducts.map((p) => p.rating);
    const avgRating = Number((ratings.reduce((a, b) => a + b, 0) / memberProducts.length).toFixed(2));

    const returns = memberProducts.map((p) => p.returnRate);
    const avgReturnRate = Number((returns.reduce((a, b) => a + b, 0) / memberProducts.length).toFixed(1));

    // Tag frequency
    const tagFreq = new Map<string, number>();
    memberProducts.forEach((p) => {
      p.tags.forEach((t) => tagFreq.set(t, (tagFreq.get(t) || 0) + 1));
    });
    const topTags = Array.from(tagFreq.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Coherence score (average pairwise similarity)
    let totalSim = 0;
    let pairs = 0;
    for (let i = 0; i < node.leafIndices.length; i++) {
      for (let j = i; j < node.leafIndices.length; j++) {
        const idxA = node.leafIndices[i];
        const idxB = node.leafIndices[j];
        totalSim += simMatrix[idxA][idxB];
        pairs++;
      }
    }
    const coherenceScore = pairs > 0 ? Number((totalSim / pairs).toFixed(3)) : 1.0;

    // Semantic cluster label derivation
    const leadTag = topTags[0]?.tag ? capitalize(topTags[0].tag.replace(/-/g, ' ')) : '';
    const secondTag = topTags[1]?.tag ? capitalize(topTags[1].tag.replace(/-/g, ' ')) : '';
    let label = '';

    const allPrices = products.map((p) => p.price);
    const medianPrice = allPrices.length > 0 ? allPrices.sort((a, b) => a - b)[Math.floor(allPrices.length / 2)] : 1000;

    if (dominantCat && leadTag) {
      if (avgPrice >= medianPrice * 1.5) {
        label = `Premium ${dominantCat} (${leadTag})`;
      } else if (avgPrice <= medianPrice * 0.6) {
        label = `Value ${leadTag} & ${secondTag || dominantCat}`;
      } else {
        label = `${dominantCat}: ${leadTag} Tier`;
      }
    } else {
      label = `Cluster ${clusterIdx + 1} (${dominantCat || 'Mixed'})`;
    }

    return {
      id: clusterIdx,
      label,
      color: clusterColor,
      products: memberProducts,
      dominantCategory: dominantCat,
      categoryPurity,
      avgPrice,
      minPrice,
      maxPrice,
      avgRating,
      avgReturnRate,
      topTags,
      coherenceScore,
    };
  });

  return { clusters, productToClusterMap };
}

/**
 * Finds threshold value that yields approximately targetK clusters
 */
export function findThresholdForKClusters(
  root: DendrogramNode,
  targetK: number,
  products: Product[],
  simMatrix: number[][]
): number {
  if (targetK <= 1) return 1.0;
  if (targetK >= products.length) return 0.001;

  // Collect all internal node heights
  const heights: number[] = [];
  function collectHeights(node: DendrogramNode) {
    if (node.left || node.right) {
      heights.push(node.height);
      if (node.left) collectHeights(node.left);
      if (node.right) collectHeights(node.right);
    }
  }
  collectHeights(root);
  heights.sort((a, b) => b - a);

  // If we cut after the (targetK - 1)-th merge height, we get targetK clusters
  const splitIdx = Math.min(heights.length - 1, targetK - 2);
  const selectedHeight = heights[splitIdx] || 0.4;
  return Number(Math.max(0.01, Math.min(0.99, selectedHeight - 0.001)).toFixed(3));
}

/**
 * Detects product pairs with similarity >= threshold that represent potential sales cannibalization
 */
export function detectCannibalizationPairs(
  products: Product[],
  simMatrix: number[][],
  minSimThreshold = 0.86
): CannibalizationPair[] {
  const pairs: CannibalizationPair[] = [];
  const n = products.length;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const sim = simMatrix[i][j];
      if (sim >= minSimThreshold) {
        const pA = products[i];
        const pB = products[j];
        const priceDiff = Math.abs(pA.price - pB.price);
        const sameCategory = pA.category === pB.category;

        // Reason formulation
        let reason = '';
        const pctDelta = Math.abs(pA.price - pB.price) / Math.max(1, Math.min(pA.price, pB.price));
        if (sameCategory && pctDelta < 0.25) {
          reason = `High feature overlap (${(sim * 100).toFixed(0)}%) in "${pA.category}" at near-identical price point (${formatINR(pA.price)} vs ${formatINR(pB.price)}). Direct competitor dividing Indian shopper conversion.`;
        } else if (sameCategory) {
          reason = `Functional substitute in "${pA.category}". Price difference of ${formatINR(priceDiff)} offers an upsell or trade-down path.`;
        } else {
          reason = `Cross-category similarity (${(sim * 100).toFixed(0)}%) between "${pA.category}" and "${pB.category}". Shared target lifestyle and feature vectors in India.`;
        }

        pairs.push({
          productA: pA,
          productB: pB,
          similarity: sim,
          priceDiff,
          sameCategory,
          reason,
        });
      }
    }
  }

  // Sort by highest similarity
  return pairs.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Finds high-affinity products from disparate categories grouped in the same cluster (cross-sell bundle potential)
 */
export function detectCrossCategorySynergies(
  clusters: ClusterInfo[]
): CrossCategorySynergy[] {
  const synergies: CrossCategorySynergy[] = [];

  clusters.forEach((c) => {
    const catMap = new Map<string, Product[]>();
    c.products.forEach((p) => {
      const list = catMap.get(p.category) || [];
      list.push(p);
      catMap.set(p.category, list);
    });

    if (catMap.size >= 2 && c.products.length >= 2) {
      const categories = Array.from(catMap.keys());
      // Pick one top product from each category to form bundle
      const bundle: Product[] = [];
      categories.forEach((cat) => {
        const prods = catMap.get(cat) || [];
        if (prods.length > 0) {
          bundle.push(prods[0]);
        }
      });

      const explanation = `Cluster unites "${categories.join('" and "')}" around shared luxury/technical standards. Ideal candidate for multi-item merchandising bundles.`;

      synergies.push({
        clusterId: c.id,
        clusterTitle: c.label,
        categories,
        recommendedBundle: bundle.slice(0, 3),
        explanation,
      });
    }
  });

  return synergies;
}

/**
 * Classical Multidimensional Scaling (MDS) to project N-dimensional distance matrix to 2D
 */
export function compute2DProjection(
  products: Product[],
  distMatrix: number[][],
  clusterMap: Map<string, number>
): Point2D[] {
  const n = products.length;
  if (n === 0) return [];
  if (n === 1) {
    return [
      {
        id: products[0].id,
        product: products[0],
        x: 0.5,
        y: 0.5,
        clusterId: clusterMap.get(products[0].id) ?? 0,
      },
    ];
  }

  // Double centering matrix B = -0.5 * H * D^2 * H
  // where H = I - (1/n) * 1 * 1^T
  const D2: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      D2[i][j] = distMatrix[i][j] * distMatrix[i][j];
    }
  }

  // Row and column means
  const rowMeans = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) sum += D2[i][j];
    rowMeans[i] = sum / n;
  }

  let totalMean = 0;
  for (let i = 0; i < n; i++) totalMean += rowMeans[i];
  totalMean /= n;

  const B: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      B[i][j] = -0.5 * (D2[i][j] - rowMeans[i] - rowMeans[j] + totalMean);
    }
  }

  // Power iteration for 2 largest positive eigenvectors
  const eig1 = powerIteration(B, n, 40);
  const deflatedB = deflateMatrix(B, eig1.vector, eig1.value, n);
  const eig2 = powerIteration(deflatedB, n, 40);

  const lambda1 = Math.max(0, eig1.value);
  const lambda2 = Math.max(0, eig2.value);
  const scale1 = Math.sqrt(lambda1) || 1;
  const scale2 = Math.sqrt(lambda2) || 1;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  const rawCoords: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const x = eig1.vector[i] * scale1;
    const y = eig2.vector[i] * scale2;
    rawCoords.push({ x, y });
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const rangeX = maxX > minX ? maxX - minX : 1;
  const rangeY = maxY > minY ? maxY - minY : 1;

  return products.map((p, i) => {
    // Normalize with 10% padding
    const normX = 0.1 + 0.8 * ((rawCoords[i].x - minX) / rangeX);
    const normY = 0.1 + 0.8 * ((rawCoords[i].y - minY) / rangeY);
    return {
      id: p.id,
      product: p,
      x: normX,
      y: normY,
      clusterId: clusterMap.get(p.id) ?? 0,
    };
  });
}

function powerIteration(
  matrix: number[][],
  n: number,
  iterations: number
): { vector: number[]; value: number } {
  let v = new Array(n).fill(0).map((_, i) => Math.sin(i + 1.2));
  let norm = Math.hypot(...v) || 1;
  v = v.map((x) => x / norm);

  let eigenvalue = 1;
  for (let it = 0; it < iterations; it++) {
    const nextV = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        sum += matrix[i][j] * v[j];
      }
      nextV[i] = sum;
    }

    norm = Math.hypot(...nextV);
    if (norm === 0) break;
    eigenvalue = norm;
    v = nextV.map((x) => x / norm);
  }

  return { vector: v, value: eigenvalue };
}

function deflateMatrix(
  matrix: number[][],
  v: number[],
  lambda: number,
  n: number
): number[][] {
  const result: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      result[i][j] = matrix[i][j] - lambda * v[i] * v[j];
    }
  }
  return result;
}

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
