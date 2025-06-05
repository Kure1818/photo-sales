import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building, Loader2, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { insertOrganizationSchema } from "@shared/schema";
import SimpleImageUploadField from "./SimpleImageUploadField";

// Zodスキーマを拡張して検証ルールを追加
const organizationFormSchema = insertOrganizationSchema.extend({
  name: z.string().min(2, "組織名は2文字以上で入力してください"),
  description: z.string().optional().nullable(),
  bannerImage: z.string().optional().nullable(),
});

type OrganizationFormValues = z.infer<typeof organizationFormSchema>;

interface OrganizationFormProps {
  isOpen: boolean;
  onClose: () => void;
  organization?: {
    id: number;
    name: string;
    description?: string | null;
    bannerImage?: string | null;
  };
  mode?: 'create' | 'edit';
}

export default function OrganizationForm({ isOpen, onClose, organization, mode = 'create' }: OrganizationFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditMode = mode === 'edit' && organization;
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: organization?.name || "",
      description: organization?.description || "",
      bannerImage: organization?.bannerImage || "",
    },
  });

  const createOrganizationMutation = useMutation({
    mutationFn: async (data: OrganizationFormValues) => {
      // セッションクッキーが確実に送信されるよう追加の設定を加える
      const res = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`${res.status}: ${errorText}`);
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "組織を作成しました",
        description: "新しい組織が正常に作成されました",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      form.reset();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "組織の作成に失敗しました",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const updateOrganizationMutation = useMutation({
    mutationFn: async (data: OrganizationFormValues) => {
      if (!organization?.id) {
        throw new Error("組織IDが見つかりません");
      }
      
      const res = await fetch(`/api/admin/organizations/${organization.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`${res.status}: ${errorText}`);
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "組織を更新しました",
        description: "組織情報が正常に更新されました",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "組織の更新に失敗しました",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const deleteOrganizationMutation = useMutation({
    mutationFn: async () => {
      if (!organization?.id) {
        throw new Error("組織IDが見つかりません");
      }
      
      const res = await fetch(`/api/admin/organizations/${organization.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`${res.status}: ${errorText}`);
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "組織を削除しました",
        description: "組織情報が正常に削除されました",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "組織の削除に失敗しました",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: OrganizationFormValues) => {
    if (isEditMode) {
      updateOrganizationMutation.mutate(values);
    } else {
      createOrganizationMutation.mutate(values);
    }
  };

  const handleImageUploaded = (imageUrl: string) => {
    form.setValue("bannerImage", imageUrl);
  };

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              {isEditMode ? '組織情報の編集' : '新規組織の作成'}
            </DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? '組織の詳細情報を編集してください。' 
                : '新しい組織の詳細情報を入力してください。作成後、イベントを追加できます。'
              }
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>組織名 *</FormLabel>
                    <FormControl>
                      <Input placeholder="例: 東京写真クラブ" {...field} />
                    </FormControl>
                    <FormDescription>
                      組織の正式名称を入力してください。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>説明文</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="組織についての簡単な説明を入力してください"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bannerImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>バナー画像</FormLabel>
                    <FormControl>
                      <SimpleImageUploadField
                        value={field.value}
                        onChange={(url) => {
                          field.onChange(url);
                          if (url) handleImageUploaded(url);
                        }}
                        uploadEndpoint="/api/admin/upload/banner"
                        maxSize={10}
                      />
                    </FormControl>
                    <FormDescription>
                      バナー画像をドラッグ＆ドロップでアップロードするか、URLを直接入力してください。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2 sm:gap-0">
                {isEditMode && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="mr-auto"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    削除
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={createOrganizationMutation.isPending || updateOrganizationMutation.isPending}
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  disabled={createOrganizationMutation.isPending || updateOrganizationMutation.isPending}
                >
                  {createOrganizationMutation.isPending || updateOrganizationMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Building className="mr-2 h-4 w-4" />
                  )}
                  {isEditMode ? '組織を更新' : '組織を作成'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {isEditMode && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>組織を削除しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                この操作は取り消せません。組織を削除すると、関連するすべてのイベント、カテゴリ、アルバム、写真も削除されます。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteOrganizationMutation.mutate()}
                className="bg-destructive hover:bg-destructive/90"
              >
                {deleteOrganizationMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                削除する
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}