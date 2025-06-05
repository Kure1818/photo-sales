import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { useState, useEffect } from "react";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element | null;
}) {
  const { user, isLoading } = useAuth();
  
  return (
    <Route path={path}>
      {() => {
        // まだローディング中の場合は、ローディング画面を表示
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-border" />
            </div>
          );
        }
        
        // ログインしていない場合はリダイレクト
        if (!user) {
          // 直接ログインページへリダイレクト
          return <Redirect to="/auth?tab=login" />;
        }
        
        // ユーザー情報があれば保護されたコンポーネントを表示
        return <Component />;
      }}
    </Route>
  );
}

export function AdminRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element | null;
}) {
  const { user, isLoading } = useAuth();
  const [needReauth, setNeedReauth] = useState(false);
  
  // セッション状態をチェックする
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // ユーザー情報のAPIを直接呼び出して最新の認証状態を確認
        const response = await fetch('/api/user', {
          credentials: 'include', // クッキーを必ず送信
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        
        if (response.status === 401) {
          console.warn('認証セッションが無効です。再認証が必要です。');
          setNeedReauth(true);
          
          // localStorage のユーザー情報をクリア
          localStorage.removeItem('auth_user');
          
          // クエリキャッシュをクリア
          window.location.href = '/auth?tab=login';
          return;
        }
        
        setNeedReauth(false);
      } catch (error) {
        console.error('認証状態チェックエラー:', error);
      }
    };
    
    if (!isLoading && user && user.isAdmin) {
      checkAuthStatus();
    }
  }, [user, isLoading]);
  
  return (
    <Route path={path}>
      {() => {
        // まだローディング中の場合は、ローディング画面を表示
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-border" />
            </div>
          );
        }
        
        // 再認証が必要な場合
        if (needReauth) {
          return <Redirect to="/auth?tab=login" />;
        }
        
        // ログインしていない場合はログインページへリダイレクト
        if (!user) {
          return <Redirect to="/auth?tab=login" />;
        }
        
        // 管理者でない場合はホームページへリダイレクト
        if (!user.isAdmin) {
          return <Redirect to="/" />;
        }
        
        // 管理者権限を持つユーザーなら保護されたコンポーネントを表示
        return <Component />;
      }}
    </Route>
  );
}