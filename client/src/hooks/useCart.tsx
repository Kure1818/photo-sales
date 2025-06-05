import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { CartItem } from "@shared/schema";
import { v4 as uuidv4 } from "uuid";

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "id"> & { id?: string }) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
}

const CART_STORAGE_KEY = "picstore_cart";

// 初期値を設定
const CartContext = createContext<CartContextType>({
  cart: [],
  addToCart: () => {},
  removeFromCart: () => {},
  clearCart: () => {}
});

// ローカルストレージからカートを読み込む関数
function loadCartFromStorage(): CartItem[] {
  try {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      const parsedCart = JSON.parse(savedCart);
      if (Array.isArray(parsedCart)) {
        return parsedCart;
      }
    }
  } catch (error) {
    console.error("カートの読み込みエラー:", error);
    localStorage.removeItem(CART_STORAGE_KEY);
  }
  return [];
}

// ローカルストレージにカートを保存する関数
function saveCartToStorage(cart: CartItem[]): void {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (error) {
    console.error("カートの保存エラー:", error);
  }
}

interface CartProviderProps {
  children: ReactNode;
}

export function CartProvider({ children }: CartProviderProps) {
  // 初期状態でローカルストレージからカートを読み込む
  const [cart, setCart] = useState<CartItem[]>(loadCartFromStorage());

  // カートに商品を追加する関数
  const addToCart = useCallback((item: Omit<CartItem, "id"> & { id?: string }) => {
    // 価格が設定されていない場合はスキップ
    if (item.price <= 0) {
      console.warn("価格が設定されていない商品はカートに追加できません");
      return;
    }

    // 一意のIDを生成 - ランダムIDではなく商品タイプと商品IDの組み合わせを使用
    const newId = item.id || `${item.type}-${item.itemId}`;
    
    // 新しいカートアイテムを作成
    const newItem: CartItem = {
      id: newId,
      type: item.type,
      itemId: item.itemId,
      name: item.name,
      price: item.price,
      thumbnailUrl: item.thumbnailUrl || '',
      path: item.path || ''
    };
    
    setCart(prevCart => {
      // 同じ商品が既にカートにあるかチェック
      const existingItem = prevCart.find(
        cartItem => cartItem.type === item.type && cartItem.itemId === item.itemId
      );
      
      if (!existingItem) {
        // 商品がカートにない場合は追加
        // カートに追加して即座にローカルストレージに保存
        const newCart = [...prevCart, newItem];
        // 保存前にコンソールに出力して確認
        saveCartToStorage(newCart);
        return newCart;
      }
      
      // 既にカートにある場合は現在のカートを返す
      return prevCart;
    });
  }, []);

  // カートから商品を削除する関数
  const removeFromCart = useCallback((id: string) => {
    setCart(prevCart => {
      const newCart = prevCart.filter(item => item.id !== id);
      saveCartToStorage(newCart);
      return newCart;
    });
  }, []);

  // カートを空にする関数
  const clearCart = useCallback(() => {
    setCart([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  }, []);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

// カスタムフック
export function useCart() {
  const context = useContext(CartContext);
  
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  
  return context;
}
