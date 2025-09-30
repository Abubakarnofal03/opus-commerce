import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tag, Trash2 } from "lucide-react";

export const SaleDialog = () => {
  const [open, setOpen] = useState(false);
  const [isGlobal, setIsGlobal] = useState(false);
  const [productId, setProductId] = useState<string>("");
  const [discountPercentage, setDiscountPercentage] = useState("10");
  const [endDate, setEndDate] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: sales } = useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*, products(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createSale = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('sales').insert({
        product_id: isGlobal ? null : productId,
        discount_percentage: parseFloat(discountPercentage),
        end_date: new Date(endDate).toISOString(),
        is_global: isGlobal,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['active-global-sale'] });
      toast({ title: "Sale created successfully" });
      setOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to create sale", variant: "destructive" });
    },
  });

  const deleteSale = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sales').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['active-global-sale'] });
      toast({ title: "Sale deleted successfully" });
    },
  });

  const resetForm = () => {
    setIsGlobal(false);
    setProductId("");
    setDiscountPercentage("10");
    setEndDate("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isGlobal && !productId) {
      toast({ title: "Please select a product", variant: "destructive" });
      return;
    }
    if (!endDate) {
      toast({ title: "Please select an end date", variant: "destructive" });
      return;
    }
    createSale.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Tag className="h-4 w-4" />
          Manage Sales
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Sales</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch checked={isGlobal} onCheckedChange={setIsGlobal} id="global" />
            <Label htmlFor="global">Apply to all products</Label>
          </div>

          {!isGlobal && (
            <div className="space-y-2">
              <Label htmlFor="product">Product</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products?.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="discount">Discount Percentage (%)</Label>
            <Input
              id="discount"
              type="number"
              min="1"
              max="100"
              value={discountPercentage}
              onChange={(e) => setDiscountPercentage(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">End Date & Time</Label>
            <Input
              id="endDate"
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>

          <Button type="submit" disabled={createSale.isPending}>
            {createSale.isPending ? "Creating..." : "Create Sale"}
          </Button>
        </form>

        <div className="mt-6 space-y-2">
          <h3 className="font-semibold">Active Sales</h3>
          {sales?.map((sale) => (
            <div key={sale.id} className="flex items-center justify-between p-3 glass-card rounded-lg">
              <div className="flex-1">
                <p className="font-medium">
                  {sale.is_global ? "Global Sale" : sale.products?.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {sale.discount_percentage}% off - Ends: {new Date(sale.end_date).toLocaleString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteSale.mutate(sale.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {(!sales || sales.length === 0) && (
            <p className="text-sm text-muted-foreground">No active sales</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
