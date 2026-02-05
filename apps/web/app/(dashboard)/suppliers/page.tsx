import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Star,
  MapPin,
  Phone,
  Truck,
  DollarSign,
} from "lucide-react";
import prisma from "@/lib/prisma";
import { SupplierSearch } from "@/components/suppliers/supplier-search";

async function getSuppliers(query?: string) {
  const suppliers = await prisma.supplier.findMany({
    where: {
      status: "VERIFIED",
      ...(query && {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { city: { contains: query, mode: "insensitive" } },
          { state: { contains: query, mode: "insensitive" } },
        ],
      }),
    },
    include: {
      _count: {
        select: { products: true },
      },
    },
    orderBy: {
      rating: "desc",
    },
  });

  return suppliers;
}

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const query = searchParams.q;
  const suppliers = await getSuppliers(query);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Supplier Marketplace
          </h1>
          <p className="mt-1 text-muted-foreground">
            Discover and connect with verified suppliers
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-4">
        <SupplierSearch />
      </div>

      {/* Search Results Info */}
      {query && (
        <p className="text-sm text-muted-foreground">
          Found {suppliers.length} supplier{suppliers.length !== 1 ? "s" : ""} for "{query}"
        </p>
      )}

      {/* Stats */}
      {!query && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <Star className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{suppliers.length}</p>
                <p className="text-sm text-muted-foreground">Verified Suppliers</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Truck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">Same Day</p>
                <p className="text-sm text-muted-foreground">Delivery Available</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                <DollarSign className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">Best Prices</p>
                <p className="text-sm text-muted-foreground">Guaranteed</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Suppliers Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {suppliers.map((supplier) => (
          <Card key={supplier.id} className="overflow-hidden transition-shadow hover:shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={supplier.logoUrl || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {supplier.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{supplier.name}</CardTitle>
                    <CardDescription className="line-clamp-1">
                      {supplier.description?.slice(0, 50)}...
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="success">Verified</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium text-foreground">
                  {supplier.rating?.toNumber().toFixed(1) || "N/A"}
                </span>
                <span>({supplier.reviewCount} reviews)</span>
                <span>•</span>
                <span>{supplier._count.products} products</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {supplier.city}, {supplier.state}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                {supplier.phone}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Min. ${supplier.minimumOrder?.toNumber() || 0}</span>
                <span>•</span>
                <span>{supplier.leadTimeDays} day lead time</span>
              </div>
              <div className="flex gap-2 pt-2">
                <Link href={`/suppliers/${supplier.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    View Profile
                  </Button>
                </Link>
                <Button size="sm" className="flex-1">
                  Connect
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {suppliers.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            {query
              ? `No suppliers found matching "${query}". Try a different search term.`
              : "No suppliers found. Check back soon!"}
          </p>
        </Card>
      )}
    </div>
  );
}
