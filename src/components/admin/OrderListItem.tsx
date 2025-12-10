import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatPrice } from "@/lib/currency";
import { ChevronRight } from "lucide-react";

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
  onClick: (orderId: string) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'processing':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'shipped':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'delivered':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'cancelled':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export const OrderListItem = ({ order, isSelected, onSelect, onClick }: OrderListItemProps) => {
  return (
    <div 
      className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={() => onClick(order.id)}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(order.id)}
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm">#{order.order_number}</span>
          <Badge className={`text-xs ${getStatusColor(order.status)}`}>
            {order.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <span className="truncate">{order.first_name} {order.last_name}</span>
          <span>•</span>
          <span className="truncate">{order.shipping_city}</span>
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className="font-semibold text-sm">{formatPrice(order.total_amount)}</p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(order.created_at), 'dd MMM')}
        </p>
      </div>
      
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </div>
  );
};
