import { useState } from "react";
import { Eye, ShoppingCart } from "lucide-react";
import { Photo } from "@shared/schema";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/use-toast";
import { Watermark } from "@/components/ui/watermark";

interface PhotoCardProps {
  photo: Photo;
  albumPath?: string;
  onPreview: (photo: Photo) => void;
}

export default function PhotoCard({ photo, albumPath, onPreview }: PhotoCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { addToCart } = useCart();
  const { toast } = useToast();

  // 写真の説明を安全に取得する関数
  const getPhotoDescription = (photo: Photo): string => {
    if (!photo.metadata) return `写真 #${photo.id}`;
    
    try {
      const metadata = photo.metadata as Record<string, unknown>;
      return (metadata.description as string) || `写真 #${photo.id}`;
    } catch {
      return `写真 #${photo.id}`;
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!photo) return;
    
    // 価格が0円の場合はカートに追加しない
    if (photo.price <= 0) {
      toast({
        title: "価格が設定されていません",
        description: "管理者が価格を設定するまでお待ちください",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }
    
    // 写真をカートに追加
    const cartItem = {
      type: "photo" as const,
      itemId: photo.id,
      name: getPhotoDescription(photo),
      price: photo.price,
      thumbnailUrl: photo.thumbnailUrl || '',
      path: albumPath || '',
    };
    
    addToCart(cartItem);

    toast({
      title: "カートに追加しました",
      description: "ヘッダーのカートアイコンから確認できます",
      duration: 3000,
    });
  };

  return (
    <div 
      className="group relative" 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="overflow-hidden rounded-lg shadow-md aspect-square bg-gray-100">
        <Watermark>
          <img 
            src={photo.watermarkedUrl} 
            alt={getPhotoDescription(photo)}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        </Watermark>
      </div>
      
      <div 
        className={`absolute inset-0 bg-black transition-opacity flex items-center justify-center ${
          isHovered ? "bg-opacity-30 opacity-100" : "bg-opacity-0 opacity-0"
        }`}
      >
        <button 
          className="bg-white text-primary rounded-full p-2 mx-1 hover:bg-accent hover:text-white transition-colors"
          onClick={() => onPreview(photo)}
        >
          <Eye className="h-4 w-4" />
        </button>
        <button 
          className="bg-white text-primary rounded-full p-2 mx-1 hover:bg-accent hover:text-white transition-colors"
          onClick={handleAddToCart}
        >
          <ShoppingCart className="h-4 w-4" />
        </button>
      </div>
      
      <div className="mt-2 text-center">
        <p className="text-sm font-medium">¥{photo.price.toLocaleString()} (税込)</p>
      </div>
    </div>
  );
}
