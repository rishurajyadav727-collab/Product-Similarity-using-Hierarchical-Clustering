export interface ProductFeatures {
  priceNorm: number;          // 0 to 1 (normalized price)
  ratingNorm: number;         // 0 to 1 (normalized customer rating)
  luxuryScore: number;        // 0 (entry/budget) to 1 (ultra-luxury)
  technicalityScore: number;  // 0 (simple/casual) to 1 (high-spec/pro)
  ecoScore: number;           // 0 (standard) to 1 (eco-certified/sustainable)
  trendinessScore: number;    // 0 (classic/staple) to 1 (trending/hype)
}

export interface Product {
  id: string;
  sku: string;
  title: string;
  brand: string;
  category: string;
  price: number;
  rating: number;
  reviewsCount: number;
  returnRate: number;         // Percentage (e.g. 4.2%)
  salesVelocity: number;      // Monthly volume
  tags: string[];
  specs: Record<string, string | number>;
  features: ProductFeatures;
  description: string;
}

export type LinkageMethod = 'ward' | 'complete' | 'average' | 'single';
export type DistanceMetric = 'cosine' | 'euclidean' | 'manhattan';

export interface ClusteringWeights {
  priceWeight: number;       // 0 to 1
  specsWeight: number;       // 0 to 1
  tagsWeight: number;        // 0 to 1
  brandWeight: number;       // 0 to 1
}

export interface DendrogramNode {
  id: string;
  left?: DendrogramNode;
  right?: DendrogramNode;
  height: number;             // Merge distance (normalized 0 to 1)
  size: number;               // Number of leaf products in this sub-tree
  leafIndices: number[];      // Indices of products
  label?: string;             // For leaves: product title
  leafData?: Product;         // For leaves: product reference
  clusterId?: number;         // Assigned cluster ID after cut
  x?: number;                 // Normalized layout coordinate [0, 1]
  y?: number;                 // Normalized layout coordinate [0, 1]
}

export interface ClusterInfo {
  id: number;
  label: string;
  color: string;
  products: Product[];
  dominantCategory: string;
  categoryPurity: number;      // Percentage of dominant category (e.g. 85%)
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  avgRating: number;
  avgReturnRate: number;
  topTags: { tag: string; count: number }[];
  coherenceScore: number;     // Average intra-cluster similarity (0 to 1)
}

export interface CannibalizationPair {
  productA: Product;
  productB: Product;
  similarity: number;
  priceDiff: number;
  sameCategory: boolean;
  reason: string;
}

export interface CrossCategorySynergy {
  clusterId: number;
  clusterTitle: string;
  categories: string[];
  recommendedBundle: Product[];
  explanation: string;
}

export interface Point2D {
  id: string;
  product: Product;
  x: number;
  y: number;
  clusterId: number;
}
