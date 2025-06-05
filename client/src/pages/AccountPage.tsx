import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { 
  User, Mail, LogOut, Settings, Key, UserCog, 
  ShoppingBag, Download, Check, Clock, AlertTriangle
} from "lucide-react";

interface OrderItem {
  id: string;
  type: "photo" | "album";
  itemId: number;
  name: string;
  price: number;
  thumbnailUrl: string;
}

interface Order {
  id: number;
  customerEmail: string;
  customerName: string;
  totalAmount: number;
  status: "pending" | "completed" | "failed";
  items: OrderItem[];
  createdAt: string;
}

export default function AccountPage() {
  const { user, logoutMutation, isLoading } = useAuth();
  const [, navigate] = useLocation();
  
  // 購入履歴の取得
  const { data: orders, isLoading: ordersLoading, error: ordersError } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });
  
  // シンプルなログアウト処理
  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    navigate("/");
  };

  // 注文ステータスに応じたアイコンの表示
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <Check className="h-4 w-4 text-green-500" />;
      case "failed":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
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

  // ローディング表示
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ユーザーデータがない場合（通常はProtectedRouteでリダイレクトされるはずだが念のため）
  if (!user) {
    window.location.href = "/auth?tab=login";
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-lg">ログインページにリダイレクトしています...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <h1 className="text-2xl font-bold mb-8">マイアカウント</h1>
      
      {/* セクション1: ユーザー情報 */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <User className="h-5 w-5 mr-2 text-primary" />
          ユーザー情報
        </h2>
        
        <div className="flex flex-col md:flex-row items-start md:items-center mb-6">
          <div className="bg-primary rounded-full p-3 mb-4 md:mb-0 md:mr-6">
            <User className="h-8 w-8 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-medium">{user?.displayName || user?.username?.split('@')[0]}さん</h3>
            <p className="text-gray-600 text-sm">会員ID: {user?.id}</p>
            <div className="flex items-center mt-2 text-gray-600">
              <Mail className="h-4 w-4 mr-2" />
              <span>{user?.username}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* セクション2: 購入履歴（シンプル表示） */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <ShoppingBag className="h-5 w-5 mr-2 text-primary" />
          購入履歴
        </h2>
        
        {ordersLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : orders && orders.length > 0 ? (
          <div className="space-y-4">
            {orders.slice(0, 3).map((order) => {
              const parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
              return (
                <div key={order.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      {getStatusIcon(order.status)}
                      <span className="ml-2 text-sm font-medium">
                        注文 #{order.id}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('ja-JP')}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {parsedItems?.length || 0}点の商品
                    </div>
                    <div className="font-medium">
                      ¥{order.totalAmount?.toLocaleString()}（税込）
                    </div>
                  </div>
                  {order.status === 'completed' && (
                    <div className="mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate("/orders")}
                        className="flex items-center"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        ダウンロード
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
            <div className="mt-4">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => navigate("/orders")}
              >
                購入履歴をすべて見る
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 border rounded-lg bg-gray-50">
            <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">購入履歴がありません</h3>
            <p className="mt-1 text-sm text-gray-500">まだ商品の購入履歴はありません。</p>
          </div>
        )}
      </div>
      
      {/* セクション3: 設定 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Settings className="h-5 w-5 mr-2 text-primary" />
          設定
        </h2>
        
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start text-gray-700"
            onClick={() => alert('パスワード変更フォームを表示')}
          >
            <Key className="h-4 w-4 mr-2 text-gray-500" />
            パスワード変更
          </Button>
          
          <Button
            variant="outline"
            className="w-full justify-start text-gray-700"
            onClick={() => alert('登録情報更新フォームを表示')}
          >
            <UserCog className="h-4 w-4 mr-2 text-gray-500" />
            登録情報の更新
          </Button>
          
          <Button
            variant="outline"
            className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            ログアウト
          </Button>
        </div>
      </div>
    </div>
  );
}