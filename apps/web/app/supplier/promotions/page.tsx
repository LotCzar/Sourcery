"use client";

import { useState } from "react";
import {
  useSupplierPromotions,
  useCreatePromotion,
  useUpdatePromotion,
  useDeletePromotion,
} from "@/hooks/use-supplier-promotions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tag,
  Plus,
  Loader2,
  Calendar,
  Percent,
  DollarSign,
  Truck,
  Gift,
  Pencil,
  Trash2,
  Power,
} from "lucide-react";

interface Promotion {
  id: string;
  type: string;
  value: number;
  minOrderAmount: number | null;
  startDate: string;
  endDate: string;
  description: string | null;
  isActive: boolean;
  buyQuantity: number | null;
  getQuantity: number | null;
  products: { id: string; name: string }[];
  createdAt: string;
}

const typeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  PERCENTAGE_OFF: { label: "Percentage Off", icon: <Percent className="h-4 w-4" />, color: "bg-blue-50 text-blue-700" },
  FLAT_DISCOUNT: { label: "Flat Discount", icon: <DollarSign className="h-4 w-4" />, color: "bg-emerald-50 text-emerald-700" },
  FREE_DELIVERY: { label: "Free Delivery", icon: <Truck className="h-4 w-4" />, color: "bg-purple-50 text-purple-700" },
  BUY_X_GET_Y: { label: "Buy X Get Y", icon: <Gift className="h-4 w-4" />, color: "bg-amber-50 text-amber-700" },
};

