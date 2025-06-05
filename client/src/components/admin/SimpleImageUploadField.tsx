import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Image as ImageIcon, X } from "lucide-react";
import { ChangeEvent, useState, DragEvent, useRef } from "react";

interface SimpleImageUploadFieldProps {
  value: string | undefined;
  onChange: (value: string) => void;
  uploadEndpoint: string;
  maxSize?: number; // MB単位、デフォルトは5MB
}

export default function SimpleImageUploadField({
  value,
  onChange,
  uploadEndpoint,
  maxSize = 5,
}: SimpleImageUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // プレビュー用の最終的なURL
  const finalPreviewUrl = previewUrl || value;

  // ファイル処理のメインロジック
  const processFile = async (file: File) => {
    if (!file) return;

    // ファイルサイズの確認
    if (file.size > maxSize * 1024 * 1024) {
      toast({
        title: "エラー",
        description: `ファイルサイズは${maxSize}MB以下にしてください`,
        variant: "destructive",
      });
      return;
    }

    // 画像ファイルかどうか確認
    if (!file.type.startsWith("image/")) {
      toast({
        title: "エラー",
        description: "画像ファイルのみアップロードできます",
        variant: "destructive",
      });
      return;
    }

    // フォームデータの作成
    const formData = new FormData();
    formData.append("image", file);

    setIsUploading(true);

    try {
      // 一時的なプレビューURLを設定
      const tempUrl = URL.createObjectURL(file);
      setPreviewUrl(tempUrl);

      // アップロード処理
      const response = await fetch(`${uploadEndpoint}`, {
        method: "POST",
        body: formData,
        // Content-Typeはブラウザが自動で設定するので指定しない
      });

      if (!response.ok) {
        throw new Error("アップロードに失敗しました");
      }

      const result = await response.json();
      const uploadedUrl = result.imageUrl || result.url;

      // 親コンポーネントに値を渡す
      onChange(uploadedUrl);

      toast({
        title: "アップロード完了",
        description: "画像が正常にアップロードされました",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "アップロードエラー",
        description: error instanceof Error ? error.message : "不明なエラーが発生しました",
        variant: "destructive",
      });
      // エラーが発生した場合、プレビューを削除
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  // 従来のアップロードハンドラー（ファイル選択から）
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    processFile(file);
  };
  
  // ドラッグイベントハンドラー
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  };
  
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    
    // 最初のファイルのみ処理
    processFile(files[0]);
  };

  const handleClearImage = () => {
    onChange("");
    setPreviewUrl(null);
  };
  
  // ファイル選択ダイアログを開く
  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      {finalPreviewUrl && (
        <div className="relative w-full max-w-md h-32 rounded-md overflow-hidden border">
          <img
            src={finalPreviewUrl}
            alt="アップロード画像"
            className="w-full h-full object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7 rounded-full"
            onClick={handleClearImage}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div 
        ref={dropZoneRef}
        className={`border-2 border-dashed rounded-md p-4 transition-colors ${
          isDragging 
            ? 'border-primary bg-primary/10' 
            : 'border-border hover:border-primary/50'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center space-y-2 text-center py-4">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isUploading ? "アップロード中..." : "ここに画像をドラッグ＆ドロップ"}
            </p>
            <p className="text-xs text-muted-foreground">
              または
            </p>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={openFileDialog}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  アップロード中...
                </>
              ) : (
                "ファイルを選択"
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            最大ファイルサイズ: {maxSize}MB
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="または画像URLを入力してください"
          className="flex-1"
        />
      </div>
    </div>
  );
}