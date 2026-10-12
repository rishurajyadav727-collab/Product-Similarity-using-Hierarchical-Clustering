import React, { useState, useMemo } from 'react';
import { Product, ClusterInfo } from '../types/product';
import { formatINR } from '../utils/formatters';
import {
  Search,
  Plus,
  ArrowUpDown,
  Filter,
  Eye,
  Trash2,
  Tag,
  Star,
} from 'lucide-react';

interface ProductCatalogTableProps {
  products: Product[];
  clusters: ClusterInfo[];
  clusterMap: Map<string, number>;
  selectedProductId: string | null;
  onSelectProduct: (product: Product) => void;
  onAddProduct: (newProduct: Product) => void;
  onRemoveProduct: (productId: string) => void;
}

export const ProductCatalogTable: React.FC<ProductCatalogTableProps> = ({
  products,
  clusters,
  clusterMap,
  selectedProductId,
  onSelectProduct,
  onAddProduct,
  onRemoveProduct,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [clusterFilter, setClusterFilter] = useState('all');
  const [sortField, setSortField] = useState<'title' | 'price' | 'rating' | 'returnRate' | 'cluster'>('price');
  const [sortAsc, setSortAsc] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state for adding hypothetical product
  const [newTitle, setNewTitle] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newPrice, setNewPrice] = useState(2499);
  const [newRating, setNewRating] = useState(4.4);
  const [newTags, setNewTags] = useState('made-in-india, fast-charging, premium');
  const [newLuxury, setNewLuxury] = useState(0.5);
  const [newTechnicality, setNewTechnicality] = useState(0.5);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add(p.category));
    return Array.from(set);
  }, [products]);

  // Filtered & Sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
        const cId = clusterMap.get(p.id);
        if (clusterFilter !== 'all' && cId !== parseInt(clusterFilter)) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            p.title.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.tags.some((t) => t.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortField === 'title') comp = a.title.localeCompare(b.title);
        else if (sortField === 'price') comp = a.price - b.price;
        else if (sortField === 'rating') comp = a.rating - b.rating;
        else if (sortField === 'returnRate') comp = a.returnRate - b.returnRate;
        else if (sortField === 'cluster') {
          const cA = clusterMap.get(a.id) ?? 0;
          const cB = clusterMap.get(b.id) ?? 0;
          comp = cA - cB;
        }
        return sortAsc ? comp : -comp;
      });
  }, [products, categoryFilter, clusterFilter, search, sortField, sortAsc, clusterMap]);

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const tagsArray = newTags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const created: Product = {
      id: `in-custom-${Date.now()}`,
      sku: `IN-${Math.floor(1000 + Math.random() * 9000)}`,
      title: newTitle.trim(),
      brand: newBrand.trim() || 'Indian D2C Brand',
      category: newCategory.trim() || categories[0] || 'Uncategorized',
      price: Number(newPrice) || 1499,
      rating: Number(newRating) || 4.4,
      reviewsCount: 1500,
      returnRate: 3.5,
      salesVelocity: 2500,
      tags: tagsArray,
      specs: { 'Origin': 'Made in India', 'Market': 'Amazon / Flipkart' },
      features: {
        priceNorm: Math.min(1, Math.max(0, newPrice / 100000)),
        ratingNorm: (newRating - 1) / 4,
        luxuryScore: Number(newLuxury),
        technicalityScore: Number(newTechnicality),
        ecoScore: 0.7,
        trendinessScore: 0.8,
      },
      description: 'Hypothetical Indian catalog product added for real-time hierarchical clustering evaluation.',
    };

    onAddProduct(created);
    setIsAddModalOpen(false);
    setNewTitle('');
    setNewBrand('');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Top Filter and Search Bar */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by title, brand, tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-60"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Indian Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Cluster Dropdown */}
          <select
            value={clusterFilter}
            onChange={(e) => setClusterFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Discovered Clusters</option>
            {clusters.map((c) => (
              <option key={c.id} value={c.id.toString()}>
                Cluster {c.id + 1}: {c.label.slice(0, 24)}…
              </option>
            ))}
          </select>
        </div>

        {/* Add Product Button */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Indian Product</span>
        </button>
      </div>

      {/* High Density Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 select-none">
              <th
                onClick={() => {
                  setSortField('title');
                  setSortAsc(!sortAsc);
                }}
                className="py-3 px-4 font-semibold cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>Product Title & SKU</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th className="py-3 px-4 font-semibold">Category</th>
              <th
                onClick={() => {
                  setSortField('cluster');
                  setSortAsc(!sortAsc);
                }}
                className="py-3 px-4 font-semibold cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>Assigned Cluster</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th
                onClick={() => {
                  setSortField('price');
                  setSortAsc(!sortAsc);
                }}
                className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-white"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Price (₹ INR)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th
                onClick={() => {
                  setSortField('rating');
                  setSortAsc(!sortAsc);
                }}
                className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-white"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Rating</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th
                onClick={() => {
                  setSortField('returnRate');
                  setSortAsc(!sortAsc);
                }}
                className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-white"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Returns</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {filteredProducts.map((p) => {
              const clusterId = clusterMap.get(p.id) ?? 0;
              const cluster = clusters[clusterId];
              const clusterColor = cluster ? cluster.color : '#64748B';
              const isSelected = selectedProductId === p.id;

              return (
                <tr
                  key={p.id}
                  className={`hover:bg-slate-800/50 transition-colors ${
                    isSelected ? 'bg-indigo-950/40' : ''
                  }`}
                >
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-100 flex items-center gap-1.5">
                        {p.title}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {p.brand} · {p.sku}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    <span className="text-[11px]">{p.category}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: clusterColor }}
                      />
                      <span className="font-mono text-[11px] text-slate-300">
                        Cluster {clusterId + 1}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-medium text-slate-100 tabular-nums">
                    {formatINR(p.price)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-amber-300 tabular-nums">
                    ★ {p.rating}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-400 tabular-nums">
                    {p.returnRate}%
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onSelectProduct(p)}
                        className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors"
                        title="View Full Profile & Substitutes"
                      >
                        Inspect
                      </button>
                      {products.length > 3 && (
                        <button
                          onClick={() => onRemoveProduct(p.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Remove from Catalog"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Hypothetical Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">
              Add Hypothetical Indian Catalog Product
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter Indian market product specifications to test where it merges in the hierarchical dendrogram.
            </p>

            <form onSubmit={handleCreateProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Product Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. boAt Nirvana Ion ANC True Wireless"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. boAt / Noise / Tata"
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder={categories[0] || 'Category'}
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Price (₹ INR)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500000"
                    value={newPrice}
                    onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Customer Rating (1-5)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    step="0.1"
                    value={newRating}
                    onChange={(e) => setNewRating(parseFloat(e.target.value) || 4.5)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Feature Tags (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="made-in-india, fast-charging, premium"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                    <span>Brand Prestige Tier</span>
                    <span className="font-mono">{(newLuxury * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={newLuxury}
                    onChange={(e) => setNewLuxury(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                    <span>Spec Complexity</span>
                    <span className="font-mono">{(newTechnicality * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={newTechnicality}
                    onChange={(e) => setNewTechnicality(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium transition-colors"
                >
                  Add & Cluster
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
