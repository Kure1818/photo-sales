import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Image as ImageIcon, X } from "lucide-react";
import { ChangeEvent, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";

interface ImageUploadFieldProps {
  form: UseFormReturn<any>;
  name: string;
  label: string;
  description: string;
  placeholder?: string;
  endpoint: string;
  onSuccess?: (url: string) => void;
}

export default function ImageUploadField({
  form,
  name,
  label,
  description,
  placeholder = "",
  endpoint,
  onSuccess,
}: ImageUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // フォームからの現在の値を取得
  const currentValue = form.watch(name);

  // プレビュー用の最終的なURL
  const finalPreviewUrl = previewUrl || currentValue;

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルサイズの確認 (5MBまで)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "エラー",
        description: "ファイルサイズは5MB以下にしてください",
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
      const response = await fetch(`${endpoint}`, {
        method: "POST",
        body: formData,
        // Content-Typeはブラウザが自動で設定するので指定しない
      });

      if (!response.ok) {
        throw new Error("アップロードに失敗しました");
      }

      const result = await response.json();
      const uploadedUrl = result.imageUrl || result.url;

      // フォームの値を更新
      form.setValue(name, uploadedUrl, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });

      // 成功時のコールバック
      if (onSuccess) {
        onSuccess(uploadedUrl);
      }

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

  const handleClearImage = () => {
    form.setValue(name, "", {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
    setPreviewUrl(null);
  };

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <div className="space-y-3">
            {finalPreviewUrl && (
              <div className="relative w-full max-w-md h-32 rounded-md overflow-hidden border">
                <img
                  src={finalPreviewUrl}
                  alt={label}
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

            <div className="flex items-center space-x-2">
              <FormControl>
                <Input
                  placeholder={placeholder}
                  {...field}
                  value={field.value || ""}
                  className="flex-1"
                />
              </FormControl>

              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="relative overflow-hidden"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <span className="sr-only">アップロード</span>
                  <Input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleUpload}
                    disabled={isUploading}
                  />
                </Button>
              </div>
            </div>
          </div>
          <FormDescription>{description}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}