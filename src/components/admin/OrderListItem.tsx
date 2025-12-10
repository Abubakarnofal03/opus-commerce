import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { formatPrice } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface OrderListItemProps {
  order: {
    id: string;
    order_number: number;
    status: string;
    created_at: string;
    first_name: string;
    last_name: string;
    phone: string;
    shipping_city: string;
    total_amount: number;
  };
  isSelected: boolean;
  onSelect: (orderId: string) => void;
  onStatusChange: (orderId: string, status: string) => void;
  onClick: (orderId: string) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
    case 'processing': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
    case 'shipped': return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20';
    case 'delivered': return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
    case 'cancelled': return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
    default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20';
  }
};

export const OrderListItem = ({
  order,
  isSelected,
  onSelect,
  onStatusChange,
  onClick,
}: OrderListItemProps) => {
  return (
    <Card 
      className="cursor-pointer hover:bg-muted/50 transition-all hover:shadow-md border-l-4"
      style={{ borderLeftColor: getStatusColor(order.status).includes('yellow') ? '#eab308' : 
                              getStatusColor(order.status).includes('blue') ? '#3b82f6' :
                              getStatusColor(order.status).includes('purple') ? '#a855f7' :
                              getStatusColor(order.status).includes('green') ? '#22c55e' :
                              getStatusColor(order.status).includes('red') ? '#ef4444' : '#6b7280' }}
      onClick={() => onClick(order.id)}
    >
      <div className="p-3 sm:p-4">
        <div className="flex items-start gap-2 sm:gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect(order.id)}
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5 sm:mt-1 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm sm:text-base lg:text-lg truncate">
                    Order #{order.order_number}
                  </h3>
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs font-medium hidden sm:inline-flex", getStatusColor(order.status))}
                  >
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {order.first_name} {order.last_name}
                </p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1">
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(order.created_at), 'MMM d, yyyy')}
                  </p>
                  <span className="text-xs text-muted-foreground hidden sm:inline">•</span>
                  <span className="text-xs text-muted-foreground truncate">{order.phone}</span>
                  {order.shipping_city && (
                    <>
                      <span className="text-xs text-muted-foreground hidden sm:inline">•</span>
                      <span className="text-xs text-muted-foreground truncate">{order.shipping_city}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 sm:gap-2">
                <Badge 
                  variant="outline" 
                  className={cn("text-xs font-medium sm:hidden", getStatusColor(order.status))}
                >
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </Badge>
                <span className="font-bold text-accent text-base sm:text-lg">
                  {formatPrice(Number(order.total_amount))}
                </span>
              </div>
            </div>
          </div>
          <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
            <Select
              value={order.status}
              onValueChange={(status) => onStatusChange(order.id, status)}
            >
              <SelectTrigger className="w-[120px] xs:w-[140px] sm:w-[150px] text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </Card>
  );
};

