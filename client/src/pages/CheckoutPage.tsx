import { useStripe, useElements, PaymentElement, Elements } from '@stripe/react-stripe-js';
import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// アイコンを軽量化のため削除
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';

// Stripeの公開キーを設定
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const { cart, clearCart } = useCart();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState("");

  // カートの合計金額を計算
  const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);

  useEffect(() => {
    if (cart.length === 0) {
      // カートが空の場合はカートページにリダイレクト
      setLocation('/cart');
      return;
    }

    // Payment Intentを作成
    const createPaymentIntent = async () => {
      try {
        const response = await apiRequest("POST", "/api/create-payment-intent", {
          amount: totalAmount
        });
        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (error) {
        toast({
          title: "エラー",
          description: "決済の準備中にエラーが発生しました",
          variant: "destructive",
        });
      }
    };

    createPaymentIntent();
  }, [cart, totalAmount, setLocation, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
        redirect: "if_required",
      });


      if (result.error) {
        console.error("Stripe payment error:", result.error);
        toast({
          title: "決済失敗",
          description: result.error.message || "決済処理中にエラーが発生しました",
          variant: "destructive",
        });
      } else if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
        // 決済成功
        
        // 注文データを保存
        try {
          const orderResponse = await apiRequest("POST", "/api/orders", {
            paymentIntentId: result.paymentIntent.id,
            amount: totalAmount,
            items: cart
          });
          
          const orderData = await orderResponse.json();
          
        } catch (error) {
        }
        
        clearCart();
        toast({
          title: "決済完了",
          description: "お支払いが完了しました！",
        });
        // 成功ページに遷移
        setLocation('/payment-success');
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "決済処理中にエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!clientSecret) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          <span className="ml-2">決済の準備中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">お支払い</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 注文概要 */}
          <Card>
            <CardHeader>
              <CardTitle>注文概要</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cart.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{item.type === 'photo' ? '写真' : 'アルバム'}: {item.name}</span>
                    <span>¥{item.price.toLocaleString()}（税込）</span>
                  </div>
                ))}
                <hr />
                <div className="flex justify-between font-bold text-lg">
                  <span>合計</span>
                  <span>¥{totalAmount.toLocaleString()}（税込）</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 決済フォーム */}
          <Card>
            <CardHeader>
              <CardTitle>お支払い方法</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <PaymentElement />
                <Button
                  type="submit"
                  disabled={!stripe || isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <div className="inline-block animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      処理中...
                    </>
                  ) : (
                    `¥${totalAmount.toLocaleString()}を支払う`
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const { cart } = useCart();
  const [, setLocation] = useLocation();
  const [clientSecret, setClientSecret] = useState("");

  // カートの合計金額を計算
  const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);

  useEffect(() => {
    if (cart.length === 0) {
      // カートが空の場合はカートページにリダイレクト
      setLocation('/cart');
      return;
    }

    // Payment Intentを作成
    const createPaymentIntent = async () => {
      try {
        const response = await apiRequest("POST", "/api/create-payment-intent", {
          amount: totalAmount
        });
        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (error) {
        console.error('Payment intent creation failed:', error);
      }
    };

    createPaymentIntent();
  }, [cart, totalAmount, setLocation]);

  if (!clientSecret) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          <span className="ml-2">決済の準備中...</span>
        </div>
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#2D3748',
        colorBackground: '#ffffff',
        colorText: '#1A202C',
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm />
    </Elements>
  );
}