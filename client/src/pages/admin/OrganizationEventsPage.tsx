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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Organization, Event } from "@shared/schema";
import { Building, Calendar, DollarSign, Loader2, Plus } from "lucide-react";
import { Link, useParams, useLocation } from "wouter";
import { useEffect } from "react";

export default function OrganizationEventsPage() {
  const { organizationId } = useParams();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
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

  // 組織に所属するイベント一覧を取得
  const {
    data: events,
    isLoading: isLoadingEvents,
    error: eventsError,
    refetch: refetchEvents
  } = useQuery<Event[]>({
    queryKey: [`/api/organizations/${organizationId}/events`],
    enabled: !!organizationId,
    staleTime: 0, // 常に最新データを取得
    refetchOnMount: 'always', // マウント時に必ず再取得
  });
  
  // ページがマウントされた時に強制的にデータを再取得
  useEffect(() => {
    if (organizationId) {
      refetchEvents();
    }
  }, [organizationId, refetchEvents]);

  const isLoading = isLoadingOrg || isLoadingEvents;
  const error = orgError || eventsError;

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
            <span>{organization?.name}</span>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center">
          <Building className="mr-2 h-6 w-6" />
          {organization?.name} - イベント管理
        </h1>
        <Button asChild>
          <Link href={`/admin/organizations/${organizationId}/events/new`} onClick={(e) => {
            // リンクをクリックすると、強制的に新しいステートでページに移動する
            e.preventDefault();
            window.location.href = `/admin/organizations/${organizationId}/events/new?t=${Date.now()}`;
          }}>
            <Plus className="mr-2 h-4 w-4" />
            新規イベント作成
          </Link>
        </Button>
      </div>

      {organization?.description && (
        <div className="mb-8">
          <p className="text-muted-foreground">{organization.description}</p>
        </div>
      )}

      {events && events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} organizationId={Number(organizationId)} />
          ))}
        </div>
      ) : (
        <div className="border rounded-md p-8 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">イベントが見つかりません</h3>
          <p className="text-gray-500 mb-4">
            この組織にはまだイベントがありません。新しいイベントを作成しましょう。
          </p>
          <Button asChild>
            <Link href={`/admin/organizations/${organizationId}/events/new`}>
              <Plus className="mr-2 h-4 w-4" />
              イベントを作成
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function EventCard({ event, organizationId }: { event: Event; organizationId: number }) {
  // イベント開催日のフォーマット
  const formatDateToJapanese = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return null;
    }
  };
  
  const formattedDate = event.date 
    ? formatDateToJapanese(event.date)
    : null;
    
  // 販売開始日と終了日のフォーマット
  const salesStartDate = event.salesStartDate 
    ? formatDateToJapanese(event.salesStartDate)
    : null;
    
  const salesEndDate = event.salesEndDate 
    ? formatDateToJapanese(event.salesEndDate)
    : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-start">
          <span className="flex items-center">
            <Calendar className="h-5 w-5 mr-2 flex-shrink-0" />
            {event.name}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href={`/admin/organizations/${organizationId}/events/${event.id}/edit`}>
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
            </Link>
          </Button>
        </CardTitle>
        <CardDescription>
          {formattedDate && <div>開催期間: {formattedDate}</div>}
          {event.location && <div>場所: {event.location}</div>}
          {(salesStartDate || salesEndDate) && (
            <div className="mt-1 text-sm flex items-center">
              <DollarSign className="h-3 w-3 mr-1 text-green-600" />
              <span>販売期間: {salesStartDate || "未設定"} 〜 {salesEndDate || "未設定"}</span>
            </div>
          )}
        </CardDescription>
      </CardHeader>
      {event.bannerImage && (
        <CardContent className="pb-2">
          <div className="h-32 rounded-md overflow-hidden">
            <img
              src={event.bannerImage}
              alt={event.name}
              className="w-full h-full object-cover"
            />
          </div>
        </CardContent>
      )}
      <CardFooter className="gap-2 flex-wrap">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/organizations/${organizationId}/events/${event.id}/categories`}>
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
              className="mr-2 h-4 w-4"
            >
              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
            </svg>
            販売管理
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200">
          <Link href={`/admin/organizations/${organizationId}/events/${event.id}/sales`}>
            <DollarSign className="mr-2 h-4 w-4" />
            売り上げデータ
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}