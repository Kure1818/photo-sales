import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
// アイコンをテキストに置き換え
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationEllipsis } from "@/components/ui/pagination";
import { Album, Category, Photo } from "@shared/schema";
import type { Event, Organization } from "@shared/schema";
import OrganizationBanner from "@/components/OrganizationBanner";
import Breadcrumbs from "@/components/Breadcrumbs";
import PhotoCard from "@/components/PhotoCard";
import PhotoModal from "@/components/PhotoModal";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const PHOTOS_PER_PAGE = 15;

export default function AlbumPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const albumId = parseInt(id);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const { addToCart } = useCart();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: album, isLoading: albumLoading } = useQuery<Album>({
    queryKey: [`/api/albums/${albumId}`],
  });

  const { data: category, isLoading: categoryLoading } = useQuery<Category>({
    queryKey: [`/api/categories/${album?.categoryId}`],
    enabled: !!album?.categoryId,
  });

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: [`/api/events/${category?.eventId}`],
    enabled: !!category?.eventId,
  });

  const { data: organization, isLoading: orgLoading } = useQuery<Organization>({
    queryKey: [`/api/organizations/${event?.organizationId}`],
    enabled: !!event?.organizationId,
  });

  const { data: photos = [], isLoading: photosLoading } = useQuery<Photo[]>({
    queryKey: [`/api/albums/${albumId}/photos`],
    enabled: !!album,
  });

  const isLoading = albumLoading || categoryLoading || eventLoading || orgLoading || photosLoading;

  // 非公開アルバムへのアクセスチェック
  // 管理者でない場合、非公開アルバムにはアクセスできない
  useEffect(() => {
    if (album && !album.isPublished && !user?.isAdmin) {
      toast({
        title: "アクセス制限",
        description: "このアルバムは現在非公開です",
        variant: "destructive",
      });
      navigate('/');
    }
  }, [album, user, navigate, toast]);

  // Calculate pagination
  const totalPages = Math.ceil(photos.length / PHOTOS_PER_PAGE);
  const paginatedPhotos = photos.slice(
    (currentPage - 1) * PHOTOS_PER_PAGE,
    currentPage * PHOTOS_PER_PAGE
  );

  // Create breadcrumb path string for cart items
  const breadcrumbPath = [
    organization?.name,
    event?.name,
    category?.name,
    album?.name
  ].filter(Boolean).join(" > ");

  const handleBuyAlbum = () => {
    if (!album) return;
    
    // アルバムをカートに追加
    const cartItem = {
      type: "album" as const,
      itemId: album.id,
      name: album.name,
      price: album.price,
      thumbnailUrl: album.coverImage || '',
      path: breadcrumbPath,
    };
    
    addToCart(cartItem);

    toast({
      title: "アルバムをカートに追加しました",
      description: "ヘッダーのカートアイコンから確認できます",
      duration: 3000,
    });
  };

  return (
    <div>
      <OrganizationBanner organization={organization} event={event} />
      
      <Breadcrumbs
        items={[
          { label: organization?.name || "", href: `/organizations/${organization?.id}` },
          { label: event?.name || "", href: `/events/${event?.id}` },
          { label: category?.name || "", href: `/categories/${category?.id}` },
          { label: album?.name || "", href: `/albums/${albumId}` },
        ]}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold">{album?.name}</h2>
            <p className="text-gray-600">{album?.description} - {photos.length}枚の写真</p>
          </div>
          <div className="flex items-center space-x-3">
            {/* アルバム価格が0円より大きい場合のみアルバム購入ボタンを表示 */}
            {album && album.price && album.price > 0 && (
              <Button
                className="flex items-center bg-accent hover:bg-green-600 text-white"
                onClick={handleBuyAlbum}
              >
                🛒
                アルバム購入 (¥{album?.price?.toLocaleString() || 0})
              </Button>
            )}
            <Button
              variant="outline"
              className="text-primary hover:text-accent flex items-center"
              onClick={() => category && navigate(`/categories/${category.id}`)}
            >
              ← アルバムに戻る
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : paginatedPhotos.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {paginatedPhotos.map((photo) => (
                <PhotoCard 
                  key={photo.id} 
                  photo={photo}
                  albumPath={breadcrumbPath}
                  onPreview={setSelectedPhoto}
                />
              ))}
            </div>
            
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                      >
                        前へ
                      </PaginationLink>
                    </PaginationItem>
                    
                    {[...Array(totalPages)].map((_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink
                          isActive={currentPage === i + 1}
                          onClick={() => setCurrentPage(i + 1)}
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                      >
                        次へ
                      </PaginationLink>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">このアルバムにはまだ写真がありません。</p>
          </div>
        )}
      </div>

      {selectedPhoto && (
        <PhotoModal
          isOpen={!!selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          photo={selectedPhoto}
          photos={photos}
          albumPath={breadcrumbPath}
        />
      )}
    </div>
  );
}
