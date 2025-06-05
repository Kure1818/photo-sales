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
import { useMutation, useQuery } from "@tanstack/react-query";
import { Organization, Event, insertEventSchema } from "@shared/schema";
import { 
  Building, 
  Calendar, 
  ChevronLeft,
  Loader2,
  Trash2
} from "lucide-react";
import { Link, useParams, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import SimpleImageUploadField from "@/components/admin/SimpleImageUploadField";

// フォームのスキーマ
const eventFormSchema = z.object({
  name: z.string().min(1, "イベント名は必須です"),
  startDate: z.string().optional(), // UIで使用
  endDate: z.string().optional(),   // UIで使用
  description: z.string().optional(),
  location: z.string().optional(),
  bannerImage: z.string().optional(),
  salesStartDate: z.string().optional(), // 販売開始日
  salesStartTime: z.string().optional(), // 販売開始時刻
  salesEndDate: z.string().optional(),   // 販売終了日
  salesEndTime: z.string().optional(),   // 販売終了時刻
  // organizationIdはURLパラメータから自動的に設定するので、フォームには含めない
});

type EventFormValues = z.infer<typeof eventFormSchema>;

// コンポーネント外で定義して再レンダリング時に参照が変わらないようにする
const emptyFormValues = {
  name: "",
  startDate: "",
  endDate: "",
  description: "",
  location: "",
  bannerImage: "",
  salesStartDate: "",
  salesStartTime: "00:00",
  salesEndDate: "",
  salesEndTime: "23:59",
};

export default function EventCreatePage() {
  const { organizationId, eventId } = useParams();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // 管理者ではない場合はリダイレクト
  useEffect(() => {
    if (!user?.isAdmin) {
      setLocation("/auth");
    }
  }, [user, setLocation]);

  // 編集モードかどうかを判定
  useEffect(() => {
    // URLに eventId が含まれているかどうかで編集モードを判定
    // 'new'という文字列の場合は編集モードではない
    if (eventId && eventId !== 'new') {
      setIsEditMode(true);
    } else {
      setIsEditMode(false);
    }
  }, [eventId]);

  // 組織情報を取得
  const {
    data: organization,
    isLoading: isLoadingOrg,
    error: orgError,
  } = useQuery<Organization>({
    queryKey: [`/api/organizations/${organizationId}`],
    enabled: !!organizationId,
  });
  
  // 編集モードの場合、イベント情報を取得
  const {
    data: eventData,
    isLoading: isLoadingEvent,
    error: eventError,
    refetch: refetchEvent
  } = useQuery<Event>({
    queryKey: [`/api/events/${eventId}`],
    enabled: !!eventId && isEditMode,
    staleTime: 0, // キャッシュを無効化
    refetchOnMount: 'always', // 常に再取得
    refetchOnWindowFocus: true // ウィンドウフォーカス時に再取得
  });
  
  // フォームの初期化
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: emptyFormValues,
    mode: "onChange", // 入力時にバリデーション実行
  });
  
  // 新規作成モードの場合はフォームを初期化
  useEffect(() => {
    if (!isEditMode) {
      form.reset(emptyFormValues);
    }
  }, [form, isEditMode]);

  // 日付と時刻を分離する関数
  const extractDateAndTime = (dateTimeString: string | null | undefined): { date: string, time: string } => {
    if (!dateTimeString) return { date: "", time: "" };
    
    try {
      // ISO形式（YYYY-MM-DDThh:mm:ss）からの分離
      if (dateTimeString.includes('T')) {
        const [datePart, timePart] = dateTimeString.split('T');
        // 時刻部分から秒を除外
        const timeWithoutSeconds = timePart?.split(':')?.[0] + ':' + timePart?.split(':')?.[1];
        return { date: datePart || "", time: timeWithoutSeconds || "00:00" };
      }
      
      // ISO形式でない場合は日付部分だけを返す
      return { date: dateTimeString, time: "00:00" };
    } catch (e) {
      console.error("日時解析エラー:", e);
      return { date: "", time: "00:00" };
    }
  };

  // 編集モードでイベントデータが取得できたら、フォームの値を設定
  useEffect(() => {
    if (isEditMode && eventData) {
      // データベースの「date」フィールドを、UIの「startDate」と「endDate」に分解
      let startDate = "";
      let endDate = "";
      
      if (eventData.date) {
        // dateフィールドが "YYYY-MM-DD to YYYY-MM-DD" の形式であれば分割
        const dateParts = eventData.date.split(" to ");
        startDate = dateParts[0] || "";
        endDate = dateParts[1] || "";
      }
      
      // 販売開始日時を分離
      const { date: salesStartDate, time: salesStartTime } = extractDateAndTime(eventData.salesStartDate);
      
      // 販売終了日時を分離
      const { date: salesEndDate, time: salesEndTime } = extractDateAndTime(eventData.salesEndDate);
      
      form.reset({
        name: eventData.name || "",
        startDate: startDate,
        endDate: endDate,
        description: eventData.description || "",
        location: eventData.location || "",
        bannerImage: eventData.bannerImage || "",
        salesStartDate: salesStartDate,
        salesStartTime: salesStartTime || "00:00",
        salesEndDate: salesEndDate,
        salesEndTime: salesEndTime || "23:59",
      });
    }
  }, [form, eventData, isEditMode]);

  // イベント作成のミューテーション
  const createEventMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/admin/events", data);
      return response.json();
    },
    onSuccess: (data) => {
      // イベント一覧のクエリを完全に無効化して強制的に再取得させる
      queryClient.invalidateQueries({ 
        queryKey: [`/api/organizations/${organizationId}/events`],
        refetchType: 'all'
      });
      
      // 最新のデータをすぐに利用できるようにキャッシュに追加
      const existingData = queryClient.getQueryData<Event[]>([`/api/organizations/${organizationId}/events`]) || [];
      queryClient.setQueryData([`/api/organizations/${organizationId}/events`], [...existingData, data]);
      
      // 成功メッセージ
      toast({
        title: "イベントを作成しました",
        description: "新しいイベントが正常に作成されました",
      });
      
      // 少し遅延させてからリダイレクト（クエリキャッシュの更新を確実にするため）
      setTimeout(() => {
        setLocation(`/admin/organizations/${organizationId}/events`);
      }, 100);
    },
    onError: (error) => {
      console.error("イベント作成エラー:", error);
      toast({
        title: "エラーが発生しました",
        description: "イベントの作成中にエラーが発生しました。もう一度お試しください。",
        variant: "destructive",
      });
    },
  });
  
  // イベント更新のミューテーション
  const updateEventMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PATCH", `/api/admin/events/${eventId}`, data);
      return response.json();
    },
    onSuccess: (data) => {
      
      // イベント一覧のクエリを無効化して再取得させる
      queryClient.invalidateQueries({ 
        queryKey: [`/api/organizations/${organizationId}/events`],
        refetchType: 'all'
      });
      
      // イベント詳細のクエリを明示的に無効化して強制的に再取得
      queryClient.invalidateQueries({ 
        queryKey: [`/api/events/${eventId}`],
        refetchType: 'all'
      });
      
      // キャッシュにも直接保存して即時反映
      queryClient.setQueryData([`/api/events/${eventId}`], data);
      
      // 遅延させてから再取得を実行
      setTimeout(() => {
        refetchEvent();
      }, 100);
      
      // 成功メッセージ
      toast({
        title: "イベントを更新しました",
        description: "イベント情報が正常に更新されました",
      });
      
      // イベント一覧ページにリダイレクト
      setTimeout(() => {
        setLocation(`/admin/organizations/${organizationId}/events`);
      }, 300);
    },
    onError: (error) => {
      console.error("イベント更新エラー:", error);
      toast({
        title: "エラーが発生しました",
        description: "イベントの更新中にエラーが発生しました。もう一度お試しください。",
        variant: "destructive",
      });
    },
  });
  
  // イベント削除用のMutation
  const deleteEventMutation = useMutation({
    mutationFn: async () => {
      try {
        const response = await apiRequest("DELETE", `/api/admin/events/${eventId}`);
        // レスポンスにJSONがない場合も正常に処理
        if (response.headers.get("content-type")?.includes("application/json")) {
          return await response.json();
        }
        return { success: true }; // JSONがない場合は成功とみなす
      } catch (error) {
        console.error("削除リクエストエラー:", error);
        throw error;
      }
    },
    onSuccess: () => {
      // フォームのリセット
      form.reset({
        name: '',
        startDate: '',
        endDate: '',
        description: '',
        location: '',
        bannerImage: '',
        salesStartDate: '',
        salesEndDate: ''
      });
      
      // イベント一覧のクエリを無効化して再取得
      queryClient.invalidateQueries({ 
        queryKey: [`/api/organizations/${organizationId}/events`],
        refetchType: 'all'
      });
      
      // 成功メッセージ
      toast({
        title: "イベントを削除しました",
        description: "イベントが正常に削除されました",
      });
      
      // イベント一覧ページへリダイレクト
      setLocation(`/admin/organizations/${organizationId}/events`);
    },
    onError: (error) => {
      console.error("イベント削除エラー:", error);
      toast({
        title: "エラーが発生しました",
        description: "イベントの削除中にエラーが発生しました。もう一度お試しください。",
        variant: "destructive",
      });
    },
  });

  // フォーム送信
  const onSubmit = async (values: EventFormValues) => {
    try {
      setIsSubmitting(true);
  
      // 送信データの作成 - startDateとendDateをdateフィールドに変換
      let dateValue = "";
      if (values.startDate) {
        dateValue = values.startDate;
        if (values.endDate) {
          dateValue += " to " + values.endDate;
        }
      }
      
      // 販売開始日と時刻を統合
      let salesStartDateWithTime = values.salesStartDate || "";
      if (salesStartDateWithTime && values.salesStartTime) {
        salesStartDateWithTime = `${values.salesStartDate}T${values.salesStartTime}:00`;
      }
      
      // 販売終了日と時刻を統合
      let salesEndDateWithTime = values.salesEndDate || "";
      if (salesEndDateWithTime && values.salesEndTime) {
        salesEndDateWithTime = `${values.salesEndDate}T${values.salesEndTime}:00`;
      }
      
      const payload = {
        ...values,
        date: dateValue,
        organizationId: Number(organizationId),
        // 統合された日時を設定
        salesStartDate: salesStartDateWithTime,
        salesEndDate: salesEndDateWithTime,
      };
      
      // UIのみのフィールドを削除 (日付関連のUIフィールド)
      delete payload.startDate; 
      delete payload.endDate;
      delete payload.salesStartTime;
      delete payload.salesEndTime;
  
      
      if (isEditMode && eventId) {
        // 編集モードの場合は更新API
        await updateEventMutation.mutateAsync(payload);
      } else {
        // 新規作成モードの場合は作成API
        await createEventMutation.mutateAsync(payload);
      }
    } catch (error) {
      console.error("送信エラー:", error);
      toast({
        title: "エラーが発生しました",
        description: isEditMode 
          ? "イベントの更新中にエラーが発生しました。もう一度お試しください。"
          : "イベントの作成中にエラーが発生しました。もう一度お試しください。",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ローディング中
  if (isLoadingOrg || (isEditMode && isLoadingEvent)) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // エラー発生時
  if (orgError) {
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
            <BreadcrumbLink href="/admin">組織</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/admin/organizations/${organizationId}/events`}>{organization?.name}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <span>新規イベント作成</span>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center">
          <Calendar className="mr-2 h-6 w-6" />
          {isEditMode ? "イベント編集" : "新規イベント作成"}
        </h1>
        <Button
          variant="outline"
          onClick={() => setLocation(`/admin/organizations/${organizationId}/events`)}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          戻る
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>イベント情報</CardTitle>
          <CardDescription>
            新しいイベントの詳細情報を入力してください。
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
                    <FormLabel>イベント名 *</FormLabel>
                    <FormControl>
                      <Input placeholder="例: テックカンファレンス2023" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>開始日</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>終了日</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">販売開始設定</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="salesStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>販売開始日</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormDescription>
                          写真の販売を開始する日付
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="salesStartTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>開始時刻</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormDescription>
                          販売開始時刻（24時間表記）
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <h3 className="text-lg font-medium">販売終了設定</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="salesEndDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>販売終了日</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormDescription>
                          写真の販売を終了する日付
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="salesEndTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>終了時刻</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormDescription>
                          販売終了時刻（24時間表記）
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>開催場所</FormLabel>
                    <FormControl>
                      <Input placeholder="例: 東京コンベンションセンター" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>イベント説明</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="イベントの詳細説明を入力してください"
                        className="resize-none h-32"
                        {...field}
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
                        onChange={field.onChange}
                        uploadEndpoint="/api/admin/upload/banner"
                        maxSize={20}
                      />
                    </FormControl>
                    <FormDescription>
                      イベントのバナー画像をアップロードしてください (最大20MB)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-4 pt-4">
                {isEditMode && (
                  <Button
                    type="button"
                    variant="outline"
                    className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                    onClick={() => {
                      if (confirm("このイベントを削除してもよろしいですか？関連するカテゴリやアルバムも全て削除されます。")) {
                        deleteEventMutation.mutate();
                      }
                    }}
                    disabled={deleteEventMutation.isPending || isSubmitting}
                  >
                    {deleteEventMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    削除
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation(`/admin/organizations/${organizationId}/events`)}
                  disabled={isSubmitting || deleteEventMutation.isPending}
                >
                  キャンセル
                </Button>
                <Button type="submit" disabled={isSubmitting || deleteEventMutation.isPending}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEditMode ? "更新中..." : "作成中..."}
                    </>
                  ) : (
                    isEditMode ? "イベントを更新" : "イベントを作成"
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