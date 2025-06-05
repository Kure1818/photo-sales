import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Redirect, useLocation } from "wouter";
import { z } from "zod";
import { signInWithGoogle } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  username: z.string().min(3, "ユーザー名は3文字以上入力してください")
    .email("有効なメールアドレスを入力してください"),
  password: z.string().min(8, "パスワードは8文字以上入力してください"),
});

const registerSchema = z.object({
  username: z.string().min(3, "ユーザー名は3文字以上入力してください")
    .email("有効なメールアドレスを入力してください"),
  password: z.string().min(8, "パスワードは8文字以上入力してください"),
  displayName: z.string().min(2, "名前は2文字以上入力してください"),
  isAdmin: z.boolean().default(false).optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  // URL からパラメータを取得
  const urlParams = new URLSearchParams(location.split("?")[1] || "");
  // タブパラメータに応じて表示を切り替え（login, register, signup）
  const tabParam = urlParams.get("tab");
  // register または signup の場合は登録画面を表示
  const isRegister = tabParam === "register" || tabParam === "signup";
  const returnTo = urlParams.get("return_to");
  
  // ユーザーが既にログインしている場合はリダイレクト
  if (user) {
    // 管理者は管理画面へ
    if (user.isAdmin) {
      return <Redirect to="/admin" />;
    }
    
    // リダイレクト先がある場合はそちらへ
    if (returnTo) {
      return <Redirect to={`/${returnTo}`} />;
    }
    
    // デフォルトはアカウントページ
    return <Redirect to="/account" />;
  }
  
  // タブの状態管理
  const [isLoginView, setIsLoginView] = useState(!isRegister);
  
  // useEffect でURLが変わったらタブも変更
  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1] || "");
    const tabParam = params.get("tab");
    // register または signup の場合は登録画面を表示
    const isRegister = tabParam === "register" || tabParam === "signup";
    setIsLoginView(!isRegister);
    
    // URLに現在のビューを反映する
    if (isRegister && tabParam !== "signup") {
      navigate("/auth?tab=signup", { replace: true });
    } else if (!isRegister && tabParam !== "login") {
      navigate("/auth?tab=login", { replace: true });
    }
  }, [location]);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      displayName: "",
      isAdmin: false,
    },
  });

  // Googleログインハンドラー（一時的に無効化）
  const handleGoogleLogin = async () => {
    toast({
      title: "準備中",
      description: "Googleログイン機能は現在準備中です。通常のログインをご利用ください。",
      variant: "destructive",
    });
  };

  const onLoginSubmit = async (values: LoginFormValues) => {
    // 一時的対応：管理者用の特別なログイン処理
    if (values.username === "yuhki.90884@gmail.com" && values.password === "kurekure90") {
      // 管理者バイパス用のクッキーを設定（開発環境用の一時的な対応策）
      document.cookie = "admin_bypass=true; path=/; max-age=43200"; // 12時間有効
      
      // 通常のログイン処理も実行
      loginMutation.mutate(values);
      
      // ユーザー情報をローカルストレージに保存
      const adminUser = {
        id: 9999,
        username: "yuhki.90884@gmail.com",
        displayName: "管理者さん",
        isAdmin: true
      };
      
      try {
        localStorage.setItem('auth_user', JSON.stringify(adminUser));
      } catch (error) {
        console.error('ユーザー情報の保存エラー:', error);
      }
      
      // 少し待ってから管理者ページに遷移
      setTimeout(() => {
        window.location.href = "/admin";
      }, 800);
      
      return;
    }
    
    // 通常のログイン処理
    loginMutation.mutate(values);
  };

  const onRegisterSubmit = async (values: RegisterFormValues) => {
    registerMutation.mutate(values);
  };

  return (
    <div className="min-h-screen flex flex-col-reverse md:flex-row">
      {/* 左側：フォーム */}
      <div className="w-full md:w-1/2 flex justify-center items-center p-4 bg-white">
        <div className="w-full max-w-md">
          {isLoginView ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-1">ログイン</h2>
                <p className="text-gray-600 text-sm">PIC'storeにログインして写真を管理しましょう</p>
              </div>

              <form
                onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                className="space-y-5"
              >
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label htmlFor="login-username" className="block text-base font-medium">
                      メールアドレス
                    </label>
                    <input
                      id="login-username"
                      type="email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="メールアドレスを入力"
                      {...loginForm.register("username")}
                    />
                    {loginForm.formState.errors.username && (
                      <p className="text-sm text-red-500">
                        {loginForm.formState.errors.username.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <label htmlFor="login-password" className="block text-base font-medium">
                      パスワード
                    </label>
                    <input
                      id="login-password"
                      type="password"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="パスワードを入力"
                      {...loginForm.register("password")}
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-red-500">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <Loader2 className="inline mr-2 h-5 w-5 animate-spin" />
                  ) : null}
                  ログイン
                </button>

                {/* 区切り線 */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground">または</span>
                  </div>
                </div>

                {/* Googleログインボタン */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isGoogleLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isGoogleLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  Googleでログイン
                </button>
                
                <div className="text-center">
                  <button
                    type="button"
                    className="text-sm text-gray-500 hover:text-gray-700"
                    onClick={() => setIsLoginView(false)}
                  >
                    アカウントをお持ちでない方はこちら
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold">新規会員登録</h2>
              <p className="text-gray-600 text-sm mb-6">PIC'storeの会員登録をして写真の購入や管理を始めましょう</p>
              
              <form
                onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                className="space-y-5"
              >
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label htmlFor="displayName" className="block font-medium">
                      お名前（ニックネーム）
                    </label>
                    <input
                      id="displayName"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="お名前またはニックネームを入力"
                      {...registerForm.register("displayName")}
                    />
                    {registerForm.formState.errors.displayName && (
                      <p className="text-sm text-red-500">
                        {registerForm.formState.errors.displayName.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <label htmlFor="username" className="block font-medium">
                      メールアドレス
                    </label>
                    <input
                      id="username"
                      type="email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="メールアドレスを入力"
                      {...registerForm.register("username")}
                    />
                    {registerForm.formState.errors.username && (
                      <p className="text-sm text-red-500">
                        {registerForm.formState.errors.username.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <label htmlFor="password" className="block font-medium">
                      パスワード（8文字以上）
                    </label>
                    <input
                      id="password"
                      type="password"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="パスワードを入力"
                      {...registerForm.register("password")}
                    />
                    {registerForm.formState.errors.password && (
                      <p className="text-sm text-red-500">
                        {registerForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? (
                    <Loader2 className="inline mr-2 h-5 w-5 animate-spin" />
                  ) : null}
                  新規会員登録
                </button>

                {/* 区切り線 */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground">または</span>
                  </div>
                </div>

                {/* Googleで登録ボタン */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isGoogleLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isGoogleLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  Googleで登録・ログイン
                </button>
                
                <div className="text-center">
                  <button
                    type="button"
                    className="text-sm text-gray-500 hover:text-gray-700 underline"
                    onClick={() => setIsLoginView(true)}
                  >
                    既にアカウントをお持ちの方はこちら
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* 右側：Hero部分 */}
      <div className="w-full md:w-1/2 bg-gray-800 flex flex-col justify-center items-center p-8 text-white">
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-bold">PIC'store 写真マーケットプレイス</h1>
          <p className="text-gray-300">
            イベント、スポーツ大会、コンサートなどの写真を簡単に管理、販売できるプラットフォーム。
            高品質な写真を整理し、お客様に提供しましょう。
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-300">
            <li>簡単な階層構造でコンテンツを整理</li>
            <li>複数の写真を一括アップロード</li>
            <li>自動ウォーターマーク生成</li>
            <li>柔軟な価格設定</li>
            <li>安全な決済処理</li>
          </ul>
        </div>
      </div>
    </div>
  );
}