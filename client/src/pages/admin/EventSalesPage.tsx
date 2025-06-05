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
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Organization, Event, Order } from "@shared/schema";
import { 
  Building, 
  Calendar, 
  CreditCard, 
  Download, 
  FileText, 
  Loader2, 
  ShoppingCart, 
  Users 
} from "lucide-react";
import { Link, useParams, useLocation } from "wouter";
import { useEffect, useState } from "react";

export default function EventSalesPage() {
  const { organizationId, eventId } = useParams();
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

  // イベント情報を取得
  const {
    data: event,
    isLoading: isLoadingEvent,
    error: eventError,
  } = useQuery<Event>({
    queryKey: [`/api/events/${eventId}`],
    enabled: !!eventId,
  });

  // サンプルの販売データ（実際には適切なAPIから取得）
  const salesData = [
    {
      id: 1,
      date: "2023-05-15",
      customer: "山田花子",
      email: "hanako@example.com",
      items: "運動会 写真集 x 1",
      amount: 3000
    },
    {
      id: 2,
      date: "2023-05-16",
      customer: "佐藤太郎",
      email: "taro@example.com",
      items: "運動会 個別写真 x 2",
      amount: 1600
    },
    {
      id: 3,
      date: "2023-05-17",
      customer: "鈴木一郎",
      email: "ichiro@example.com",
      items: "運動会 写真集 x 1, 運動会 個別写真 x 3",
      amount: 4200
    },
  ];

  // 合計販売額を計算
  const totalSales = salesData.reduce((total, sale) => total + sale.amount, 0);

  const isLoading = isLoadingOrg || isLoadingEvent;
  const error = orgError || eventError;

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{event?.name} - 売り上げデータ</h1>
      </div>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center">
          <ShoppingCart className="mr-2 h-6 w-6" />
          売り上げデータ - {event?.name}
        </h1>
        <Button asChild variant="outline">
          <Link href={`/admin/organizations/${organizationId}/events`}>
            <Calendar className="mr-2 h-4 w-4" />
            イベント一覧へ戻る
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold text-green-600">
              ¥{totalSales.toLocaleString()}
            </CardTitle>
            <CardDescription>
              累計販売金額
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreditCard className="h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold">
              {salesData.length}
            </CardTitle>
            <CardDescription>
              注文数
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ShoppingCart className="h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold">
              {salesData.length}
            </CardTitle>
            <CardDescription>
              顧客数
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Users className="h-8 w-8 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            販売履歴
          </CardTitle>
          <CardDescription>
            このイベントに関連する販売履歴の一覧
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>注文ID</TableHead>
                  <TableHead>日付</TableHead>
                  <TableHead>顧客名</TableHead>
                  <TableHead>メールアドレス</TableHead>
                  <TableHead>購入商品</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesData.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">#{sale.id}</TableCell>
                    <TableCell>{sale.date}</TableCell>
                    <TableCell>{sale.customer}</TableCell>
                    <TableCell>{sale.email}</TableCell>
                    <TableCell>{sale.items}</TableCell>
                    <TableCell className="text-right">¥{sale.amount.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="ml-auto">
            <Download className="mr-2 h-4 w-4" />
            販売データをエクスポート
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}