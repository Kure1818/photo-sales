import * as React from "react";
import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
// 静的サイト用のユーザー型定義
type SelectUser = {
  id: number;
  username: string;
  email: string;
  role: string;
  isAdmin?: boolean;
};

type InsertUser = {
  username: string;
  password: string;
  email: string;
};
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
};

type LoginData = {
  username: string;
  password: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  // localStorageからユーザー情報を取得（フォールバック用）
  const [localUser, setLocalUser] = React.useState<SelectUser | null>(() => {
    try {
      const savedUser = localStorage.getItem('auth_user');
      if (savedUser) {
        return JSON.parse(savedUser);
      }
    } catch (error) {
      console.error('ローカルストレージからの読み込みエラー:', error);
    }
    return null;
  });
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 60 * 1000, // 1分間はキャッシュを使用
    initialData: localUser, // ローカルストレージのデータを初期値として使用
    retry: 1, // エラー時に1回だけリトライ
    retryDelay: 1000, // リトライまでの待機時間（ミリ秒）
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      try {
        // 認証リクエストの前にクッキーをクリア
        document.cookie.split(";").forEach(function(c) {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, 
            "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        
        // 外部API経由でのログイン
        const response = await apiRequest("POST", "/api/login", credentials);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "ログインに失敗しました");
        }
        
        return response.json();
      } catch (error) {
        console.error("ログインエラー:", error);
        throw error;
      }
    },
    onSuccess: (user: SelectUser) => {
      
      // ユーザー情報をキャッシュに保存
      queryClient.setQueryData(["/api/user"], user);
      
      // ローカルストレージにユーザー情報を保存（セッションの補助）
      try {
        localStorage.setItem('auth_user', JSON.stringify(user));
      } catch (error) {
        console.error('ユーザー情報の保存エラー:', error);
      }
      
      // ログイン成功のメッセージを表示
      toast({
        title: "ログイン成功",
        description: `ようこそ、${user.username}さん`,
      });
      
      // キャッシュを確実に更新するため、ユーザー情報のクエリを無効化して再取得
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      // リダイレクト先のURLを決定
      const destinationPath = user.isAdmin ? "/admin" : "/account";
      
      // 画面遷移のため少し遅延を入れる（トーストメッセージを表示するため）
      setTimeout(() => {
        // クッキーの設定を確認（デバッグ用）
        
        // ページ全体をリロード（最も確実な方法）
        window.location.href = destinationPath;
      }, 800);
    },
    onError: (error: Error) => {
      toast({
        title: "ログイン失敗",
        description: error.message || "ユーザー名またはパスワードが正しくありません",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        // 外部API経由でのログアウト
        await apiRequest("POST", "/api/logout");
      } catch (error) {
        console.error("ログアウト処理エラー:", error);
        throw error;
      }
    },
    onSuccess: () => {
      
      // ユーザー情報をキャッシュから削除
      queryClient.setQueryData(["/api/user"], null);
      
      // localStorageからユーザー情報を完全に削除
      try {
        localStorage.removeItem('auth_user');
        localStorage.removeItem('redirect_after_login');
      } catch (error) {
        console.error('ローカルストレージからのユーザー情報削除エラー:', error);
      }
      
      // クッキーも全てクリア
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, 
          "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      // 認証状態の変更をブロードキャスト
      window.dispatchEvent(new CustomEvent('auth-state-change', { detail: { user: null } }));
      
      // 成功メッセージ
      toast({
        title: "ログアウト成功",
        description: "ログアウトしました",
      });
      
      // クエリキャッシュを無効化して確実に更新
      queryClient.resetQueries();
      
      // ページをリロード（最も確実な方法）
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "ログアウト処理中にエラーが発生しました",
        description: error.message,
        variant: "destructive",
      });
      // エラーが発生してもクッキーとローカルストレージをクリア
      try {
        localStorage.removeItem('auth_user');
        document.cookie.split(";").forEach(function(c) {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, 
            "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        window.location.href = "/auth?tab=login";
      } catch (e) {
        console.error("クリーンアップエラー:", e);
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", userData);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "登録に失敗しました");
      }
      return data;
    },
    onSuccess: (response) => {
      
      // レスポンスからユーザー情報を取得し、キャッシュに保存
      const userData = {
        id: response.id,
        username: response.username,
        isAdmin: response.isAdmin,
        displayName: response.displayName || null,
        password: "", // パスワードは返されないので空文字を設定
        createdAt: response.createdAt ? new Date(response.createdAt) : null
      };
      
      // ユーザー情報をキャッシュに保存
      queryClient.setQueryData(["/api/user"], userData);
      
      // localStorage にセッション情報を一時保存（ページリロード後のステート復元用）
      try {
        localStorage.setItem('auth_user', JSON.stringify(userData));
      } catch (error) {
        console.error('ユーザー情報の保存エラー:', error);
      }
      
      // 成功メッセージを表示
      toast({
        title: "会員登録完了",
        description: response.message || "会員登録が完了しました。自動的にログインします。",
      });
      
      // キャッシュを確実に更新するため、ユーザー情報のクエリを無効化して再取得
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      // リダイレクト - 遅延させてデータの更新を待つ
      setTimeout(() => {
        // リダイレクト先を決定して移動
        const destinationPath = userData.isAdmin ? "/admin" : "/account";
        
        // 完全なURLを構築
        const baseUrl = window.location.origin;
        const fullUrl = `${baseUrl}${destinationPath}`;
        
        // 念のためURLをローカルストレージに保存（フォールバック用）
        localStorage.setItem('redirect_after_login', destinationPath);
        
        try {
          // 最も確実な方法でリダイレクト：完全なURLを使用
          window.location.replace(fullUrl);
        } catch (error) {
          console.error("リダイレクト中にエラーが発生しました:", error);
          // フォールバック
          window.location.href = fullUrl;
        }
      }, 800); // セッションが確立されるのを待つ
    },
    onError: (error: Error) => {
      toast({
        title: "登録失敗",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}