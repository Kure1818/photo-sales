import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface UploadDropzoneProps {
  albumId: number;
  onSuccess?: () => void;
}

interface UploadingFile {
  id: string;
  file: File;
  preview: string;
  progress: number;
  uploading: boolean;
  error?: string;
}

export default function UploadDropzone({ albumId, onSuccess = () => {} }: UploadDropzoneProps) {
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(2, 11),
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
      uploading: false
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxSize: 500 * 1024 * 1024 // 500MB
  });

  const removeFile = (id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const uploadFile = async (fileInfo: UploadingFile) => {
    // Don't upload if already uploading or has error
    if (fileInfo.uploading || fileInfo.error) return;

    setFiles(prev => 
      prev.map(f => f.id === fileInfo.id ? { ...f, uploading: true, progress: 0 } : f)
    );

    try {
      const formData = new FormData();
      formData.append('photo', fileInfo.file);
      
      // Mock progress updates
      const progressInterval = setInterval(() => {
        setFiles(prev => {
          const fileToUpdate = prev.find(f => f.id === fileInfo.id);
          if (fileToUpdate && fileToUpdate.progress < 90) {
            return prev.map(f => 
              f.id === fileInfo.id ? { ...f, progress: Math.min(f.progress + 10, 90) } : f
            );
          }
          return prev;
        });
      }, 300);
      
      // Upload the file
      await apiRequest('POST', `/api/albums/${albumId}/photos/upload`, formData);
      
      clearInterval(progressInterval);
      
      // Update to complete
      setFiles(prev => 
        prev.map(f => f.id === fileInfo.id ? { ...f, progress: 100 } : f)
      );
      
      // Remove the file from list after a delay
      setTimeout(() => {
        removeFile(fileInfo.id);
        toast({
          title: "アップロード完了",
          description: `${fileInfo.file.name} がアップロードされました。`,
        });
      }, 1000);
      
    } catch (error) {
      setFiles(prev => 
        prev.map(f => f.id === fileInfo.id ? 
          { ...f, uploading: false, error: "アップロードに失敗しました" } : f
        )
      );
      
      toast({
        title: "エラー",
        description: "ファイルのアップロードに失敗しました。",
        variant: "destructive"
      });
    }
  };

  const uploadAll = async () => {
    // Upload all files that aren't already uploading or completed
    const filesToUpload = files.filter(f => !f.uploading && f.progress === 0);
    for (const file of filesToUpload) {
      await uploadFile(file);
    }
    
    if (filesToUpload.length > 0) {
      onSuccess();
    }
  };

  return (
    <div className="space-y-6">
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive 
            ? "border-accent bg-accent/10" 
            : "border-gray-300 hover:border-accent hover:bg-accent/5"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          写真をドラッグ＆ドロップするか、
          <span className="text-accent font-medium"> ファイルを選択 </span>
          してください
        </p>
        <p className="mt-1 text-xs text-gray-500">
          最大ファイルサイズ: 500MB / ファイル
        </p>
      </div>

      {files.length > 0 && (
        <>
          <div className="space-y-3">
            <h3 className="text-lg font-medium">アップロードキュー</h3>
            <div className="space-y-3">
              {files.map((file) => (
                <div key={file.id} className="bg-gray-100 p-3 rounded-lg flex items-center">
                  <div className="h-16 w-16 bg-gray-300 rounded mr-3 flex-shrink-0">
                    <img 
                      src={file.preview} 
                      alt="プレビュー" 
                      className="h-full w-full object-cover rounded"
                      onLoad={() => URL.revokeObjectURL(file.preview)}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className="font-medium">{file.file.name}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => removeFile(file.id)}
                        disabled={file.uploading && file.progress < 100}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-1 relative pt-1">
                      <Progress value={file.progress} className="h-2" />
                      <div className="flex justify-between mt-1">
                        <p className="text-xs text-gray-500">
                          {(file.file.size / (1024 * 1024)).toFixed(2)}MB
                        </p>
                        <p className="text-xs text-gray-500">
                          {file.progress}%
                        </p>
                      </div>
                    </div>
                    {file.error && (
                      <p className="text-xs text-red-500 mt-1">{file.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="secondary"
              className="mr-2"
              onClick={() => setFiles([])}
            >
              クリア
            </Button>
            <Button
              className="bg-accent hover:bg-green-600 text-white"
              onClick={uploadAll}
              disabled={files.every(f => f.uploading || f.progress === 100)}
            >
              アップロードを開始
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
