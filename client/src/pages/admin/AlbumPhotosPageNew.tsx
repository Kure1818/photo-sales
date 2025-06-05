import { useState, useCallback, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Organization, Event, Category, Album, Photo } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export default function AlbumPhotosPageNew() {
  const { organizationId, eventId, categoryId, albumId } = useParams();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // 状態管理
  const [albumName, setAlbumName] = useState("");
  const [albumDescription, setAlbumDescription] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState<number[]>([]);
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const photosPerPage = 24;
  
  // 管理者ではない場合はリダイレクト
  if (user && !user.isAdmin) {
    setLocation("/auth");
    return <div>リダイレクト中...</div>;
  }

  // 組織情報を取得
  const {
    data: organization,
    isLoading: isLoadingOrg,
  } = useQuery<Organization>({
    queryKey: [`/api/organizations/${organizationId}`],
    enabled: !!organizationId,
  });

  // イベント情報を取得
  const {
    data: event,
    isLoading: isLoadingEvent,
  } = useQuery<Event>({
    queryKey: [`/api/events/${eventId}`],
    enabled: !!eventId,
  });

  // カテゴリ情報を取得
  const {
    data: category,
    isLoading: isLoadingCategory,
  } = useQuery<Category>({
    queryKey: [`/api/categories/${categoryId}`],
    enabled: !!categoryId,
  });

  // アルバム情報を取得
  const {
    data: album,
    isLoading: isLoadingAlbum,
  } = useQuery<Album>({
    queryKey: [`/api/albums/${albumId}`],
    enabled: !!albumId,
  });

  // 写真一覧を取得
  const {
    data: photos,
    isLoading: isLoadingPhotos,
  } = useQuery<Photo[]>({
    queryKey: [`/api/albums/${albumId}/photos`],
    enabled: !!albumId,
  });

  // アルバム情報の初期値を設定
  useEffect(() => {
    if (album) {
      setAlbumName(album.name);
      setAlbumDescription(album.description || "");
    }
  }, [album]);

  // カバー画像設定ミューテーション
  const setCoverImageMutation = useMutation({
    mutationFn: async (photoId: number) => {
      const photo = photos?.find(p => p.id === photoId);
      if (!photo) throw new Error("選択した写真が見つかりません");
      
      
      const response = await apiRequest("PATCH", `/api/albums/${albumId}/cover`, {
        coverImage: photo.thumbnailUrl
      });
      
      if (!response.ok) throw new Error("サムネイルの設定に失敗しました");
      return response.json();
    },
    onSuccess: async (data) => {
      
      // アルバムの状態を更新
      if (album) {
        album.coverImage = data.coverImage;
      }
      
      // すべての関連クエリを無効化して最新データを取得
      await queryClient.invalidateQueries({ queryKey: [`/api/albums/${albumId}`] });
      await queryClient.invalidateQueries({ queryKey: [`/api/categories/${categoryId}/albums`] });
      await queryClient.invalidateQueries({ queryKey: [`/api/categories/${categoryId}`] });
      
      // 強制的に再度フェッチを行う
      try {
        await queryClient.fetchQuery({ 
          queryKey: [`/api/categories/${categoryId}/albums`]
        });
      } catch (error) {
        console.error("アルバム一覧の再取得に失敗:", error);
      }
      
      toast({
        title: "サムネイルを設定しました",
        description: "アルバム一覧も更新されました",
        variant: "default",
      });
      setSelectedPhotos([]);
    },
    onError: (error: Error) => {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // 写真削除ミューテーション
  const deletePhotosMutation = useMutation({
    mutationFn: async (photoIds: number[]) => {
      const results = await Promise.all(
        photoIds.map(photoId => 
          apiRequest("DELETE", `/api/photos/${photoId}`)
        )
      );
      
      if (results.some(r => !r.ok)) {
        throw new Error("一部の写真の削除に失敗しました");
      }
      
      return photoIds;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/albums/${albumId}/photos`] });
      toast({
        title: "選択した写真を削除しました",
        variant: "default",
      });
      setSelectedPhotos([]);
    },
    onError: (error: Error) => {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // アルバム更新ミューテーション
  const updateAlbumMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const response = await apiRequest("PATCH", `/api/albums/${albumId}`, data);
      if (!response.ok) throw new Error("アルバムの更新に失敗しました");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/albums/${albumId}`] });
      toast({
        title: "アルバムを更新しました",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // ドラッグアンドドロップハンドラー
  const onDrop = useCallback((acceptedFiles: File[]) => {
    
    // ファイルをログに記録
    acceptedFiles.forEach((file, i) => {
    });
    
    // アップロードキューに追加
    setUploadQueue(prev => [...prev, ...acceptedFiles]);
    
    // プレビュー用URLを生成
    const newPreviewUrls = acceptedFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
  }, []);

  // ドラッグアンドドロップイベントハンドラー
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      onDrop(files);
    }
  }, [onDrop]);

  // ファイル選択ダイアログから画像を追加
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onDrop(files);
    }
  }, [onDrop]);

  // キューから写真を削除
  const removeFromQueue = useCallback((index: number) => {
    setUploadQueue(prev => prev.filter((_, i) => i !== index));
    
    // プレビューURLを解放
    if (previewUrls[index]) {
      URL.revokeObjectURL(previewUrls[index]);
    }
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  }, [previewUrls]);

  // キューをすべて削除
  const clearQueue = useCallback(() => {
    // すべてのプレビューURLを解放
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setPreviewUrls([]);
    setUploadQueue([]);
  }, [previewUrls]);

  // アップロード処理
  const uploadPhotos = useCallback(async () => {
    if (uploadQueue.length === 0) {
      toast({
        title: "アップロード対象なし",
        description: "アップロードする写真がありません",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const totalFiles = uploadQueue.length;
      let successCount = 0;
      
      // 各ファイルを順次アップロード
      for (let i = 0; i < uploadQueue.length; i++) {
        const file = uploadQueue[i];
        const formData = new FormData();
        formData.append("photo", file);
        
        try {
          const response = await apiRequest("POST", `/api/albums/${albumId}/photos/upload`, formData);
          
          if (response.ok) {
            successCount++;
          }
        } catch (error) {
          console.error(`ファイル ${file.name} のアップロードに失敗:`, error);
        }
      }
      
      // アップロード結果の通知
      if (successCount === totalFiles) {
        toast({
          title: "アップロード完了",
          description: `${successCount}枚の写真がアップロードされました`,
        });
      } else {
        toast({
          title: "一部アップロード完了",
          description: `${successCount}/${totalFiles}枚の写真がアップロードされました`,
          variant: "destructive",
        });
      }
      
      // キューをクリア
      clearQueue();
      
      // 写真リストを再取得
      queryClient.invalidateQueries({queryKey: [`/api/albums/${albumId}/photos`]});
      
    } catch (error) {
      console.error("アップロードエラー:", error);
      toast({
        title: "エラーが発生しました",
        description: "写真のアップロードに失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [uploadQueue, albumId, toast, clearQueue]);

  // 写真の選択状態を切り替える
  const togglePhotoSelection = (photoId: number) => {
    setSelectedPhotos(prev => {
      if (prev.includes(photoId)) {
        return prev.filter(id => id !== photoId);
      } else {
        return [...prev, photoId];
      }
    });
  };

  // すべて選択
  const selectAll = () => {
    if (!photos) return;
    
    // 現在のページの写真のみを選択
    const start = (currentPage - 1) * photosPerPage;
    const end = Math.min(start + photosPerPage, photos.length);
    const currentPagePhotoIds = photos.slice(start, end).map(photo => photo.id);
    
    setSelectedPhotos(currentPagePhotoIds);
  };

  // すべて解除
  const deselectAll = () => {
    setSelectedPhotos([]);
  };

  // ページ切り替え
  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  // 保存処理
  const handleSave = () => {
    updateAlbumMutation.mutate({
      name: albumName,
      description: albumDescription
    });
  };

  // ページネーション関連
  const totalPages = photos ? Math.ceil(photos.length / photosPerPage) : 0;
  const paginatedPhotos = photos ? photos.slice(
    (currentPage - 1) * photosPerPage, 
    currentPage * photosPerPage
  ) : [];

  const isLoading = isLoadingOrg || isLoadingEvent || isLoadingCategory || isLoadingAlbum || isLoadingPhotos;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!album) {
    return <div>アルバムが見つかりません</div>;
  }

  return (
    <div className="container mx-auto px-0 bg-gray-50">
      <h1 className="text-xl font-bold border-b pb-2 mb-4">写真管理</h1>
      
      {/* アルバム情報セクション */}
      <div className="mb-6">
        <h2 className="text-base font-semibold mb-2">📁 アルバムの詳細</h2>
        <p className="text-xs text-gray-500 mb-4">詳細は以下で入力できます。</p>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border rounded-md overflow-hidden bg-white">
          <div className="p-4 bg-gray-50 border-r border-b md:border-b-0">
            <div className="font-medium mb-1">カテゴリー名</div>
            <div className="text-sm">{category?.name || ""}</div>
          </div>
          
          <div className="md:col-span-3 p-4 border-b">
            <Input 
              type="text" 
              name="title" 
              placeholder="タイトル/任意の文字" 
              className="mb-1" 
              value={albumName}
              onChange={(e) => setAlbumName(e.target.value)}
            />
            <p className="text-xs text-red-500 mt-1">※アルバムタイトルとその写真のカテゴリが同じ場合は他のカテゴリと被らない様にしてください。（カテゴリ名＋文字）</p>
          </div>
          
          <div className="p-4 bg-gray-50 border-r">
            <div className="font-medium mb-1">説明</div>
          </div>
          
          <div className="md:col-span-3 p-4">
            <Textarea 
              name="description" 
              rows={4}
              value={albumDescription}
              onChange={(e) => setAlbumDescription(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      {/* アルバムギャラリーセクション */}
      <div className="mb-6">
        <h2 className="text-base font-semibold mb-2">📷 アルバムギャラリー</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-0 border rounded-md overflow-hidden bg-white">
          <div className="p-4 bg-gray-50 border-r border-b md:border-b-0 flex flex-col justify-center items-center">
            <div className="font-medium mb-2">画像アップロード</div>
            <div
              className="border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center w-full cursor-pointer bg-white hover:bg-gray-50 transition-colors"
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById("photo-upload")?.click()}
              style={{ minHeight: "150px" }}
            >
              <div className="mb-2">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto text-gray-400">
                  <path d="M21 14V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M12 3L12 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M8 7L12 3L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="text-xs text-center text-gray-600 mb-1">
                ファイルをドラッグ＆ドロップしてください。<br />
                (画像形式のファイルをアップロード可能)
              </div>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileInputChange}
              />
            </div>
            <div className="text-xs text-center text-gray-500 mt-2">
              画像: {photos?.length || 0}/542
              <div className="mt-1">アップロード可能サイズ：500MB</div>
            </div>

            <div className="mt-3 w-full">
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white" 
                disabled={uploadQueue.length === 0 || isUploading}
                onClick={uploadPhotos}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    アップロード中...
                  </>
                ) : (
                  <>一括アップロード ({uploadQueue.length})</>
                )}
              </Button>
            </div>

            <div className="text-xs text-center text-gray-500 mt-4">
              <span>アルバムタイトルは「漢字+英字+数字」等でお願いします。</span><br />
              <span>特殊文字や全角文字等は不可です。</span><br />
              <span>英数字は半角文字を下さい。</span>
            </div>
          </div>
          
          <div className="md:col-span-4 p-4">
            <div className="grid grid-cols-6 gap-1">
              {paginatedPhotos.map((photo) => (
                <div 
                  key={photo.id}
                  className={`border-2 bg-white cursor-pointer overflow-hidden relative ${
                    selectedPhotos.includes(photo.id) ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                  }`}
                  onClick={() => togglePhotoSelection(photo.id)}
                >
                  <div className="aspect-square relative">
                    <img 
                      src={photo.thumbnailUrl} 
                      alt={photo.filename}
                      className="object-cover w-full h-full"
                    />
                    {album.coverImage && photo.thumbnailUrl && album.coverImage === photo.thumbnailUrl && (
                      <div className="absolute top-0 right-0 bg-green-500 text-white text-xs px-1">
                        サムネイル
                      </div>
                    )}
                    {selectedPhotos.includes(photo.id) && (
                      <div className="absolute top-1 left-1 bg-blue-500 text-white rounded-sm p-0.5 shadow-md border border-white">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* ページネーション */}
            {totalPages > 1 && (
              <div className="flex flex-col mt-4 border-t pt-4">
                <div className="text-xs text-gray-600 mb-2">
                  {photos?.length ? `${(currentPage - 1) * photosPerPage + 1}-${Math.min(currentPage * photosPerPage, photos.length)}件目 (全${photos.length}枚)` : '0枚'}
                </div>
                
                <div className="flex items-center justify-center space-x-1">
                  {/* 前へボタン */}
                  <button 
                    className={`px-2 py-1 text-xs flex items-center justify-center rounded ${
                      currentPage === 1 ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                    onClick={() => currentPage > 1 && goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    前へ
                  </button>
                  
                  {/* ページ番号と省略記号 */}
                  {(() => {
                    const pageButtons = [];
                    const maxVisiblePages = 5; // 一度に表示するページ数
                    
                    // 表示するページ範囲を計算
                    let startPage, endPage;
                    if (totalPages <= maxVisiblePages) {
                      // 総ページ数が少ない場合はすべて表示
                      startPage = 1;
                      endPage = totalPages;
                    } else {
                      // ページ数が多い場合は現在のページを中心に表示
                      const halfVisible = Math.floor(maxVisiblePages / 2);
                      
                      if (currentPage <= halfVisible) {
                        // 前半のページ
                        startPage = 1;
                        endPage = maxVisiblePages;
                      } else if (currentPage > totalPages - halfVisible) {
                        // 後半のページ
                        startPage = totalPages - maxVisiblePages + 1;
                        endPage = totalPages;
                      } else {
                        // 中間のページ
                        startPage = currentPage - halfVisible;
                        endPage = currentPage + halfVisible;
                      }
                    }
                    
                    // 最初のページを表示（常に表示）
                    pageButtons.push(
                      <button 
                        key={1}
                        className={`w-8 h-8 flex items-center justify-center rounded-md ${
                          currentPage === 1 ? 'bg-orange-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                        onClick={() => goToPage(1)}
                      >
                        {currentPage === 1 ? '[1]' : '1'}
                      </button>
                    );
                    
                    // スタートページが1より大きい場合は省略記号を表示
                    if (startPage > 2) {
                      pageButtons.push(
                        <button 
                          key="ellipsis-start"
                          className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-md"
                          onClick={() => goToPage(Math.max(1, currentPage - maxVisiblePages))}
                        >
                          ...
                        </button>
                      );
                    }
                    
                    // 表示範囲のページを追加
                    for (let i = startPage; i <= endPage; i++) {
                      // 最初と最後のページは別に処理するので、それ以外のページを表示
                      if (i === 1 || i === totalPages) continue;
                      
                      pageButtons.push(
                        <button 
                          key={i}
                          className={`w-8 h-8 flex items-center justify-center rounded-md ${
                            currentPage === i ? 'bg-orange-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                          onClick={() => goToPage(i)}
                        >
                          {currentPage === i ? `[${i}]` : i}
                        </button>
                      );
                    }
                    
                    // 最後のページを表示（常に表示）
                    if (endPage < totalPages) {
                      // 最後のページの前に「...」を表示
                      if (endPage < totalPages - 1) {
                        pageButtons.push(
                          <button 
                            key="ellipsis-end"
                            className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-md"
                            onClick={() => goToPage(Math.min(totalPages, currentPage + maxVisiblePages))}
                          >
                            ...
                          </button>
                        );
                      }
                      
                      pageButtons.push(
                        <button 
                          key={totalPages}
                          className={`w-8 h-8 flex items-center justify-center rounded-md ${
                            currentPage === totalPages ? 'bg-orange-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                          onClick={() => goToPage(totalPages)}
                        >
                          {currentPage === totalPages ? `[${totalPages}]` : totalPages}
                        </button>
                      );
                    }
                    
                    return pageButtons;
                  })()}
                  
                  {/* 次へボタン */}
                  <button 
                    className={`px-2 py-1 text-xs flex items-center justify-center rounded ${
                      currentPage === totalPages ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                    onClick={() => currentPage < totalPages && goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    次へ
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
            
            {/* 操作ボタン */}
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                className="bg-orange-500 text-white px-4 py-2 rounded-md text-sm"
                onClick={() => {
                  if (selectedPhotos.length === 1) {
                    setCoverImageMutation.mutate(selectedPhotos[0]);
                  } else {
                    toast({
                      title: "1枚の写真を選択してください",
                      variant: "destructive",
                    });
                  }
                }}
                disabled={setCoverImageMutation.isPending}
              >
                {setCoverImageMutation.isPending ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    処理中...
                  </div>
                ) : "サムネイルの設定"}
              </button>
              
              <Link 
                href={`/admin/organizations/${organizationId}/events/${eventId}/categories/${categoryId}/albums/${albumId}/pricing`}
              >
                <button
                  className="bg-purple-500 text-white px-4 py-2 rounded-md text-sm flex items-center"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="mr-1"
                  >
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  販売設定
                </button>
              </Link>
              
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm"
                onClick={() => deletePhotosMutation.mutate(selectedPhotos)}
                disabled={selectedPhotos.length === 0 || deletePhotosMutation.isPending}
              >
                写真を削除
              </button>
              
              <button
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm"
                onClick={selectAll}
              >
                すべて選択
              </button>
              
              <button
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm"
                onClick={deselectAll}
                disabled={selectedPhotos.length === 0}
              >
                すべて解除
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* 保存ボタン */}
      <div className="flex justify-center space-x-3 mb-8">
        <button
          className="bg-green-500 text-white px-8 py-2 rounded-md"
          onClick={handleSave}
          disabled={updateAlbumMutation.isPending}
        >
          更新する
        </button>
        
        <button
          className="bg-gray-400 text-white px-8 py-2 rounded-md"
          onClick={() => window.history.back()}
        >
          戻る
        </button>

        <Link 
          to={`/admin/organizations/${organizationId}/events/${eventId}/categories/${categoryId}/albums`}
          className="bg-blue-500 text-white px-8 py-2 rounded-md flex items-center"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="mr-2"
          >
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          アルバム一覧へ
        </Link>
      </div>
    </div>
  );
}