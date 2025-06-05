import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/use-auth";
import AccountDropdown from "./AccountDropdown";

interface HeaderProps {
  onCartClick: () => void;
}

export default function Header({ onCartClick }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { cart } = useCart();
  const [location, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();
  
  // 管理者画面かどうかを判定
  const isAdminPage = location.startsWith('/admin');
  
  // カートページに移動する関数
  const handleCartClick = () => {
    setLocation("/cart");
  };
  
  // ログアウト処理
  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    setLocation("/");
  };
  
  return (
    <header className="bg-primary shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/" className="text-white text-2xl font-bold">
            PIC'store
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          {/* 管理者ページでない場合のみショッピングカートボタンを表示 */}
          {!isAdminPage && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:text-accent transition-colors"
                onClick={handleCartClick}
                aria-label="カートを表示"
              >
                <ShoppingCart className="h-5 w-5" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-accent text-xs text-white rounded-full h-5 w-5 flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </Button>
            </div>
          )}
          
          {/* アカウントドロップダウン */}
          <div className="hidden md:block">
            <AccountDropdown />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "メニューを閉じる" : "メニューを開く"}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="px-2 pt-2 pb-3 space-y-2 sm:px-3 md:hidden bg-primary">
          <Link href="/account">
            <Button
              className="w-full justify-start bg-primary-foreground/10 hover:bg-primary-foreground/20 text-white"
            >
              マイアカウント
            </Button>
          </Link>
          <Link href="/orders">
            <Button
              className="w-full justify-start bg-primary-foreground/10 hover:bg-primary-foreground/20 text-white"
            >
              購入履歴
            </Button>
          </Link>
          {user && (
            <Button
              className="w-full justify-start bg-primary-foreground/10 hover:bg-primary-foreground/20 text-white"
              onClick={handleLogout}
            >
              ログアウト
            </Button>
          )}
          {!user && (
            <>
              <Link href="/auth?tab=login">
                <Button
                  className="w-full justify-start bg-primary-foreground/10 hover:bg-primary-foreground/20 text-white"
                >
                  ログイン
                </Button>
              </Link>
              <Link href="/auth?tab=register">
                <Button
                  className="w-full justify-start bg-primary-foreground/10 hover:bg-primary-foreground/20 text-white"
                >
                  新規会員登録
                </Button>
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
