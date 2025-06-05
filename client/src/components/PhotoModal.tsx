import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import { Photo } from "@shared/schema";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/use-toast";
import { Watermark } from "@/components/ui/watermark";

interface PhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  photo: Photo | null;
  photos: Photo[];
  albumPath?: string;
}

export default function PhotoModal({ isOpen, onClose, photo, photos, albumPath }: PhotoModalProps) {
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Update current index when photo changes
  useEffect(() => {
    if (photo && photos) {
      const index = photos.findIndex(p => p.id === photo.id);
      if (index !== -1) {
        setCurrentIndex(index);
      }
    }
  }, [photo, photos]);

  // 写真がない場合は何も表示しない
  if (!photo || photos.length === 0) {
    return null;
  }

  const currentPhoto = photos[currentIndex];

  // 現在の写真がない場合も何も表示しない
  if (!currentPhoto) {
    return null;
  }

  const handlePrevious = () => {
    setCurrentIndex(prev => (prev - 1 + photos.length) % photos.length);
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % photos.length);
  };

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

  // 写真の撮影日を安全に取得する関数
  const getPhotoDateTaken = (photo: Photo): string => {
    if (!photo.metadata) return "";
    
    try {
      const metadata = photo.metadata as Record<string, unknown>;
      return (metadata.dateTaken as string) || "";
    } catch {
      return "";
    }
  };

  const handleAddToCart = () => {
    // 価格が0円の場合はカートに追加しない
    if (currentPhoto.price <= 0) {
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
      itemId: currentPhoto.id,
      name: getPhotoDescription(currentPhoto),
      price: currentPhoto.price,
      thumbnailUrl: currentPhoto.thumbnailUrl || '',
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0 bg-black">
        <div className="flex justify-between items-center py-4 px-4 bg-black">
          <h3 className="text-white text-lg font-semibold">写真プレビュー</h3>
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="bg-white text-primary hover:bg-accent hover:text-white transition-colors"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="text-white hover:text-accent"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-4 bg-black">
          <Watermark>
            <img 
              src={currentPhoto.watermarkedUrl} 
              alt={getPhotoDescription(currentPhoto)}
              className="max-h-[70vh] max-w-full object-contain"
            />
          </Watermark>
        </div>
        
        <div className="p-4 bg-black text-white flex justify-between items-center">
          <div>
            <p className="font-semibold">
              {getPhotoDescription(currentPhoto)}
            </p>
            <p className="text-sm opacity-75">
              {getPhotoDateTaken(currentPhoto)}
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg">¥{currentPhoto.price.toLocaleString()}</p>
            <p className="text-sm opacity-75">写真単品価格</p>
          </div>
        </div>
        
        <div className="p-4 flex justify-between text-white bg-black">
          <Button 
            variant="ghost" 
            onClick={handlePrevious}
            className="text-white hover:text-accent"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> 前の写真
          </Button>
          <Button 
            variant="ghost" 
            onClick={handleNext}
            className="text-white hover:text-accent"
          >
            次の写真 <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}