import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Trash2, ShoppingCart, ArrowRight } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function CartPage() {
  const { cart, removeFromCart, clearCart } = useCart();
  const [, navigate] = useLocation();
  
  // すでに税込み価格として合計を計算
  const grandTotal = cart.reduce((sum, item) => sum + item.price, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    navigate("/checkout");
  };

  if (cart.length === 0) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="text-center max-w-md mx-auto py-16">
          <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <ShoppingCart className="h-8 w-8 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">カートが空です</h1>
          <p className="text-gray-500 mb-6">写真やアルバムをカートに追加して購入してください</p>
          <Button asChild className="bg-accent hover:bg-green-600 text-white">
            <Link href="/">トップに戻る</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">ショッピングカート</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle>カート内のアイテム ({cart.length})</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearCart}
                  className="text-gray-500"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  すべて削除
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {cart.map((item) => (
                  <div key={item.id} className="flex border-b pb-6">
                    <img 
                      src={item.thumbnailUrl} 
                      alt={item.name} 
                      className="w-24 h-24 object-cover rounded mr-4"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-lg">{item.name}</h3>
                      <p className="text-sm text-gray-500 mb-2">{item.path}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="font-bold text-lg">¥{item.price.toLocaleString()} (税込)</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-500 hover:text-red-700"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          削除
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>注文内容</CardTitle>
              <CardDescription>カートに {cart.length} 個のアイテムがあります</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">合計（税込）</span>
                  <span className="font-bold">¥{grandTotal.toLocaleString()}</span>
                </div>
                
                <Button 
                  className="w-full bg-accent hover:bg-green-600 text-white mt-4"
                  onClick={handleCheckout}
                  disabled={cart.length === 0}
                >
                  購入手続きへ進む
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                
                <Button asChild variant="outline" className="w-full mt-2">
                  <Link href="/">
                    買い物を続ける
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}