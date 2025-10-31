import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Users, ShoppingCart, DollarSign, TrendingUp, Eye } from "lucide-react";
import { format, subDays } from "date-fns";

export const SiteAnalytics = () => {
  const { data: analyticsData } = useQuery({
    queryKey: ['site-analytics'],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      
      // Fetch all events from last 30 days
      const { data: events, error } = await supabase
        .from('analytics_events')
        .select('*')
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate metrics
      const totalPageViews = events?.filter(e => e.event_type === 'page_view').length || 0;
      const uniqueVisitors = new Set(events?.map(e => e.session_id)).size || 0;
      const addToCartEvents = events?.filter(e => e.event_type === 'add_to_cart').length || 0;
      const purchaseEvents = events?.filter(e => e.event_type === 'purchase').length || 0;
      const checkoutStartEvents = events?.filter(e => e.event_type === 'checkout_start').length || 0;

      // Calculate conversion rate
      const conversionRate = uniqueVisitors > 0 
        ? ((purchaseEvents / uniqueVisitors) * 100).toFixed(2) 
        : '0.00';

      // Page views by path
      const pageViewsByPath = events
        ?.filter(e => e.event_type === 'page_view')
        .reduce((acc: Record<string, number>, event) => {
          const path = event.page_path || 'unknown';
          acc[path] = (acc[path] || 0) + 1;
          return acc;
        }, {});

      const topPages = Object.entries(pageViewsByPath || {})
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([path, count]) => ({ path, count }));

      // Daily page views for last 7 days
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return format(date, 'MM/dd');
      });

      const dailyViews = last7Days.map(date => {
        const count = events?.filter(e => {
          const eventDate = format(new Date(e.created_at), 'MM/dd');
          return eventDate === date && e.event_type === 'page_view';
        }).length || 0;
        return { date, views: count };
      });

      // Shop page specific metrics
      const shopPageViews = events?.filter(e => 
        e.event_type === 'page_view' && e.page_path?.includes('/shop')
      ).length || 0;

      const shopVisitorSessions = new Set(
        events
          ?.filter(e => e.event_type === 'page_view' && e.page_path?.includes('/shop'))
          .map(e => e.session_id)
      ).size || 0;

      // Funnel analysis
      const sessionsWithCart = new Set(
        events?.filter(e => e.event_type === 'add_to_cart').map(e => e.session_id)
      );
      const sessionsWithCheckout = new Set(
        events?.filter(e => e.event_type === 'checkout_start').map(e => e.session_id)
      );
      const sessionsWithPurchase = new Set(
        events?.filter(e => e.event_type === 'purchase').map(e => e.session_id)
      );

      const funnelData = [
        { stage: 'Visitors', count: uniqueVisitors },
        { stage: 'Added to Cart', count: sessionsWithCart.size },
        { stage: 'Started Checkout', count: sessionsWithCheckout.size },
        { stage: 'Completed Purchase', count: sessionsWithPurchase.size },
      ];

      return {
        totalPageViews,
        uniqueVisitors,
        addToCartEvents,
        purchaseEvents,
        checkoutStartEvents,
        conversionRate,
        topPages,
        dailyViews,
        shopPageViews,
        shopVisitorSessions,
        funnelData,
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Site Analytics</h2>
        <p className="text-muted-foreground">Last 30 days performance metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Page Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.totalPageViews || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.uniqueVisitors || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Add to Cart</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.addToCartEvents || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Purchases</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.purchaseEvents || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.conversionRate || 0}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Shop Page Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Shop Page Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Shop Page Views:</span>
            <span className="font-bold">{analyticsData?.shopPageViews || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Unique Shop Visitors:</span>
            <span className="font-bold">{analyticsData?.shopVisitorSessions || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shop → Cart Rate:</span>
            <span className="font-bold">
              {analyticsData?.shopVisitorSessions 
                ? ((analyticsData.addToCartEvents / analyticsData.shopVisitorSessions) * 100).toFixed(2)
                : 0}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Daily Page Views Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Page Views (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData?.dailyViews || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData?.funnelData || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stage" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Pages */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Pages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analyticsData?.topPages?.map((page, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                <span className="text-sm truncate flex-1">{page.path}</span>
                <span className="font-bold ml-4">{page.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
