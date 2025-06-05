import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
// アイコンをテキストに置き換え
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export default function AccountDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, logoutMutation } = useAuth();
  const [localUser, setLocalUser] = useState<any>(null);
  const [, navigate] = useLocation();
  
  // コンポーネントマウント時に localStorage からユーザー情報を読み込み
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('auth_user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setLocalUser(parsedUser);
      }
    } catch (error) {
      console.error('ローカルストレージからの読み込みエラー:', error);
    }
  }, []);
  
  // useAuth からのユーザー情報が更新されたら使用する
  useEffect(() => {
    if (user) {
      setLocalUser(null); // useAuth が正しく動作している場合は localStorage の値は使わない
    }
  }, [user]);

  // ドロップダウンの外側をクリックした時に閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ログアウト処理 - 今は未使用（代わりに専用ページにリダイレクト）
  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      setIsOpen(false);
      navigate("/");
    } catch (error) {
      console.error("ログアウト処理中にエラーが発生しました:", error);
      // エラーが発生した場合も専用ページに移動させる
      window.location.href = "/auth/logout";
    }
  };

  // 表示用のユーザー情報を決定（useAuth から取得したものか、localStorage から取得したもの）
  const displayUser = user || localUser;
  
  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        className="text-white rounded-full hover:bg-primary-foreground/10 flex items-center gap-2"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="アカウントメニュー"
      >
        👤
        {displayUser && (
          <span className="text-sm font-medium hidden md:inline-block">
            {(displayUser.displayName || displayUser.username.split('@')[0]) + 'さん'}
          </span>
        )}
      </Button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
          {displayUser ? (
            <>
              <div className="px-4 py-3 text-sm text-gray-700 border-b">
                <p className="font-medium text-base mb-1">{displayUser.displayName || displayUser.username.split('@')[0]}さん</p>
                <p className="text-xs text-gray-500 truncate">{displayUser.username}</p>
              </div>
              
              <div 
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = "/account";
                }}
                className="cursor-pointer px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors"
              >
                <User className="h-5 w-5 mr-3 text-gray-500" />
                <span>アカウント</span>
              </div>
              
              <div 
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = "/account/orders";
                }}
                className="cursor-pointer px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors"
              >
                <ShoppingBag className="h-5 w-5 mr-3 text-gray-500" />
                <span>購入履歴</span>
              </div>
              
              <div
                className="cursor-pointer px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors"
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = "/auth/logout";
                }}
              >
                <LogOut className="h-5 w-5 mr-3 text-gray-500" />
                <span>ログアウト</span>
              </div>
            </>
          ) : (
            <>
              <div
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = "/auth?tab=login";
                }}
                className="cursor-pointer px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors"
              >
                <LogIn className="h-5 w-5 mr-3 text-gray-500" />
                <span>ログイン・新規登録</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}