function formatValue(type: string, value: number, buyQty?: number | null, getQty?: number | null) {
  switch (type) {
    case "PERCENTAGE_OFF":
      return `${value}% Off`;
    case "FLAT_DISCOUNT":
      return `$${value.toFixed(2)} Off`;
    case "FREE_DELIVERY":
      return "Free Delivery";
    case "BUY_X_GET_Y":
      return `Buy ${buyQty} Get ${getQty}`;
    default:
      return String(value);
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function SupplierPromotionsPage() {
  const [tab, setTab] = useState("active");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);

  const { data: result, isLoading } = useSupplierPromotions(tab);
  const promotions: Promotion[] = result?.data ?? [];
  const createMutation = useCreatePromotion();
  const updateMutation = useUpdatePromotion();
  const deleteMutation = useDeletePromotion();

  // Form state
  const [formType, setFormType] = useState("PERCENTAGE_OFF");
  const [formValue, setFormValue] = useState("");
  const [formMinOrder, setFormMinOrder] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formBuyQty, setFormBuyQty] = useState("");
  const [formGetQty, setFormGetQty] = useState("");

  const resetForm = () => {
    setFormType("PERCENTAGE_OFF");
    setFormValue("");
    setFormMinOrder("");
    setFormStartDate("");
    setFormEndDate("");
    setFormDescription("");
    setFormBuyQty("");
    setFormGetQty("");
    setEditingPromotion(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (promo: Promotion) => {
    setEditingPromotion(promo);
    setFormType(promo.type);
    setFormValue(String(promo.value));
    setFormMinOrder(promo.minOrderAmount ? String(promo.minOrderAmount) : "");
    setFormStartDate(new Date(promo.startDate).toISOString().split("T")[0]);
    setFormEndDate(new Date(promo.endDate).toISOString().split("T")[0]);
    setFormDescription(promo.description || "");
    setFormBuyQty(promo.buyQuantity ? String(promo.buyQuantity) : "");
    setFormGetQty(promo.getQuantity ? String(promo.getQuantity) : "");
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const data: any = {
      type: formType,
      value: parseFloat(formValue) || 0,
      startDate: formStartDate,
      endDate: formEndDate,
      description: formDescription || undefined,
      minOrderAmount: formMinOrder ? parseFloat(formMinOrder) : null,
      buyQuantity: formType === "BUY_X_GET_Y" ? parseInt(formBuyQty) || null : null,
      getQuantity: formType === "BUY_X_GET_Y" ? parseInt(formGetQty) || null : null,
    };

    if (editingPromotion) {
      await updateMutation.mutateAsync({ id: editingPromotion.id, ...data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleToggleActive = async (promo: Promotion) => {
    await updateMutation.mutateAsync({ id: promo.id, isActive: !promo.isActive });
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Promotions</h1>
          <p className="text-muted-foreground">
            Create deals and offers to attract more orders
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create Promotion
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingPromotion ? "Edit Promotion" : "Create Promotion"}
              </DialogTitle>
              <DialogDescription>
                {editingPromotion
                  ? "Update the promotion details"
                  : "Set up a new promotion for your customers"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Promotion Type</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE_OFF">Percentage Off</SelectItem>
                    <SelectItem value="FLAT_DISCOUNT">Flat Discount</SelectItem>
                    <SelectItem value="FREE_DELIVERY">Free Delivery</SelectItem>
                    <SelectItem value="BUY_X_GET_Y">Buy X Get Y</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formType !== "FREE_DELIVERY" && formType !== "BUY_X_GET_Y" && (
                <div className="grid gap-2">
                  <Label>
                    {formType === "PERCENTAGE_OFF" ? "Discount (%)" : "Discount Amount ($)"}
                  </Label>
                  <Input
                    type="number"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    placeholder={formType === "PERCENTAGE_OFF" ? "e.g. 15" : "e.g. 25.00"}
                    min="0"
                    max={formType === "PERCENTAGE_OFF" ? "100" : undefined}
                    step={formType === "PERCENTAGE_OFF" ? "1" : "0.01"}
                  />
                </div>
              )}

              {formType === "FREE_DELIVERY" && (
                <input type="hidden" value="0" />
              )}

              {formType === "BUY_X_GET_Y" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Buy Quantity</Label>
                    <Input
                      type="number"
                      value={formBuyQty}
                      onChange={(e) => setFormBuyQty(e.target.value)}
                      placeholder="e.g. 3"
                      min="1"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Get Quantity (Free)</Label>
                    <Input
                      type="number"
                      value={formGetQty}
                      onChange={(e) => setFormGetQty(e.target.value)}
                      placeholder="e.g. 1"
                      min="1"
                    />
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Label>Minimum Order Amount (optional)</Label>
                <Input
                  type="number"
                  value={formMinOrder}
                  onChange={(e) => setFormMinOrder(e.target.value)}
                  placeholder="e.g. 100.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Description (optional)</Label>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe the promotion..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingPromotion ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : promotions.length === 0 ? (
            <Card className="flex items-center justify-center h-48">
              <div className="text-center">
                <Tag className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  No {tab} promotions
                </p>
                {tab === "active" && (
                  <Button variant="link" onClick={openCreateDialog} className="mt-2">
                    Create your first promotion
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {promotions.map((promo) => {
                const config = typeConfig[promo.type] || typeConfig.PERCENTAGE_OFF;
                return (
                  <Card key={promo.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <Badge variant="outline" className={config.color}>
                          {config.icon}
                          <span className="ml-1">{config.label}</span>
                        </Badge>
                        {!promo.isActive && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <CardTitle className="text-xl mt-2">
                        {formatValue(promo.type, promo.value, promo.buyQuantity, promo.getQuantity)}
                      </CardTitle>
                      {promo.description && (
                        <CardDescription className="line-clamp-2">
                          {promo.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatDate(promo.startDate)} - {formatDate(promo.endDate)}
                      </div>
                      {promo.minOrderAmount && (
                        <p className="text-sm text-muted-foreground">
                          Min order: ${promo.minOrderAmount.toFixed(2)}
                        </p>
                      )}
                      {promo.products.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          Applies to {promo.products.length} product{promo.products.length !== 1 ? "s" : ""}
                        </p>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(promo)}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(promo)}
                          disabled={updateMutation.isPending}
                        >
                          <Power className="h-3 w-3 mr-1" />
                          {promo.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(promo.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
