import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Organization, Event, Category, insertCategorySchema } from "@shared/schema";
import { 
  Building, 
  Calendar, 
  FolderPlus,
  Folders,
  ImagePlus,
  Loader2, 
  Plus, 
  ShoppingBag
} from "lucide-react";
import { Link, useParams, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ImageUploadField from "@/components/admin/ImageUploadField";

// カテゴリ作成フォームのスキーマ
const categoryFormSchema = z.object({
  name: z.string().min(1, "カテゴリ名は必須です"),
  description: z.string().optional(),
  coverImage: z.string().optional(),
  // eventIdはURLパラメータから自動的に設定するので、フォームには含めない
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export default function EventCategoriesPage() {
  const { organizationId, eventId } = useParams();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
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
    error: orgError,
  } = useQuery<Organization>({
    queryKey: [`/api/organizations/${organizationId}`],
    enabled: !!organizationId,
  });

  // イベント情報を取得
  const {
    data: event,
    isLoading: isLoadingEvent,
    error: eventError,
  } = useQuery<Event>({
    queryKey: [`/api/events/${eventId}`],
    enabled: !!eventId,
  });

  // カテゴリ一覧を取得
  const {
    data: categories,
    isLoading: isLoadingCategories,
    error: categoriesError,
    refetch: refetchCategories
  } = useQuery<Category[]>({
    queryKey: [`/api/events/${eventId}/categories`],
    enabled: !!eventId,
  });

  // カテゴリ作成の状態管理
  const [isSubmitting, setIsSubmitting] = useState(false);

  // カテゴリ作成フォーム
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      description: "",
      coverImage: "",
    },
  });

  // 直接ボタンクリックからフォーム送信するための関数
  const handleSubmitDirectly = async () => {
    try {
      // フォームバリデーションを手動で実行
      const validationResult = await form.trigger();
      if (!validationResult) {
        console.error("バリデーションエラー:", form.formState.errors);
        // エラーがあった場合、通知を表示
        toast({
          title: "入力エラー",
          description: "入力内容を確認してください",
          variant: "destructive",
        });
        return;
      }
      
      // フォームの値を取得
      const values = form.getValues();
      
      setIsSubmitting(true);
      
      // 送信データの作成（eventIdを必ず含める）
      const payload = {
        name: values.name,
        eventId: Number(eventId), // URLパラメータから取得したイベントID
        description: values.description || "",
        coverImage: values.coverImage || ""
      };
      
      
      // 直接fetchを使用（デバッグ用）
      const response = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
      
      
      // エラー処理
      if (!response.ok) {
        const errorText = await response.text();
        console.error("APIエラー:", response.status, errorText);
        throw new Error(`カテゴリ作成に失敗しました: ${errorText || response.statusText}`);
      }
      
      // 成功レスポンスの処理
      const result = await response.json();
      
      // 成功時の処理
      toast({
        title: "カテゴリを作成しました",
        description: "新しいカテゴリが正常に作成されました。",
      });
      
      // フォームをリセットしてダイアログを閉じる
      form.reset();
      setIsDialogOpen(false);
      
      // キャッシュを無効化して強制的に再フェッチする
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/categories`] });
      
      // 重要: カテゴリリストを即座に更新するために直接refetchを実行
      await refetchCategories();
      
    } catch (error) {
      console.error("カテゴリ作成エラー:", error);
      toast({
        title: "エラーが発生しました",
        description: error instanceof Error ? error.message : "カテゴリの作成に失敗しました。",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // フォームのonSubmitハンドラー（念のため残しておく）
  const onSubmit = async (values: CategoryFormValues) => {
    try {
      setIsSubmitting(true);
  
      // 送信データの作成
      const payload = {
        name: values.name,
        eventId: Number(eventId),
        description: values.description || "",
        coverImage: values.coverImage || ""
      };
  
      
      // apiRequestを使用して送信（適切な認証が行われる）
      const response = await apiRequest("POST", "/api/admin/categories", payload);
      
      // 成功レスポンスの処理
      const result = await response.json();
      
      // 成功時の処理
      toast({
        title: "カテゴリを作成しました",
        description: "新しいカテゴリが正常に作成されました。",
      });
      
      // フォームをリセットしてダイアログを閉じる
      form.reset();
      setIsDialogOpen(false);
      
      // キャッシュを無効化して強制的に再フェッチする
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/categories`] });
      
      // カテゴリリストを即座に更新する
      await refetchCategories();
      
    } catch (error) {
      console.error("カテゴリ作成エラー:", error);
      toast({
        title: "エラーが発生しました",
        description: error instanceof Error ? error.message : "カテゴリの作成に失敗しました。",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isLoadingOrg || isLoadingEvent || isLoadingCategories;
  const error = orgError || eventError || categoriesError;

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center py-12">
          <p className="text-destructive mb-4">データの読み込みに失敗しました</p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
          >
            再読み込み
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
            <span>{event?.name} - 販売管理</span>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center">
          <Folders className="mr-2 h-6 w-6" />
          販売管理 - {event?.name}
        </h1>
        <div className="flex space-x-2">
          <Button asChild variant="outline">
            <Link href={`/admin/organizations/${organizationId}/events`} onClick={(e) => {
              // URL実行前に特殊なパラメータを付与して強制的にリフレッシュをさせる
              e.preventDefault();
              window.location.href = `/admin/organizations/${organizationId}/events?refresh=${Date.now()}`;
            }}>
              <Calendar className="mr-2 h-4 w-4" />
              イベント一覧へ戻る
            </Link>
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <FolderPlus className="mr-2 h-4 w-4" />
                新規カテゴリ作成
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新規カテゴリの作成</DialogTitle>
                <DialogDescription>
                  イベント「{event?.name}」に新しいカテゴリを作成します。
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault(); // フォームのデフォルト送信を防止
                    // Enterキーによる送信時は直接処理を実行
                    handleSubmitDirectly();
                  }} 
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>カテゴリ名 *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="例：運動会の写真" 
                            {...field} 
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSubmitDirectly();
                              }
                            }}
                          />
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
                            placeholder="例：運動会の様子を収めた写真集です" 
                            {...field} 
                            value={field.value || ""}
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
                  
                  <DialogFooter>
                    <Button 
                      type="button" 
                      disabled={isSubmitting}
                      onClick={(e) => {
                        e.preventDefault();
                        
                        // 直接送信処理を呼び出す
                        handleSubmitDirectly();
                      }}
                    >
                      {isSubmitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      カテゴリを作成
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {categories && categories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((category) => (
            <CategoryCard 
              key={category.id} 
              category={category} 
              organizationId={Number(organizationId)}
              eventId={Number(eventId)}
            />
          ))}
        </div>
      ) : (
        <div className="border rounded-md p-8 text-center">
          <Folders className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">カテゴリがありません</h3>
          <p className="text-gray-500 mb-4">
            このイベントにはまだカテゴリがありません。新しいカテゴリを作成しましょう。
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <FolderPlus className="mr-2 h-4 w-4" />
            カテゴリを作成
          </Button>
        </div>
      )}
    </div>
  );
}

function CategoryCard({ 
  category, 
  organizationId,
  eventId
}: { 
  category: Category; 
  organizationId: number;
  eventId: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-start">
          <span className="flex items-center">
            <Folders className="h-5 w-5 mr-2 flex-shrink-0" />
            {category.name}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <a href={`/admin/organizations/${organizationId}/events/${eventId}/categories/${category.id}/edit`} className="flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
            </a>
          </Button>
        </CardTitle>
        {category.description && (
          <CardDescription>
            {category.description}
          </CardDescription>
        )}
      </CardHeader>
      {category.coverImage && (
        <CardContent className="pb-2">
          <div className="h-32 rounded-md overflow-hidden">
            <img
              src={category.coverImage}
              alt={category.name}
              className="w-full h-full object-cover"
            />
          </div>
        </CardContent>
      )}
      <CardFooter className="gap-2 flex-wrap">
        <Button variant="outline" size="sm">
          <a href={`/admin/organizations/${organizationId}/events/${eventId}/categories/${category.id}/albums`} className="flex items-center">
            <ShoppingBag className="mr-2 h-4 w-4" />
            アルバム管理
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}