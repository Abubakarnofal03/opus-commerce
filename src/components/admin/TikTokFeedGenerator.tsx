import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Download, Loader2, ExternalLink, FileSpreadsheet } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";

export const TikTokFeedGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<{ timestamp: Date; productCount: number } | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    try {
      console.log('Generating TikTok feed...');
      
      const { data, error } = await supabase.functions.invoke('generate-tiktok-feed', {
        body: {},
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      // Create blob from TSV data
      const blob = new Blob([data], { type: 'text/tab-separated-values' });
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `tiktok-catalog-feed-${new Date().toISOString().split('T')[0]}.tsv`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Count products (approximate from TSV lines)
      const lines = data.split('\n').filter((line: string) => line.trim());
      const productCount = Math.max(0, lines.length - 1); // Subtract header row

      setLastGenerated({
        timestamp: new Date(),
        productCount,
      });
      
      toast({
        title: "Feed Generated Successfully",
        description: `Downloaded feed with ${productCount} products`,
      });

    } catch (error: any) {
      console.error('Generate error:', error);
      
      toast({
        title: "Generation Failed",
        description: error.message || 'Failed to generate TikTok feed',
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          TikTok Catalog Feed Generator
        </CardTitle>
        <CardDescription>
          Generate and download a product feed file for TikTok Ads Manager catalog uploads
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            size="lg"
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Generate & Download Feed
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            size="lg"
            asChild
          >
            <a 
              href="https://ads.tiktok.com/i18n/dashboard" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center"
            >
              Open TikTok Ads Manager
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>

        {lastGenerated && (
          <Alert>
            <FileSpreadsheet className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-1">
                Last Generated Successfully
              </div>
              <div className="text-sm">
                {lastGenerated.productCount} products exported
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {format(lastGenerated.timestamp, 'PPp')}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="border-t pt-4 space-y-3">
          <h4 className="font-semibold text-sm">📋 How to Upload to TikTok:</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li className="pl-2">Click <strong>"Generate & Download Feed"</strong> button above</li>
            <li className="pl-2">Go to <strong>TikTok Ads Manager</strong> → <strong>Assets</strong> → <strong>Catalog</strong></li>
            <li className="pl-2">Click <strong>"Create Catalog"</strong> or select existing catalog</li>
            <li className="pl-2">Choose <strong>"Data Feed"</strong> upload method</li>
            <li className="pl-2">Upload the downloaded <strong>TSV file</strong></li>
            <li className="pl-2">TikTok will process your products (takes ~10-30 minutes)</li>
            <li className="pl-2">Re-generate and upload when products change</li>
          </ol>
        </div>

        <div className="border-t pt-4 space-y-3">
          <h4 className="font-semibold text-sm">🎯 Setting Up Category-Wise Campaigns:</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li className="pl-2">After upload, go to your <strong>Catalog</strong> in TikTok Ads Manager</li>
            <li className="pl-2">Create <strong>Product Collections</strong> (filter by category)</li>
            <li className="pl-2">Example: Create collection where <strong>product_type = "Home & Kitchen"</strong></li>
            <li className="pl-2">Create separate campaigns for each collection</li>
            <li className="pl-2">Use <strong>Smart+ Catalog Ads</strong> objective</li>
          </ol>
        </div>

        <div className="border-t pt-4 space-y-2 text-sm">
          <h4 className="font-semibold">Configuration:</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-muted-foreground">Store Domain:</div>
            <div className="font-mono">theshoppingcart.shop</div>
            <div className="text-muted-foreground">Brand Name:</div>
            <div>The Shopping Cart</div>
            <div className="text-muted-foreground">Currency:</div>
            <div>PKR</div>
            <div className="text-muted-foreground">File Format:</div>
            <div>TSV (Tab-Separated Values)</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
