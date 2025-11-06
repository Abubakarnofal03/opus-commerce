import { useState } from "react";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/currency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface SortableProductProps {
  product: any;
  onEdit: (product: any) => void;
  onDelete: (product: any) => void;
}

function SortableProduct({ product, onEdit, onDelete }: SortableProductProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-card border rounded-lg hover:bg-accent/50 transition-colors"
    >
      <button
        className="cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate">{product.name}</span>
          {product.is_featured && (
            <Badge variant="secondary" className="text-xs">Featured</Badge>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
          <span>{product.categories?.name || "—"}</span>
          <span>{formatPrice(product.price)}</span>
          <span>Stock: {product.stock_quantity}</span>
        </div>
      </div>

      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(product)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(product)}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

interface DraggableProductListProps {
  products: any[];
  categories: any[];
  onEdit: (product: any) => void;
  onDelete: (product: any) => void;
}

export function DraggableProductList({ 
  products, 
  categories,
  onEdit, 
  onDelete 
}: DraggableProductListProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter products by category
  const filteredProducts = selectedCategoryId === "all" 
    ? [...products].sort((a, b) => a.sort_order - b.sort_order)
    : [...products]
        .filter(p => p.category_id === selectedCategoryId)
        .sort((a, b) => a.sort_order - b.sort_order);

  const updateSortOrder = useMutation({
    mutationFn: async (updates: Array<{ id: string; sort_order: number }>) => {
      // Update all products with their new sort order
      for (const update of updates) {
        const { error } = await supabase
          .from('products')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
        if (error) throw error;
      }
    },
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['products'] });

      // Snapshot the previous value
      const previousProducts = queryClient.getQueryData(['products']);

      // Optimistically update the cache
      queryClient.setQueryData(['products'], (old: any) => {
        if (!old) return old;
        return old.map((product: any) => {
          const update = updates.find(u => u.id === product.id);
          if (update) {
            return { ...product, sort_order: update.sort_order };
          }
          return product;
        });
      });

      // Return context with the snapshot
      return { previousProducts };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: "Order updated",
        description: "Product display order has been updated successfully.",
      });
    },
    onError: (error, variables, context) => {
      // Rollback to previous state on error
      if (context?.previousProducts) {
        queryClient.setQueryData(['products'], context.previousProducts);
      }
      console.error('Error updating sort order:', error);
      toast({
        title: "Error",
        description: "Failed to update product order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = filteredProducts.findIndex((p) => p.id === active.id);
    const newIndex = filteredProducts.findIndex((p) => p.id === over.id);

    const newOrder = arrayMove(filteredProducts, oldIndex, newIndex);
    
    // Update sort_order for affected products
    const updates = newOrder.map((product, index) => ({
      id: product.id,
      sort_order: index,
    }));

    updateSortOrder.mutate(updates);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle>Reorder Products</CardTitle>
          <div className="w-full sm:w-64">
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Drag and drop products to change their display order on the shop page
        </p>
      </CardHeader>
      <CardContent>
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No products found in this category
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredProducts.map(p => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {filteredProducts.map((product) => (
                  <SortableProduct
                    key={product.id}
                    product={product}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}
