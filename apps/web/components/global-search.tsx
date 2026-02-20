"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";

interface SearchResult {
  products: { id: string; name: string; category: string; price: number; unit: string; supplier: string; }[];
  suppliers: { id: string; name: string; location: string | null; productCount: number; }[];
  orders: { id: string; orderNumber: string; status: string; total: number; supplier: string; }[];
}

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Debounce the query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: searchData, isLoading } = useQuery({
    queryKey: queryKeys.search.query(debouncedQuery),
    queryFn: () =>
      apiFetch<{ success: boolean; data: SearchResult }>(
        `/api/search?q=${encodeURIComponent(debouncedQuery)}`
      ),
    enabled: debouncedQuery.length >= 2,
  });

  const results = searchData?.data || null;

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasResults = results && (
    results.products.length > 0 ||
    results.suppliers.length > 0 ||
    results.orders.length > 0
  );

  const showDropdown = isOpen && query.length >= 2;

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md" style={{ zIndex: 9999 }}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search products, suppliers, orders..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-10 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
        {query && !isLoading && (
          <button
            onClick={() => {
              setQuery("");
              setDebouncedQuery("");
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          className="absolute top-full left-0 right-0 mt-2 max-h-96 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl"
          style={{ zIndex: 99999 }}
        >
          {isLoading && !results && (
            <div className="p-4 text-center text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              Searching...
            </div>
          )}

          {!isLoading && !hasResults && (
            <div className="p-4 text-center text-gray-500">
              No results found for &quot;{query}&quot;
            </div>
          )}

          {/* Products */}
          {results?.products && results.products.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b">
                Products ({results.products.length})
              </div>
              {results.products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => {
                    router.push("/products");
                    setIsOpen(false);
                    setQuery("");
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  <div className="font-medium text-gray-900">{product.name}</div>
                  <div className="text-sm text-gray-500">{product.supplier} • {product.category}</div>
                </button>
              ))}
            </div>
          )}

          {/* Suppliers */}
          {results?.suppliers && results.suppliers.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b">
                Suppliers ({results.suppliers.length})
              </div>
              {results.suppliers.map((supplier) => (
                <button
                  key={supplier.id}
                  onClick={() => {
                    router.push(`/suppliers/${supplier.id}`);
                    setIsOpen(false);
                    setQuery("");
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  <div className="font-medium text-gray-900">{supplier.name}</div>
                  <div className="text-sm text-gray-500">{supplier.location || "Location not set"} • {supplier.productCount} products</div>
                </button>
              ))}
            </div>
          )}

          {/* Orders */}
          {results?.orders && results.orders.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b">
                Orders ({results.orders.length})
              </div>
              {results.orders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => {
                    router.push("/orders");
                    setIsOpen(false);
                    setQuery("");
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  <div className="font-medium text-gray-900">{order.orderNumber}</div>
                  <div className="text-sm text-gray-500">{order.supplier} • {order.status}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
