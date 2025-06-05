import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// アイコンをUnicode記号に置き換え
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/hooks/useCart";
import { CartItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartModal({ isOpen, onClose }: CartModalProps) {
  const { cart, removeFromCart, clearCart } = useCart();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({
        title: "カートが空です",
        description: "購入する前に写真やアルバムをカートに追加してください",
        variant: "destructive",
      });
      return;
    }
    
    onClose();
    setLocation("/checkout");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex justify-between items-center border-b pb-4">
          <DialogTitle className="text-lg font-semibold">ショッピングカート</DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            ×
          </Button>
        </DialogHeader>

        <div className="py-4">
          {cart.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                🛒
              </div>
              <p className="text-gray-500">カートは空です</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              {cart.map((item) => (
                <CartItemDisplay key={item.id} item={item} onRemove={removeFromCart} />
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <>
            <Separator />
            <div className="pt-4">
              <div className="flex justify-between mb-4">
                <span className="font-medium">合計</span>
                <span className="font-bold">¥{totalAmount.toLocaleString()}</span>
              </div>
              <div className="space-y-2">
                <Button 
                  className="w-full bg-accent hover:bg-green-600 text-white" 
                  onClick={handleCheckout}
                >
                  購入手続きへ
                </Button>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => {
                    onClose();
                    setLocation("/cart");
                  }}
                >
                  カートを表示
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface CartItemDisplayProps {
  item: CartItem;
  onRemove: (id: string) => void;
}

function CartItemDisplay({ item, onRemove }: CartItemDisplayProps) {
  return (
    <div className="flex border-b pb-4">
      <img 
        src={item.thumbnailUrl} 
        alt={item.name} 
        className="w-20 h-20 object-cover rounded mr-3"
      />
      <div className="flex-1">
        <h4 className="font-medium">{item.name}</h4>
        <p className="text-sm text-gray-500">{item.path}</p>
        <div className="flex justify-between items-center mt-2">
          <span className="font-bold">¥{item.price.toLocaleString()}</span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-red-500 hover:text-red-700"
            onClick={() => onRemove(item.id)}
          >
            🗑️
          </Button>
        </div>
      </div>
    </div>
  );
}


