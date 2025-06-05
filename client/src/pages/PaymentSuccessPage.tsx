import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// アイコンを軽量化のため削除
import { Link } from 'wouter';
import { useCart } from '@/hooks/useCart';

export default function PaymentSuccessPage() {
  const { clearCart } = useCart();

  useEffect(() => {
    // 決済完了時にカートをクリア
    clearCart();
  }, [clearCart]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <span className="text-2xl text-green-600">✓</span>
            </div>
            <CardTitle className="text-2xl">お支払いが完了しました！</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-gray-600">
              ご購入いただきありがとうございます。
              決済が正常に処理されました。
            </p>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">次のステップ</h3>
              <p className="text-blue-700 text-sm">
                購入した写真やアルバムは、アカウントページの「購入履歴」からダウンロードできます。
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild className="flex-1">
                <Link href="/account/orders">
                  購入履歴を確認
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/">
                  トップページに戻る
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}