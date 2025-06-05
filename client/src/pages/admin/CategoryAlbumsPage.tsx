import { useState, useCallback, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Organization, Event, Category, Album } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Globe, Lock } from "lucide-react";

// アルバムに写真数追加の型拡張
interface AlbumWithPhotoCount extends Album {
  photoCount?: number;
}
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Upload,
  Image,
  Check,
  Trash2,
  X,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function SimpleAlbumPage() {
  const { organizationId, eventId, categoryId } = useParams();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [currentAlbumName, setCurrentAlbumName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [queuedAlbums, setQueuedAlbums] = useState<{name: string, files: File[]}[]>([]);
  const [hoveredAlbumId, setHoveredAlbumId] = useState<number | null>(null);
  
  // アルバム削除のミューテーション
  const deleteAlbumMutation = useMutation({
    mutationFn: async (albumId: number) => {
      await apiRequest("DELETE", `/api/albums/${albumId}`);
    },
    onSuccess: () => {
      toast({
        title: "アルバムを削除しました",
        description: "アルバムが正常に削除されました",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/categories/${categoryId}/albums`] });
    },
    onError: (error) => {
      toast({
        title: "削除エラー",
        description: error instanceof Error ? error.message : "アルバムの削除に失敗しました",
        variant: "destructive",
      });
    }
  });
  
  // アルバム一括公開・非公開のミューテーション
  const bulkPublishMutation = useMutation({
    mutationFn: async ({ albumIds, isPublished }: { albumIds: number[], isPublished: boolean }) => {
      const response = await apiRequest("PATCH", `/api/albums/bulk-publish`, { albumIds, isPublished });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.message,
        description: `${data.updatedCount}件のアルバムの公開状態を更新しました`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/categories/${categoryId}/albums`] });
      // 選択をクリア
      setSelectedAlbums([]);
    },
    onError: (error) => {
      toast({
        title: "更新エラー",
        description: error instanceof Error ? error.message : "アルバムの公開状態の更新に失敗しました",
        variant: "destructive",
      });
    }
  });
  
  // 選択したアルバムを一括公開する
  const bulkPublishAlbums = async () => {
    if (selectedAlbums.length === 0) {
      toast({
        title: "アルバムが選択されていません",
        description: "公開するアルバムを選択してください",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await bulkPublishMutation.mutateAsync({ albumIds: selectedAlbums, isPublished: true });
    } catch (error) {
      console.error("一括公開エラー:", error);
    }
  };
  
  // 選択したアルバムを一括非公開にする
  const bulkUnpublishAlbums = async () => {
    if (selectedAlbums.length === 0) {
      toast({
        title: "アルバムが選択されていません",
        description: "非公開にするアルバムを選択してください",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await bulkPublishMutation.mutateAsync({ albumIds: selectedAlbums, isPublished: false });
    } catch (error) {
      console.error("一括非公開エラー:", error);
    }
  };
  
  // 選択されたアルバムを一括削除する
  const bulkDeleteAlbums = async () => {
    if (selectedAlbums.length === 0) return;
    
    if (confirm(`${selectedAlbums.length}個のアルバムを削除してもよろしいですか？`)) {
      try {
        for (const albumId of selectedAlbums) {
          await deleteAlbumMutation.mutateAsync(albumId);
        }
        setSelectedAlbums([]);
        toast({
          title: "一括削除完了",
          description: `${selectedAlbums.length}個のアルバムを削除しました`,
        });
      } catch (error) {
        toast({
          title: "一括削除エラー",
          description: "一部のアルバムの削除に失敗しました",
          variant: "destructive",
        });
      }
    }
  };
  
  // 選択されたアルバムを管理する状態
  const [selectedAlbums, setSelectedAlbums] = useState<number[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  
  // アルバムの選択/選択解除
  const toggleAlbumSelection = (albumId: number) => {
    if (selectedAlbums.includes(albumId)) {
      setSelectedAlbums(selectedAlbums.filter(id => id !== albumId));
    } else {
      setSelectedAlbums([...selectedAlbums, albumId]);
    }
  };
  
  // すべてのアルバムを選択/選択解除
  const toggleSelectAll = () => {
    if (albums && albums.length > 0) {
      if (selectedAlbums.length === albums.length) {
        setSelectedAlbums([]);
      } else {
        setSelectedAlbums(albums.map(album => album.id));
      }
    }
  };
  
  // 一括販売設定ページへ移動
  const navigateToBulkPricing = () => {
    if (selectedAlbums.length === 0) {
      toast({
        title: "アルバムが選択されていません",
        description: "一括設定するアルバムを選択してください",
        variant: "destructive",
      });
      return;
    }
    
    // クエリパラメータとして選択されたアルバムIDを渡す
    const albumIdsQuery = selectedAlbums.join(',');
    setLocation(`/admin/organizations/${organizationId}/events/${eventId}/categories/${categoryId}/bulk-pricing?albums=${albumIdsQuery}`);
  };
  
  // アップロード中のアルバム名とファイル数を追跡
  const [currentlyUploadingAlbum, setCurrentlyUploadingAlbum] = useState<{name: string, total: number, current: number} | null>(null);
  
  // サムネイル更新検出用のタイムスタンプ
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());
  
  // 定期的に強制的にデータを更新する
  useEffect(() => {
    const refreshTimer = setInterval(() => {
      setLastRefreshTime(Date.now());
      queryClient.invalidateQueries({ queryKey: [`/api/categories/${categoryId}/albums`] });
    }, 5000);
    
    return () => clearInterval(refreshTimer);
  }, [categoryId]);
  
  // 管理者ではない場合はリダイレクト
  if (user && !user.isAdmin) {
    setLocation("/auth");
    return <div>リダイレクト中...</div>;
  }
  
  // ドラッグアンドドロップハンドラー
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => file.size < 500 * 1024 * 1024);
    
    if (validFiles.length !== acceptedFiles.length) {
      toast({
        title: "サイズエラー",
        description: "500MB以上のファイルはアップロードできません",
        variant: "destructive",
      });
    }
    
    setUploadQueue(prev => [...prev, ...validFiles]);
    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
  }, [toast]);

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
      onDrop(Array.from(e.target.files));
    }
  }, [onDrop]);

  // キューをクリア
  const clearQueue = useCallback(() => {
    // プレビューURLのメモリリーク防止
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    
    setUploadQueue([]);
    setPreviewUrls([]);
  }, [previewUrls]);

  // データ取得
  const { data: organization } = useQuery<Organization>({
    queryKey: [`/api/organizations/${organizationId}`],
    enabled: !!organizationId,
  });

  const { data: event } = useQuery<Event>({
    queryKey: [`/api/events/${eventId}`],
    enabled: !!eventId,
  });

  const { data: category } = useQuery<Category>({
    queryKey: [`/api/categories/${categoryId}`],
    enabled: !!categoryId,
  });

  const { data: albums, refetch: refetchAlbums } = useQuery<AlbumWithPhotoCount[]>({
    queryKey: [`/api/categories/${categoryId}/albums`],
    enabled: !!categoryId,
    refetchInterval: isUploading ? 1000 : 5000, // アップロード中は1秒ごと、通常時は5秒ごとに再取得
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 2000, // データを2秒間だけ新鮮と見なす
  });
  
  // アルバムをキューに登録する処理
  const handleQueueAlbum = () => {
    if (!currentAlbumName || uploadQueue.length === 0) return;
    
    // キューに新しいアルバムを追加
    setQueuedAlbums(prev => [...prev, {
      name: currentAlbumName,
      files: [...uploadQueue]
    }]);
    
    // フォームをリセット
    setCurrentAlbumName('');
    clearQueue();
    
    // メッセージ表示
    toast({
      title: "アルバム登録完了",
      description: `「${currentAlbumName}」アルバムをキューに追加しました（${uploadQueue.length}枚）`,
    });
  };
  
  // キュー状態をローカルで管理
  const [albumStatusMap, setAlbumStatusMap] = useState<Record<string, any>>({});

  // キューに入っているアルバムをすべてアップロードする処理
  const handleUploadAllQueued = async () => {
    if (queuedAlbums.length === 0) {
      toast({
        title: "アップロード対象なし",
        description: "キューにアルバムがありません",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsUploading(true);
      await refetchAlbums();
      
      const initialStatuses: Record<string, any> = {};
      queuedAlbums.forEach(album => {
        initialStatuses[album.name] = {
          status: 'queued',
          total: album.files.length
        };
      });
      setAlbumStatusMap(initialStatuses);
      
      for (const queuedAlbum of queuedAlbums) {
        // 現在処理中のアルバムを設定
        setCurrentlyUploadingAlbum({
          name: queuedAlbum.name,
          total: queuedAlbum.files.length,
          current: 0
        });
        
        // アルバムステータスを更新
        setAlbumStatusMap(prev => ({
          ...prev,
          [queuedAlbum.name]: {
            ...prev[queuedAlbum.name],
            status: 'uploading',
            progress: 0
          }
        }));
        
        // 1. アルバムを作成
        const albumResponse = await fetch('/api/admin/albums', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: queuedAlbum.name,
            categoryId: Number(categoryId),
            description: "",
            coverImage: "",
            price: 1200, // デフォルト価格
            isPublished: false, // デフォルトで非公開状態
          }),
        });
        
        if (!albumResponse.ok) {
          throw new Error(`アルバム「${queuedAlbum.name}」の作成に失敗しました`);
        }
        
        const albumResult = await albumResponse.json();
        
        // アルバムIDを保存
        setAlbumStatusMap(prev => ({
          ...prev,
          [queuedAlbum.name]: {
            ...prev[queuedAlbum.name],
            id: albumResult.id
          }
        }));
        
        // アップロードが始まったら再度アルバムリストを更新
        await refetchAlbums();
        
        // 2. 写真を順次アップロード
        const albumId = albumResult.id;
        let uploadedCount = 0;
        
        for (const file of queuedAlbum.files) {
          const formData = new FormData();
          formData.append("photo", file);
          
          try {
            const response = await fetch(`/api/albums/${albumId}/photos/upload`, {
              method: 'POST',
              body: formData,
            });
            
            if (response.ok) {
              uploadedCount++;
              setCurrentlyUploadingAlbum({
                name: queuedAlbum.name,
                total: queuedAlbum.files.length,
                current: uploadedCount
              });
              
              // アルバムステータスを更新
              setAlbumStatusMap(prev => ({
                ...prev,
                [queuedAlbum.name]: {
                  ...prev[queuedAlbum.name],
                  status: 'uploading',
                  progress: uploadedCount
                }
              }));
              
              // 定期的にアルバムリストを更新
              if (uploadedCount % 3 === 0) {
                await refetchAlbums();
              }
            }
          } catch (error) {
            console.error(`写真のアップロードに失敗:`, error);
          }
        }
        
        // アップロード完了、サムネイル作成中に変更
        setAlbumStatusMap(prev => ({
          ...prev,
          [queuedAlbum.name]: {
            ...prev[queuedAlbum.name],
            status: 'thumbnail-processing'
          }
        }));
        
        // このアルバムのアップロードが完了したら再度アルバムリストを更新
        await refetchAlbums();
      }
      
      // 3. 成功メッセージを表示
      toast({
        title: "アップロード完了",
        description: `${queuedAlbums.length}個のアルバムをアップロードしました`,
      });
      
      // 4. キューをクリア
      setQueuedAlbums([]);
      setCurrentlyUploadingAlbum(null);
      
      // 5. アルバムリストを再取得
      queryClient.invalidateQueries({ queryKey: [`/api/categories/${categoryId}/albums`] });
      
    } catch (error) {
      console.error("アップロードエラー:", error);
      toast({
        title: "エラーが発生しました",
        description: error instanceof Error ? error.message : "処理に失敗しました。",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setCurrentlyUploadingAlbum(null);
    }
  };

  return (
    <div className="container mx-auto py-2">
      <Breadcrumb className="mb-2">
        <BreadcrumbList className="flex flex-wrap text-xs">
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">ダッシュボード</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin?tab=organizations">組織</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/admin/organizations/${organizationId}/events`}>{organization?.name}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/admin/organizations/${organizationId}/events/${eventId}/categories`}>{event?.name}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <span>{category?.name}</span>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex justify-between items-center">
        <h1 className="text-lg font-bold flex items-center">
          <Image className="mr-1 h-4 w-4" />
          {category?.name}
        </h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="h-6 text-xs">
            <Link href={`/admin/organizations/${organizationId}/events/${eventId}/categories`}>
              <Image className="mr-1 h-3 w-3" />
              カテゴリ一覧へ戻る
            </Link>
          </Button>
        </div>
      </div>
      
      {/* 一括操作ボタンエリア */}
      <div className="flex items-center gap-2 mt-3 mb-2">
        <Button 
          variant={selectMode ? "default" : "outline"} 
          size="sm" 
          className="text-xs h-7"
          onClick={() => {
            setSelectMode(!selectMode);
            if (selectMode) {
              setSelectedAlbums([]);
            }
          }}
        >
          <Check className="mr-1 h-3 w-3" />
          {selectMode ? "選択モード解除" : "一括選択"}
        </Button>
        
        {selectMode && (
          <>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs h-7"
              onClick={toggleSelectAll}
            >
              {selectedAlbums.length === (albums?.length || 0) ? "全選択解除" : "全て選択"}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs h-7"
              onClick={navigateToBulkPricing}
              disabled={selectedAlbums.length === 0}
            >
              <Check className="mr-1 h-3 w-3" />
              一括販売設定 ({selectedAlbums.length})
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs h-7 text-green-500 border-green-200 hover:bg-green-50 hover:text-green-600"
              onClick={bulkPublishAlbums}
              disabled={selectedAlbums.length === 0 || bulkPublishMutation.isPending}
            >
              <Globe className="mr-1 h-3 w-3" />
              一括公開 ({selectedAlbums.length})
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs h-7 text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-600"
              onClick={bulkUnpublishAlbums}
              disabled={selectedAlbums.length === 0 || bulkPublishMutation.isPending}
            >
              <Lock className="mr-1 h-3 w-3" />
              一括非公開 ({selectedAlbums.length})
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs h-7 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
              onClick={bulkDeleteAlbums}
              disabled={selectedAlbums.length === 0 || deleteAlbumMutation.isPending}
            >
              {deleteAlbumMutation.isPending ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="mr-1 h-3 w-3" />
              )}
              一括削除 ({selectedAlbums.length})
            </Button>
          </>
        )}
      </div>

      {/* レイアウトはすでに移行済み */}

      <div>
        {/* タイトルはすでに上部にある */}

        <div className="bg-gray-800 py-1 mb-0">
          <h3 className="text-white text-center text-xs">テスト</h3>
        </div>

        <div className="bg-white p-2 border-t border-x border-gray-300 mb-0">
          <div className="flex flex-wrap gap-2">
            {/* 左エリア：アップロードボックス */}
            <div className="w-[165px] border border-gray-300">
              <div 
                className="w-full aspect-square flex items-center justify-center p-1 bg-white cursor-pointer border-b border-gray-300"
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById("photo-upload")?.click()}
              >
                <div className="text-center">
                  <div className="border border-gray-400 p-2 mb-2 inline-block">
                    <div className="flex items-center justify-center gap-1">
                      <div className="w-6 h-6 border border-gray-500 bg-gray-200"></div>
                      <div className="w-6 h-6 border border-gray-500 bg-gray-300"></div>
                      <div className="w-6 h-6 border border-gray-500 bg-orange-300 flex items-center justify-center text-xl font-bold">+</div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">
                    ファイルをドラッグ＆<br />ドロップしてください。
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1">
                    (同時に複数ファイルを<br />アップロード可能)
                  </p>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                </div>
              </div>
              <div className="bg-gray-200 py-1 text-center">
                <span className="text-xs">アルバム名</span>
              </div>
              <div className="w-full px-2 py-1">
                <Input 
                  value={currentAlbumName}
                  onChange={(e) => setCurrentAlbumName(e.target.value)}
                  placeholder="アルバム名"
                  className="text-xs h-7 text-sm"
                />
              </div>
              <div className="bg-gray-100 py-1 text-center border-t border-gray-300">
                <div className="text-xs flex justify-center items-center">
                  <Image className="h-3 w-3 mr-1" />
                  <span>{uploadQueue.length}枚</span>
                </div>
              </div>
              <div className="px-2 py-1 flex justify-between gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearQueue}
                  disabled={uploadQueue.length === 0 || isUploading}
                  className="text-[10px] h-5 border-gray-400 text-red-500 hover:bg-red-50 flex-1"
                >
                  取り消し
                </Button>
                <Button
                  size="sm"
                  onClick={handleQueueAlbum}
                  disabled={!currentAlbumName || uploadQueue.length === 0 || isUploading}
                  className="text-[10px] h-5 bg-orange-400 hover:bg-orange-500 text-white flex-grow"
                >
                  アップロード登録
                </Button>
              </div>
              <div className="text-[10px] text-orange-500 p-1 pt-0 text-center">
                <span>アルバムタイトル「英」半角「数字」半角で最大80文字以下。全角文字を含む場合は40文字以下（スペースは全角とみなされます）</span>
              </div>
              
              <div className="mt-2 p-2 pt-0 border-t border-gray-300">
                <Button
                  size="sm"
                  onClick={handleUploadAllQueued}
                  disabled={queuedAlbums.length === 0 || isUploading}
                  className="w-full h-6 text-xs bg-green-500 hover:bg-green-600 text-white"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      処理中...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-1 h-3 w-3" />
                      一括アップロード ({queuedAlbums.length})
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* 右エリア：アルバム一覧 */}
            <div className="flex-1">
              <div className="flex flex-col">
                {/* 統合されたアルバム一覧表示 */}
                <div className="flex flex-wrap gap-2">
                  {/* キューに入っているアルバムをすべて表示 */}
                  {queuedAlbums.map((queuedAlbum, index) => {
                    const isCurrentlyUploading = isUploading && currentlyUploadingAlbum && currentlyUploadingAlbum.name === queuedAlbum.name;
                    const existingAlbum = albums?.find(a => a.name === queuedAlbum.name);
                    
                    if (existingAlbum && !isCurrentlyUploading) return null;
                    
                    return (
                      <div 
                        key={`queued-${index}`} 
                        className="w-[165px] border border-gray-300"
                      >
                        <div className="w-full aspect-square flex items-center justify-center p-2 bg-white border-b border-gray-300">
                          {isCurrentlyUploading ? (
                            // アップロード中の表示
                            <div className="text-center">
                              <Loader2 className="h-10 w-10 mx-auto mb-2 text-gray-400 animate-spin" />
                              <p className="text-xs text-gray-600">アップロード中...</p>
                              <p className="text-[10px] text-blue-500 mt-1">
                                {currentlyUploadingAlbum.current} / {currentlyUploadingAlbum.total}枚
                              </p>
                            </div>
                          ) : (
                            // キューイング中の表示
                            <div className="text-center">
                              <div className="h-10 w-10 mx-auto mb-2 text-gray-400 flex items-center justify-center border-2 border-orange-300 rounded-full">
                                <span className="text-lg font-bold text-orange-400">{queuedAlbum.files.length}</span>
                              </div>
                              <p className="text-xs text-gray-600">キューイング中</p>
                            </div>
                          )}
                        </div>
                        <div className="bg-gray-200 py-1 text-center">
                          <span className="text-xs font-medium truncate block">{queuedAlbum.name}</span>
                        </div>
                        <div className="py-1 text-center bg-gray-100">
                          <div className="text-xs flex justify-center items-center">
                            <Image className="h-3 w-3 mr-1" />
                            {isCurrentlyUploading ? (
                              <span>
                                {Math.round((currentlyUploadingAlbum.current / currentlyUploadingAlbum.total) * 100)}% 完了
                              </span>
                            ) : (
                              <span>{queuedAlbum.files.length}枚</span>
                            )}
                          </div>
                        </div>
                        <div className="p-1">
                          <Button
                            size="sm"
                            className={`w-full h-5 text-[10px] ${isCurrentlyUploading ? "bg-blue-400" : "bg-orange-400"} text-white`}
                            disabled
                          >
                            {isCurrentlyUploading ? "アップロード中" : "キューイング中"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* 既存のアルバム */}
                  {albums && albums.map((album) => {
                    // キューにある同名のアルバムがすでに表示されている場合はスキップ
                    const isQueued = queuedAlbums.some(qa => qa.name === album.name);
                    const isUploading = currentlyUploadingAlbum && currentlyUploadingAlbum.name === album.name;
                    
                    // キューイング中/アップロード中のアルバムは別で表示されているのでスキップ
                    if (isQueued || isUploading) return null;
                    
                    return (
                      <div 
                        key={`album-${album.id}-${album.coverImage || 'no-cover'}`} 
                        className="w-[165px] border border-gray-300"
                        onMouseEnter={() => setHoveredAlbumId(album.id)}
                        onMouseLeave={() => setHoveredAlbumId(null)}
                      >
                        <div className="w-full aspect-square relative bg-white border-b border-gray-300">
                          {/* ホバー時に表示される削除ボタン */}
                          {hoveredAlbumId === album.id && !selectMode && (
                            <button
                              className="absolute top-1 right-1 z-20 bg-white bg-opacity-80 rounded-full p-1 hover:bg-red-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`アルバム「${album.name}」を削除してもよろしいですか？`)) {
                                  deleteAlbumMutation.mutate(album.id);
                                }
                              }}
                            >
                              <X className="h-4 w-4 text-red-500" />
                            </button>
                          )}
                          {/* 選択モード時にチェックボックスを表示 */}
                          {selectMode && (
                            <div 
                              className="absolute top-1 left-1 z-10 bg-white bg-opacity-70 rounded-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleAlbumSelection(album.id);
                              }}
                            >
                              <Checkbox 
                                checked={selectedAlbums.includes(album.id)} 
                                className="h-4 w-4 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                              />
                            </div>
                          )}
                          
                          {/* 選択状態を示すオーバーレイ */}
                          {selectMode && selectedAlbums.includes(album.id) && (
                            <div className="absolute inset-0 bg-blue-500 bg-opacity-10 border-2 border-blue-500 z-0"></div>
                          )}
                          
                          {album.coverImage ? (
                            <img 
                              src={album.coverImage} 
                              alt={album.name} 
                              className="w-full h-full object-cover"
                              onClick={() => {
                                if (selectMode) {
                                  toggleAlbumSelection(album.id);
                                }
                              }}
                            />
                          ) : (
                            <div 
                              className="flex items-center justify-center h-full"
                              onClick={() => {
                                if (selectMode) {
                                  toggleAlbumSelection(album.id);
                                }
                              }}
                            >
                              <div className="text-center">
                                <Image className="h-10 w-10 mx-auto mb-1 text-gray-400" />
                                <p className="text-xs text-gray-500">サムネイル作成中</p>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="bg-gray-200 py-1 text-center relative">
                          <span className="text-xs truncate block">{album.name}</span>
                          {album.isPublished ? (
                            <div className="absolute top-0 right-0">
                              <span className="bg-green-500 text-white text-[9px] px-1 py-0.5 rounded-bl-sm flex items-center">
                                <Globe className="w-2 h-2 mr-0.5" />
                                公開中
                              </span>
                            </div>
                          ) : (
                            <div className="absolute top-0 right-0">
                              <span className="bg-gray-500 text-white text-[9px] px-1 py-0.5 rounded-bl-sm flex items-center">
                                <Lock className="w-2 h-2 mr-0.5" />
                                非公開
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="py-1 text-center bg-gray-100">
                          <div className="text-xs flex justify-center items-center">
                            <Image className="h-3 w-3 mr-1" />
                            <span>{album.photoCount || 0}枚</span>
                          </div>
                        </div>
                        <div className="p-1 flex flex-col gap-1">
                          <Button
                            size="sm"
                            className={`w-full h-5 text-[10px] ${album.coverImage ? "bg-orange-400 hover:bg-orange-500" : "bg-orange-400 hover:bg-orange-500"} text-white`}
                            asChild
                          >
                            <Link href={`/admin/organizations/${organizationId}/events/${eventId}/categories/${categoryId}/albums/${album.id}/photos`}>
                              アルバム編集
                            </Link>
                          </Button>
                          
                          <Button
                            size="sm"
                            className="w-full h-5 text-[10px] bg-purple-500 hover:bg-purple-600 text-white"
                            asChild
                          >
                            <Link href={`/admin/organizations/${organizationId}/events/${eventId}/categories/${categoryId}/albums/${album.id}/pricing`}>
                              販売設定
                            </Link>
                          </Button>
                          
                          {(album.photoCount === 0 || album.photoCount === undefined) && (
                            <Button
                              size="sm"
                              className="w-full h-5 text-[10px] bg-red-500 hover:bg-red-600 text-white"
                              onClick={() => {
                                if (confirm(`アルバム「${album.name}」を削除してもよろしいですか？`)) {
                                  deleteAlbumMutation.mutate(album.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              削除
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* アルバムがない場合は何も表示しない */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      

    </div>
  );
}