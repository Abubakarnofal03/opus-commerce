import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Users, ShoppingCart, DollarSign, TrendingUp, Eye } from "lucide-react";
import { format, subDays } from "date-fns";

export const SiteAnalytics = () => {
  // Analytics disabled to save egress
  const { data: analyticsData } = useQuery({
    queryKey: ['site-analytics'],
    queryFn: async () => {
      return null;
    },
    enabled: false, // Disable fetching
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Site Analytics</h2>
        <p className="text-muted-foreground">Analytics are currently paused to conserve resources.</p>
      </div>

      <Card>
        <CardContent className="py-10 text-center">
          <div className="flex flex-col items-center justify-center space-y-4">
            <TrendingUp className="h-12 w-12 text-muted-foreground/50" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Analytics Paused</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Data collection and visualization have been temporarily disabled to optimize system performance and reduce database egress.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
