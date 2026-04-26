import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

export const StoreSettings = () => {
  const [currency, setCurrency] = useState<string>("PKR");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrency();
  }, []);

  const fetchCurrency = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'store_currency')
        .maybeSingle();

      if (error) throw error;
      
      if (data?.value) {
        // Handle both raw string and JSON string
        const val = typeof data.value === 'string' ? data.value.replace(/"/g, '') : 'PKR';
        setCurrency(val === 'AED' ? 'AED' : 'PKR');
      }
    } catch (error) {
      console.error('Error fetching currency:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // First check if the setting exists
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('key', 'store_currency')
        .maybeSingle();

      let error;
      
      if (existing) {
        const { error: updateError } = await supabase
          .from('settings')
          .update({ value: currency })
          .eq('key', 'store_currency');
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('settings')
          .insert({ key: 'store_currency', value: currency });
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Store currency updated successfully. Please refresh the page to see changes.",
      });
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Currency Settings</CardTitle>
          <CardDescription>
            Choose the default currency tag to display across the store. This will only change the currency symbol, not the actual price values.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Store Currency</label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PKR">PKR (₨)</SelectItem>
                <SelectItem value="AED">AED (د.إ)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
