import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { Building, Calendar, BarChart, LogOut, Search } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import OrganizationList from "@/components/admin/OrganizationList";
import EventsList from "@/components/admin/EventsList";
import { useEffect, useState } from "react";

// 売上集計セクションのコンポーネント
function SalesReportSection() {
  const [searchParams, setSearchParams] = useState({
    aggregation: "monthly",
    startDate: "",
    endDate: "",
    startYear: "",
    endYear: "",
    startMonth: "",
    endMonth: "",
    selectedMonth: "",
    selectedYear: "",
    device: "none",
    saleType: "photo",
    eventId: "",
    eventName: "",
    organizationId: "",
    organizationName: ""
  });

  const [organizationQuery, setOrganizationQuery] = useState("");
  const [showOrganizationDropdown, setShowOrganizationDropdown] = useState(false);
  const [eventQuery, setEventQuery] = useState("");
  const [showEventDropdown, setShowEventDropdown] = useState(false);

  // 組織一覧を取得
  const { data: organizations = [] } = useQuery({
    queryKey: ["/api/organizations"],
    enabled: organizationQuery.length > 0
  });

  // イベント一覧を取得
  const { data: events = [] } = useQuery({
    queryKey: ["/api/events"],
  });

  // 組織候補をフィルタリング
  const filteredOrganizations = Array.isArray(organizations) 
    ? (organizations as any[]).filter((org: any) =>
        org.name.toLowerCase().includes(organizationQuery.toLowerCase())
      ).slice(0, 10)
    : [];

  // イベント候補をフィルタリング
  const filteredEvents = Array.isArray(events) 
    ? (events as any[])
        .filter((event: any) =>
          eventQuery.length === 0 || event.name.toLowerCase().includes(eventQuery.toLowerCase())
        )
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
    : [];

  const handleSearch = () => {
    let finalParams = { ...searchParams };
    
    // 月別集計の場合、selectedMonthから日付範囲を生成
    if (searchParams.aggregation === "monthly" && searchParams.selectedMonth) {
      const [year, month] = searchParams.selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      
      // 次月の1日を計算
      const nextMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1;
      const nextYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year);
      const endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`;
      
      finalParams = {
        ...finalParams,
        startDate,
        endDate
      };
    }
    
    // 年別集計の場合、selectedYearから日付範囲を生成
    if (searchParams.aggregation === "yearly" && searchParams.selectedYear) {
      const year = searchParams.selectedYear;
      const startDate = `${year}-01-01`;
      const endDate = `${parseInt(year) + 1}-01-01`;
      
      finalParams = {
        ...finalParams,
        startDate,
        endDate
      };
    }
    
  };

  const handleClear = () => {
    setSearchParams({
      aggregation: "monthly",
      startDate: "",
      endDate: "",
      startYear: "",
      endYear: "",
      startMonth: "",
      endMonth: "",
      selectedMonth: "",
      selectedYear: "",
      device: "none",
      saleType: "photo",
      eventId: "",
      eventName: "",
      organizationId: "",
      organizationName: ""
    });
    setOrganizationQuery("");
    setShowOrganizationDropdown(false);
    setEventQuery("");
    setShowEventDropdown(false);
  };

  // 集計区分の変更ハンドラー
  const handleAggregationChange = (value: string) => {
    setSearchParams(prev => ({
      ...prev,
      aggregation: value,
      startDate: "",
      endDate: "",
      startYear: "",
      endYear: "",
      startMonth: "",
      endMonth: "",
      selectedMonth: "",
      selectedYear: ""
    }));
  };

  // 集計期間の入力UIを生成
  const renderDateInputs = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
    const months = [
      "1月", "2月", "3月", "4月", "5月", "6月",
      "7月", "8月", "9月", "10月", "11月", "12月"
    ];

    // 年月の組み合わせを生成（過去2年分）
    const yearMonthOptions = [];
    for (let year = currentYear - 1; year <= currentYear; year++) {
      for (let month = 1; month <= 12; month++) {
        // 未来の月は除外
        if (year === currentYear && month > currentMonth) continue;
        yearMonthOptions.push({
          value: `${year}-${month.toString().padStart(2, '0')}`,
          label: `${year}年${month}月`
        });
      }
    }
    yearMonthOptions.reverse(); // 最新から順に並べる

    // 初期値を前月に設定
    const getDefaultMonth = () => {
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      return `${prevYear}-${prevMonth.toString().padStart(2, '0')}`;
    };

    switch (searchParams.aggregation) {
      case "daily":
        return (
          <div className="flex gap-2 items-center">
            <Input
              type="date"
              value={searchParams.startDate}
              onChange={(e) => setSearchParams(prev => ({ ...prev, startDate: e.target.value }))}
            />
            <span className="text-sm text-muted-foreground">〜</span>
            <Input
              type="date"
              value={searchParams.endDate}
              onChange={(e) => setSearchParams(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
        );

      case "monthly":
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm">📅 選択年月：</span>
            <Select
              value={searchParams.selectedMonth || getDefaultMonth()}
              onValueChange={(value) => setSearchParams(prev => ({ ...prev, selectedMonth: value }))}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="年月を選択" />
              </SelectTrigger>
              <SelectContent>
                {yearMonthOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "yearly":
        // 初期値を前年に設定
        const getDefaultYear = () => {
          return (currentYear - 1).toString();
        };

        return (
          <div className="flex items-center gap-2">
            <span className="text-sm">📅 選択年：</span>
            <Select
              value={searchParams.selectedYear || getDefaultYear()}
              onValueChange={(value) => setSearchParams(prev => ({ ...prev, selectedYear: value }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="年を選択" />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}年</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      default:
        return null;
    }
  };

  // 組織選択のハンドラー
  const handleOrganizationSelect = (organization: any) => {
    setSearchParams(prev => ({
      ...prev,
      organizationId: organization.id.toString(),
      organizationName: organization.name
    }));
    setOrganizationQuery(organization.name);
    setShowOrganizationDropdown(false);
  };

  // 組織名入力のハンドラー
  const handleOrganizationInputChange = (value: string) => {
    setOrganizationQuery(value);
    setShowOrganizationDropdown(true);
    if (value.length === 0) {
      setSearchParams(prev => ({
        ...prev,
        organizationId: "",
        organizationName: ""
      }));
    }
  };

  // イベント選択のハンドラー
  const handleEventSelect = (event: any) => {
    setSearchParams(prev => ({
      ...prev,
      eventId: event.id.toString(),
      eventName: event.name
    }));
    setEventQuery(event.name);
    setShowEventDropdown(false);
  };

  // イベント入力のハンドラー
  const handleEventInputChange = (value: string) => {
    setEventQuery(value);
    setShowEventDropdown(value.length > 0 || value === "");
    if (value.length === 0) {
      setSearchParams(prev => ({
        ...prev,
        eventId: "",
        eventName: ""
      }));
    }
  };

  // 外部クリックでドロップダウンを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.organization-dropdown-container')) {
        setShowOrganizationDropdown(false);
      }
      if (!target.closest('.event-dropdown-container')) {
        setShowEventDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold border-b-2 border-orange-400 pb-2 mb-4">
            売上管理
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 組織名入力 */}
          <div className="space-y-2">
            <Label>組織名の入力</Label>
            <div className="relative organization-dropdown-container">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="組織名を入力してください"
                className="pl-10"
                value={organizationQuery}
                onChange={(e) => handleOrganizationInputChange(e.target.value)}
                onFocus={() => setShowOrganizationDropdown(true)}
              />
              
              {/* 組織候補のドロップダウン */}
              {showOrganizationDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredOrganizations.length > 0 ? (
                    filteredOrganizations.map((org: any) => (
                      <div
                        key={org.id}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={() => handleOrganizationSelect(org)}
                      >
                        {org.name}
                      </div>
                    ))
                  ) : organizationQuery.length > 0 ? (
                    <div className="px-4 py-2 text-sm text-gray-500">
                      該当する組織が見つかりません
                    </div>
                  ) : (
                    <div className="px-4 py-2 text-sm text-gray-500">
                      組織名を入力してください
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* 選択された組織の表示 */}
            {searchParams.organizationName && (
              <div className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded">
                選択中: {searchParams.organizationName}
              </div>
            )}
          </div>

          {/* 集計区分（ラジオボタン） */}
          <div className="space-y-3">
            <Label>集計区分</Label>
            <div className="flex gap-6">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="aggregation"
                  value="daily"
                  checked={searchParams.aggregation === "daily"}
                  onChange={(e) => handleAggregationChange(e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm">日別集計</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="aggregation"
                  value="monthly"
                  checked={searchParams.aggregation === "monthly"}
                  onChange={(e) => handleAggregationChange(e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm">月別集計</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="aggregation"
                  value="yearly"
                  checked={searchParams.aggregation === "yearly"}
                  onChange={(e) => handleAggregationChange(e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm">年別集計</span>
              </label>
            </div>
            <p className="text-xs text-muted-foreground">※月別集計では、より詳細なデータが確認できます</p>
          </div>

          {/* 集計期間（動的UI） */}
          <div className="space-y-2">
            <Label>集計期間</Label>
            {renderDateInputs()}
          </div>

          {/* その他のフィルター */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>デバイス</Label>
              <Select
                value={searchParams.device}
                onValueChange={(value) => setSearchParams(prev => ({ ...prev, device: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="未選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">未選択</SelectItem>
                  <SelectItem value="pc">PC</SelectItem>
                  <SelectItem value="mobile">モバイル</SelectItem>
                  <SelectItem value="tablet">タブレット</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>販売区分</Label>
              <Select
                value={searchParams.saleType}
                onValueChange={(value) => setSearchParams(prev => ({ ...prev, saleType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="未選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="photo">📷 写真</SelectItem>
                  <SelectItem value="video">🎥 動画</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* イベント */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* イベント検索・選択 */}
            <div className="space-y-2">
              <Label>イベントを検索・選択</Label>
              <div className="relative event-dropdown-container">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="イベント名を入力してください"
                  className="pl-10"
                  value={eventQuery}
                  onChange={(e) => handleEventInputChange(e.target.value)}
                  onFocus={() => setShowEventDropdown(true)}
                />
                
                {/* イベント候補のドロップダウン */}
                {showEventDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredEvents.length > 0 ? (
                      filteredEvents.map((event: any) => (
                        <div
                          key={event.id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                          onClick={() => handleEventSelect(event)}
                        >
                          {event.name}
                        </div>
                      ))
                    ) : eventQuery.length > 0 ? (
                      <div className="px-4 py-2 text-sm text-gray-500">
                        該当なし
                      </div>
                    ) : (
                      <div className="px-4 py-2 text-sm text-gray-500">
                        イベント名を入力してください
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* 選択されたイベントの表示 */}
              {searchParams.eventName && (
                <div className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded">
                  選択中: {searchParams.eventName}
                </div>
              )}
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex justify-between items-center pt-4">
            <Button
              variant="outline"
              onClick={handleClear}
            >
              入力をクリア
            </Button>
            <Button
              onClick={handleSearch}
              className="bg-green-600 hover:bg-green-700 text-white px-8"
            >
              検索
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 集計結果 */}
      <Card>
        <CardContent className="pt-6">
          <div className="border rounded-lg">
            <div className="grid grid-cols-4 bg-gray-50 border-b">
              <div className="p-3 font-medium border-r">合計</div>
              <div className="p-3 font-medium border-r">認証数：0回</div>
              <div className="p-3 font-medium border-r">注文件数：0件</div>
              <div className="p-3 font-medium">売上金額：0円</div>
            </div>
            <div className="grid grid-cols-4">
              <div className="p-3 border-r bg-gray-50">-</div>
              <div className="p-3 border-r">顧客単価：0円</div>
              <div className="p-3 border-r">-</div>
              <div className="p-3">-</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* データなしメッセージ */}
      <Card>
        <CardContent className="py-16">
          <div className="text-center text-muted-foreground">
            <p>売上データがありません。写真が販売されると、ここに集計データが表示されます。</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("organizations");

  // URLからのパラメータを処理する（例：/admin?tab=events_list）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab && ["organizations", "events_list", "sales_summary"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location]);

  // タブ変更時にURLを更新
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setLocation(`/admin?tab=${value}`, { replace: true });
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">管理者ダッシュボード</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {user?.username} としてログイン中
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            ログアウト
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="organizations">
            <Building className="w-4 h-4 mr-2" />
            組織
          </TabsTrigger>
          <TabsTrigger value="events_list">
            <Calendar className="w-4 h-4 mr-2" />
            イベント一覧
          </TabsTrigger>
          <TabsTrigger value="sales_summary">
            <BarChart className="w-4 h-4 mr-2" />
            売上集計
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organizations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>組織管理</CardTitle>
              <CardDescription>
                組織を追加・編集・削除できます
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrganizationList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events_list" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>イベント一覧</CardTitle>
              <CardDescription>
                すべてのイベントを閲覧、管理できます
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EventsList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales_summary" className="mt-6">
          <SalesReportSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}