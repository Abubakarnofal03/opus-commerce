import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, Edit } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";

interface PromotionalBar {
  id: string;
  title: string;
  background_color: string;
  text_color: string;
  icon: string;
  link_url: string | null;
  is_active: boolean;
  show_countdown: boolean;
  end_date: string | null;
  sort_order: number;
}

interface PromotionalBarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PromotionalBarDialog = ({ open, onOpenChange }: PromotionalBarDialogProps) => {
  const queryClient = useQueryClient();
  const [editingBar, setEditingBar] = useState<PromotionalBar | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("hsl(var(--destructive))");
  const [textColor, setTextColor] = useState("hsl(var(--destructive-foreground))");
  const [icon, setIcon] = useState("🔥");
  const [linkUrl, setLinkUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [showCountdown, setShowCountdown] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [sortOrder, setSortOrder] = useState(0);

  const { data: promotionalBars } = useQuery({
    queryKey: ['promotional-bars-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotional_bars')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as PromotionalBar[];
    },
  });

  useEffect(() => {
    if (editingBar) {
      setTitle(editingBar.title);
      setBackgroundColor(editingBar.background_color);
      setTextColor(editingBar.text_color);
      setIcon(editingBar.icon || "");
      setLinkUrl(editingBar.link_url || "");
      setIsActive(editingBar.is_active);
      setShowCountdown(editingBar.show_countdown);
      setEndDate(editingBar.end_date ? new Date(editingBar.end_date).toISOString().slice(0, 16) : "");
      setSortOrder(editingBar.sort_order);
    } else {
      resetForm();
    }
  }, [editingBar]);

  const resetForm = () => {
    setTitle("");
    setBackgroundColor("hsl(var(--destructive))");
    setTextColor("hsl(var(--destructive-foreground))");
    setIcon("🔥");
    setLinkUrl("");
    setIsActive(true);
    setShowCountdown(false);
    setEndDate("");
    setSortOrder(0);
    setEditingBar(null);
  };

  const saveBar = useMutation({
    mutationFn: async () => {
      const barData = {
        title,
        background_color: backgroundColor,
        text_color: textColor,
        icon,
        link_url: linkUrl || null,
        is_active: isActive,
        show_countdown: showCountdown,
        end_date: endDate ? new Date(endDate).toISOString() : null,
        sort_order: sortOrder,
      };

      if (editingBar) {
        const { error } = await supabase
          .from('promotional_bars')
          .update(barData)
          .eq('id', editingBar.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('promotional_bars')
          .insert(barData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotional-bars-admin'] });
      queryClient.invalidateQueries({ queryKey: ['promotional-bars'] });
      toast.success(editingBar ? "Promotional bar updated!" : "Promotional bar created!");
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to save promotional bar: ${error.message}`);
    },
  });

  const deleteBar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('promotional_bars')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotional-bars-admin'] });
      queryClient.invalidateQueries({ queryKey: ['promotional-bars'] });
      toast.success("Promotional bar deleted!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete promotional bar: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setIsLoading(true);
    await saveBar.mutateAsync();
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingBar ? "Edit Promotional Bar" : "Manage Promotional Bars"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="🔥 50% OFF SALE"
                required
              />
            </div>

            <div>
              <Label htmlFor="icon">Icon/Emoji</Label>
              <Input
                id="icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="🔥"
              />
            </div>

            <div>
              <Label htmlFor="backgroundColor">Background Color</Label>
              <Input
                id="backgroundColor"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                placeholder="hsl(var(--destructive))"
              />
            </div>

            <div>
              <Label htmlFor="textColor">Text Color</Label>
              <Input
                id="textColor"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                placeholder="hsl(var(--destructive-foreground))"
              />
            </div>

            <div>
              <Label htmlFor="linkUrl">Link URL (optional)</Label>
              <Input
                id="linkUrl"
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>

            <div>
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value))}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="endDate">End Date (for countdown)</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="showCountdown"
                checked={showCountdown}
                onCheckedChange={(checked) => setShowCountdown(checked as boolean)}
              />
              <Label htmlFor="showCountdown">Show Countdown</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(checked as boolean)}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetForm}>
              {editingBar ? "Cancel Edit" : "Clear"}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : editingBar ? "Update Bar" : "Add Bar"}
            </Button>
          </DialogFooter>
        </form>

        <div className="mt-6 space-y-4">
          <h3 className="font-semibold">Active Promotional Bars</h3>
          {promotionalBars?.map((bar) => (
            <Card key={bar.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div 
                    className="py-2 px-4 rounded mb-2"
                    style={{
                      backgroundColor: bar.background_color,
                      color: bar.text_color,
                    }}
                  >
                    <p className="text-sm font-semibold">
                      {bar.icon} {bar.title}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sort: {bar.sort_order} | Active: {bar.is_active ? "Yes" : "No"} | 
                    Countdown: {bar.show_countdown ? "Yes" : "No"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingBar(bar)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteBar.mutate(bar.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
