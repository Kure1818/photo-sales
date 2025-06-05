import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Category } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";

// カテゴリ編集フォームのスキーマ
const categoryEditSchema = z.object({
  name: z.string().min(1, "カテゴリ名は必須です"),
  description: z.string().optional(),
  coverImage: z.string().optional(),
});

type CategoryEditValues = z.infer<typeof categoryEditSchema>;

export default function CategoryEditPage() {
  const { organizationId, eventId, categoryId } = useParams();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 管理者ではない場合はリダイレクト
  useEffect(() => {
    if (!user?.isAdmin) {
      setLocation("/auth");
    }
  }, [user, setLocation]);

  // 組織情報を取得
  const {
    data: organization,
    isLoading: isLoadingOrg,
  } = useQuery({
    queryKey: [`/api/organizations/${organizationId}`],
    enabled: !!organizationId,
  });

  // イベント情報を取得
  const {
    data: event,
    isLoading: isLoadingEvent,
  } = useQuery({
    queryKey: [`/api/events/${eventId}`],
    enabled: !!eventId,
  });

  // カテゴリ情報を取得
  const {
    data: category,
    isLoading: isLoadingCategory,
    error: categoryError,
  } = useQuery<Category>({
    queryKey: [`/api/categories/${categoryId}`],
    enabled: !!categoryId,
  });

  // フォームの設定
  const form = useForm<CategoryEditValues>({
    resolver: zodResolver(categoryEditSchema),
    defaultValues: {
      name: "",
      description: "",
      coverImage: "",
    },
    // カテゴリデータが取得できたらフォームの初期値を設定
    values: category ? {
      name: category.name,
      description: category.description || "",
      coverImage: category.coverImage || "",
    } : undefined,
  });

  // カテゴリ更新のミューテーション
  const updateCategoryMutation = useMutation({
    mutationFn: async (data: CategoryEditValues) => {
      const response = await apiRequest('PATCH', `/api/admin/categories/${categoryId}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "カテゴリを更新しました",
        description: "カテゴリ情報が正常に更新されました。",
      });
      
      // カテゴリ情報を再取得
      queryClient.invalidateQueries({ queryKey: [`/api/categories/${categoryId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/categories`] });
      
      // カテゴリ一覧ページへリダイレクト
      setLocation(`/admin/organizations/${organizationId}/events/${eventId}/categories`);
    },
    onError: (error) => {
      toast({
        title: "エラーが発生しました",
        description: error instanceof Error ? error.message : "カテゴリの更新に失敗しました。",
        variant: "destructive",
      });
    },
  });

  // フォーム送信ハンドラー
  const onSubmit = async (values: CategoryEditValues) => {
    try {
      setIsSubmitting(true);
      await updateCategoryMutation.mutateAsync(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isLoadingOrg || isLoadingEvent || isLoadingCategory;

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (categoryError || !category) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center py-12">
          <p className="text-destructive mb-4">カテゴリが見つかりませんでした</p>
          <Button
            onClick={() => window.history.back()}
            variant="outline"
          >
            戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">管理者ダッシュボード</BreadcrumbLink>
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
            <span>{category.name}を編集</span>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">カテゴリを編集</h1>
        <Button variant="outline" asChild>
          <a href={`/admin/organizations/${organizationId}/events/${eventId}/categories`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            カテゴリ一覧へ戻る
          </a>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>カテゴリ情報</CardTitle>
          <CardDescription>
            カテゴリの基本情報を編集します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>カテゴリ名 *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="例：運動会の写真" />
                    </FormControl>
                    <FormDescription>
                      カテゴリの名前を入力してください
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
                    <FormLabel>説明</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ""}
                        placeholder="例：運動会の様子を収めた写真集です" 
                      />
                    </FormControl>
                    <FormDescription>
                      カテゴリの説明を入力してください（オプション）
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <ImageUploadField
                form={form}
                name="coverImage"
                label="カバー画像"
                description="カテゴリのカバー画像をアップロードしてください（オプション）"
                placeholder="例：https://example.com/images/cover.jpg"
                endpoint="/api/admin/upload/banner"
              />

              <div className="flex justify-end pt-4">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      更新中...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      変更を保存
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}