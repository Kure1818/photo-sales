import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { getQueryFn, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Clock, Check, AlertTriangle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OrderItem {
  id: string;
  type: "photo" | "album";
  itemId: number;
  name: string;
  price: number;
  thumbnailUrl?: string;
  path?: string;
}

interface Order {
  id: number;
  customerEmail: string;
  customerName: string;
  totalAmount: number;
  status: "pending" | "completed" | "failed";
  items: OrderItem[] | string;
  createdAt: string;
}

export default function OrdersPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // ログインしていなければログインページにリダイレクト
  useEffect(() => {
    if (!user) {
      // 直接URLを変更してより確実にリダイレクト
      window.location.href = "/auth?tab=login";
    }
  }, [user]);

  // ページ読み込み時に注文履歴キャッシュを無効化して最新データを取得
  useEffect(() => {
    if (user) {
      // 購入完了ページから遷移した場合などに最新の注文履歴を取得
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    }
  }, [user]);

  // 注文履歴の取得
  const { data: orders, isLoading, error } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user, // ユーザーがログインしている場合のみクエリを実行
  });

  // ダウンロード処理
  const handleDownload = async (item: OrderItem) => {
    try {
      const downloadUrl = `/api/download/${item.type}/${item.itemId}`;

      // Replit環境での問題を回避するため、新しいウィンドウで開く
      if (item.type === 'album') {
        // アルバムの場合は新しいウィンドウで開いてダイレクトダウンロード
        window.open(downloadUrl, '_blank');
        toast({
          title: "ダウンロード開始",
          description: `${item.name}のダウンロードを開始しました`,
        });
        return;
      }

      // 写真の場合は従来の方法
      const response = await fetch(downloadUrl, {
        method: 'GET',
        credentials: 'include'
      });


      if (!response.ok) {
        const errorText = await response.text();
        console.error("サーバーエラー:", errorText);
        throw new Error(`ダウンロードに失敗しました: ${response.status}`);
      }

      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // ファイル名を設定
      const filename = `${item.name}.jpg`;
      a.download = filename;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "ダウンロード開始",
        description: `${item.name}のダウンロードを開始しました`,
      });
    } catch (error) {
      console.error("ダウンロードエラー詳細:", error);
      toast({
        title: "ダウンロードエラー",
        description: "ダウンロードに失敗しました",
        variant: "destructive",
      });
    }
  };

  // 注文ステータスに応じたアイコンの表示
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <Check className="h-5 w-5 text-green-500" />;
      case "failed":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  // 注文ステータスの日本語表示
  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "完了";
      case "failed":
        return "失敗";
      default:
        return "処理中";
    }
  };

  if (!user) {
    return null; // ユーザーがログインしていない場合は何も表示しない
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">購入履歴</h1>
      
      {isLoading ? (
        <div className="flex justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : error ? (
        <div className="text-center py-10">
          <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">エラーが発生しました</h3>
          <p className="mt-1 text-sm text-gray-500">注文履歴の取得中にエラーが発生しました。</p>
          <div className="mt-6">
            <Button onClick={() => window.location.reload()}>再読み込み</Button>
          </div>
        </div>
      ) : orders && orders.length > 0 ? (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <ul className="divide-y divide-gray-200">
            {orders.map((order) => (
              <li key={order.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">
                    注文番号: {order.id}
                  </span>
                  <div className="flex items-center">
                    {getStatusIcon(order.status)}
                    <span className="ml-1 text-sm font-medium">
                      {getStatusText(order.status)}
                    </span>
                  </div>
                </div>

                <div className="mt-2">
                  <h4 className="text-sm font-medium">購入商品:</h4>
                  <ul className="mt-1 space-y-2">
                    {(() => {
                      const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                      return items.map((item: OrderItem) => (
                        <li key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex-1">
                            <span className="text-sm font-medium">{item.name}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              ({item.type === 'album' ? 'アルバム' : '写真'})
                            </span>
                            <div className="text-xs text-gray-500">¥{item.price.toLocaleString()} (税込)</div>
                          </div>
                          {order.status === 'completed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(item)}
                              className="flex items-center ml-2"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              ダウンロード
                            </Button>
                          )}
                        </li>
                      ));
                    })()}
                  </ul>
                </div>

                <div className="mt-3 flex justify-between">
                  <span className="text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <span className="font-medium">
                    合計: ¥{order.totalAmount.toLocaleString()} (税込)
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-center py-10">
          <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">注文履歴がありません</h3>
          <p className="mt-1 text-sm text-gray-500">まだ商品の購入履歴はありません。</p>
          <div className="mt-6">
            <Button onClick={() => navigate("/")}>商品を探す</Button>
          </div>
        </div>
      )}
    </div>
  );
}