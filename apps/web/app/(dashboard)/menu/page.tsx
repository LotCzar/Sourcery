"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  useMenuItems,
  useUpdateMenuItem,
  useDeleteMenuItem,
  useAddIngredient,
  useUpdateIngredient,
  useDeleteIngredient,
} from "@/hooks/use-menu-items";
import type { MenuItemData, IngredientData } from "@/hooks/use-menu-items";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  UtensilsCrossed,
  Plus,
  Loader2,
  Search,
  Trash2,
  Pencil,
  Eye,
  EyeOff,
  ChefHat,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const unitLabels: Record<string, string> = {
  POUND: "lb",
  OUNCE: "oz",
  KILOGRAM: "kg",
  GRAM: "g",
  GALLON: "gal",
  LITER: "L",
  QUART: "qt",
  PINT: "pt",
  EACH: "ea",
  CASE: "case",
  DOZEN: "dz",
  BOX: "box",
  BAG: "bag",
  BUNCH: "bunch",
};

const unitOptions = Object.entries(unitLabels);

export default function MenuPage() {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Add dish dialog
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newDish, setNewDish] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
  });

  // Edit dish dialog
  const [editItem, setEditItem] = useState<MenuItemData | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
  });

  // Add ingredient to edit dialog
  const [newIngredient, setNewIngredient] = useState({
    name: "",
    quantity: "",
    unit: "EACH",
    notes: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: result, isLoading } = useMenuItems({
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    active: activeFilter !== "all" ? activeFilter : undefined,
    search: searchQuery || undefined,
  });

  const updateMenuItem = useUpdateMenuItem();
  const deleteMenuItem = useDeleteMenuItem();
  const addIngredient = useAddIngredient();
  const updateIngredient = useUpdateIngredient();
  const deleteIngredient = useDeleteIngredient();

  const createDishMutation = useMutation({
    mutationFn: (data: {
      items: Array<{
        name: string;
        description?: string;
        price: number;
        category?: string;
        ingredients: Array<{ name: string; quantity: number; unit: string }>;
      }>;
    }) =>
      apiFetch("/api/menu-items", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.menuItems.all });
    },
  });

  const items: MenuItemData[] = result?.data || [];
  const summary = result?.summary || null;

  const handleAddDish = async () => {
    if (!newDish.name.trim()) {
      toast({ title: "Please enter a dish name", variant: "destructive" });
      return;
    }

    try {
      await createDishMutation.mutateAsync({
        items: [
          {
            name: newDish.name,
            description: newDish.description || undefined,
            price: parseFloat(newDish.price) || 0,
            category: newDish.category || undefined,
            ingredients: [],
          },
        ],
      });
      setIsAddOpen(false);
      setNewDish({ name: "", description: "", price: "", category: "" });
      toast({ title: "Dish added successfully" });
    } catch (err) {
      toast({
        title: "Failed to add dish",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  };

  const handleOpenEdit = (item: MenuItemData) => {
    setEditItem(item);
    setEditForm({
      name: item.name,
      description: item.description || "",
      price: String(item.price),
      category: item.category || "",
    });
    setNewIngredient({ name: "", quantity: "", unit: "EACH", notes: "" });
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;

    try {
      await updateMenuItem.mutateAsync({
        id: editItem.id,
        name: editForm.name,
        description: editForm.description || null,
        price: parseFloat(editForm.price) || 0,
        category: editForm.category || null,
      });
      setEditItem(null);
      toast({ title: "Dish updated" });
    } catch (err) {
      toast({
        title: "Failed to update dish",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (item: MenuItemData) => {
    try {
      await updateMenuItem.mutateAsync({
        id: item.id,
        isActive: !item.isActive,
      });
    } catch (err) {
      toast({
        title: "Failed to update status",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this dish and all its ingredients?"))
      return;

    try {
      await deleteMenuItem.mutateAsync(id);
      toast({ title: "Dish deleted" });
    } catch (err) {
      toast({
        title: "Failed to delete dish",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  };

  const handleAddIngredient = async () => {
    if (!editItem || !newIngredient.name.trim()) return;

    try {
      await addIngredient.mutateAsync({
        menuItemId: editItem.id,
        name: newIngredient.name,
        quantity: parseFloat(newIngredient.quantity) || 0,
        unit: newIngredient.unit,
        notes: newIngredient.notes || undefined,
      });
      setNewIngredient({ name: "", quantity: "", unit: "EACH", notes: "" });
      // Re-fetch and update editItem
      const updated = await apiFetch<{ data: MenuItemData }>(
        `/api/menu-items/${editItem.id}`
      );
      setEditItem(updated.data);
    } catch (err) {
      toast({
        title: "Failed to add ingredient",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  };

  const handleUpdateIngredient = async (
    ing: IngredientData,
    field: string,
    value: string | number
  ) => {
    if (!editItem) return;

    try {
      await updateIngredient.mutateAsync({
        menuItemId: editItem.id,
        ingredientId: ing.id,
        [field]: value,
      });
      // Update local editItem state
      setEditItem((prev) =>
        prev
          ? {
              ...prev,
              ingredients: prev.ingredients.map((i) =>
                i.id === ing.id ? { ...i, [field]: value } : i
              ),
            }
          : null
      );
    } catch (err) {
      toast({
        title: "Failed to update ingredient",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  };

  const handleDeleteIngredient = async (ingredientId: string) => {
    if (!editItem) return;

    try {
      await deleteIngredient.mutateAsync({
        menuItemId: editItem.id,
        ingredientId,
      });
      setEditItem((prev) =>
        prev
          ? {
              ...prev,
              ingredients: prev.ingredients.filter((i) => i.id !== ingredientId),
            }
          : null
      );
    } catch (err) {
      toast({
        title: "Failed to delete ingredient",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Menu</h1>
          <p className="text-muted-foreground">
            Manage dishes and their ingredients
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Dish
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Dish</DialogTitle>
              <DialogDescription>
                Add a new dish to your menu
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Dish Name *</label>
                <Input
                  placeholder="e.g., Caesar Salad"
                  value={newDish.name}
                  onChange={(e) =>
                    setNewDish({ ...newDish, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Brief description..."
                  value={newDish.description}
                  onChange={(e) =>
                    setNewDish({ ...newDish, description: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="pl-7"
                      value={newDish.price}
                      onChange={(e) =>
                        setNewDish({ ...newDish, price: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Input
                    placeholder="e.g., Starters"
                    value={newDish.category}
                    onChange={(e) =>
                      setNewDish({ ...newDish, category: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddDish}
                disabled={createDishMutation.isPending}
              >
                {createDishMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Add Dish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Dishes</CardTitle>
              <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalItems}</div>
              <p className="text-xs text-muted-foreground">On your menu</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.activeCount}</div>
              <p className="text-xs text-muted-foreground">Currently served</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.inactiveCount}</div>
              <p className="text-xs text-muted-foreground">Not currently served</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search dishes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {summary && summary.categories.length > 0 && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {summary.categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Menu Items Table */}
      <Card>
        <CardContent className="pt-6">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ChefHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Menu Items</h3>
              <p className="text-muted-foreground mb-4">
                {result?.summary?.totalItems === 0
                  ? "Add dishes manually or use the Menu Parser to import your menu"
                  : "No dishes match your filters"}
              </p>
              {result?.summary?.totalItems === 0 && (
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => setIsAddOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Dish
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dish Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-center">Ingredients</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{item.name}</p>
                          {item.posItemId && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-violet-100 text-violet-700">
                              POS
                            </Badge>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.category ? (
                        <Badge variant="outline">{item.category}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.price)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {item.ingredients.length}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.isActive ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700"
                        >
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(item)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(item)}
                          title={item.isActive ? "Deactivate" : "Activate"}
                        >
                          {item.isActive ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-emerald-600" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dish Dialog */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Dish</DialogTitle>
            <DialogDescription>
              Update dish details and manage ingredients
            </DialogDescription>
          </DialogHeader>

          {editItem && (
            <div className="space-y-6 py-4">
              {/* Dish fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Dish Name</label>
                  <Input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm({ ...editForm, description: e.target.value })
                    }
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="pl-7"
                        value={editForm.price}
                        onChange={(e) =>
                          setEditForm({ ...editForm, price: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Input
                      value={editForm.category}
                      onChange={(e) =>
                        setEditForm({ ...editForm, category: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Ingredients section */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">
                  Ingredients ({editItem.ingredients.length})
                </h4>

                {editItem.ingredients.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead className="w-[100px]">Qty</TableHead>
                          <TableHead className="w-[100px]">Unit</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editItem.ingredients.map((ing) => (
                          <TableRow key={ing.id}>
                            <TableCell>
                              <Input
                                defaultValue={ing.name}
                                className="h-8 text-sm"
                                onBlur={(e) => {
                                  if (e.target.value !== ing.name) {
                                    handleUpdateIngredient(
                                      ing,
                                      "name",
                                      e.target.value
                                    );
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                defaultValue={ing.quantity}
                                className="h-8 text-sm"
                                onBlur={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (!isNaN(val) && val !== ing.quantity) {
                                    handleUpdateIngredient(ing, "quantity", val);
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                defaultValue={ing.unit}
                                onValueChange={(val) =>
                                  handleUpdateIngredient(ing, "unit", val)
                                }
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {unitOptions.map(([key, label]) => (
                                    <SelectItem key={key} value={key}>
                                      {label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                defaultValue={ing.notes || ""}
                                placeholder="-"
                                className="h-8 text-sm"
                                onBlur={(e) => {
                                  const val = e.target.value || null;
                                  if (val !== (ing.notes || null)) {
                                    handleUpdateIngredient(
                                      ing,
                                      "notes",
                                      val as string
                                    );
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDeleteIngredient(ing.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Add ingredient row */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-muted-foreground">Name</label>
                    <Input
                      placeholder="Ingredient name"
                      className="h-8 text-sm"
                      value={newIngredient.name}
                      onChange={(e) =>
                        setNewIngredient({
                          ...newIngredient,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="w-[80px] space-y-1">
                    <label className="text-xs text-muted-foreground">Qty</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      className="h-8 text-sm"
                      value={newIngredient.quantity}
                      onChange={(e) =>
                        setNewIngredient({
                          ...newIngredient,
                          quantity: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="w-[90px] space-y-1">
                    <label className="text-xs text-muted-foreground">Unit</label>
                    <Select
                      value={newIngredient.unit}
                      onValueChange={(val) =>
                        setNewIngredient({ ...newIngredient, unit: val })
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {unitOptions.map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={handleAddIngredient}
                    disabled={
                      !newIngredient.name.trim() || addIngredient.isPending
                    }
                  >
                    {addIngredient.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateMenuItem.isPending}
            >
              {updateMenuItem.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
