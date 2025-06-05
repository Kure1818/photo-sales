import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function MinimalAdmin() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);

  // 組織一覧を取得
  const { data: organizations = [], isLoading: orgsLoading } = useQuery<any[]>({
    queryKey: ["/api/organizations"],
  });

  // イベント一覧を取得
  const { data: events = [], isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ["/api/events"],
  });

  // 組織作成のミューテーション
  const createOrgMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const res = await apiRequest("POST", "/api/admin/organizations", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      setShowOrgForm(false);
      toast({ title: "組織を作成しました" });
    },
    onError: (error: any) => {
      toast({ 
        title: "エラー", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // イベント作成のミューテーション
  const createEventMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; organizationId: number; eventDate: string }) => {
      const res = await apiRequest("POST", "/api/admin/events", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setShowEventForm(false);
      setSelectedOrgId(null);
      toast({ title: "イベントを作成しました" });
    },
    onError: (error: any) => {
      toast({ 
        title: "エラー", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <p className="text-center text-red-600">管理者権限が必要です</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">
              PIC'store 管理者ダッシュボード
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                ようこそ、{user.username}さん
              </span>
              <Button 
                variant="outline" 
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                ログアウト
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 組織管理 */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>組織管理</CardTitle>
                <Dialog open={showOrgForm} onOpenChange={setShowOrgForm}>
                  <DialogTrigger asChild>
                    <Button>新しい組織を作成</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>新しい組織を作成</DialogTitle>
                    </DialogHeader>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        createOrgMutation.mutate({
                          name: formData.get("name") as string,
                          description: formData.get("description") as string,
                        });
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <Label htmlFor="name">組織名</Label>
                        <Input id="name" name="name" required />
                      </div>
                      <div>
                        <Label htmlFor="description">説明</Label>
                        <Textarea id="description" name="description" />
                      </div>
                      <Button 
                        type="submit" 
                        disabled={createOrgMutation.isPending}
                        className="w-full"
                      >
                        {createOrgMutation.isPending ? "作成中..." : "作成"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {orgsLoading ? (
                <p>読み込み中...</p>
              ) : organizations.length === 0 ? (
                <p className="text-gray-500">組織がありません</p>
              ) : (
                <div className="space-y-2">
                  {organizations.map((org: any) => (
                    <div key={org.id} className="p-3 border rounded-lg">
                      <h3 className="font-medium">{org.name}</h3>
                      {org.description && (
                        <p className="text-sm text-gray-600">{org.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* イベント管理 */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>イベント管理</CardTitle>
                <Dialog open={showEventForm} onOpenChange={setShowEventForm}>
                  <DialogTrigger asChild>
                    <Button disabled={organizations.length === 0}>
                      新しいイベントを作成
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>新しいイベントを作成</DialogTitle>
                    </DialogHeader>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        if (!selectedOrgId) {
                          toast({
                            title: "エラー",
                            description: "組織を選択してください",
                            variant: "destructive"
                          });
                          return;
                        }
                        createEventMutation.mutate({
                          name: formData.get("name") as string,
                          description: formData.get("description") as string,
                          organizationId: selectedOrgId,
                          eventDate: formData.get("eventDate") as string,
                        });
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <Label htmlFor="organization">組織</Label>
                        <select
                          className="w-full p-2 border rounded-md"
                          value={selectedOrgId || ""}
                          onChange={(e) => setSelectedOrgId(Number(e.target.value))}
                          required
                        >
                          <option value="">組織を選択してください</option>
                          {organizations.map((org: any) => (
                            <option key={org.id} value={org.id}>
                              {org.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="name">イベント名</Label>
                        <Input id="name" name="name" required />
                      </div>
                      <div>
                        <Label htmlFor="eventDate">開催日</Label>
                        <Input id="eventDate" name="eventDate" type="date" required />
                      </div>
                      <div>
                        <Label htmlFor="description">説明</Label>
                        <Textarea id="description" name="description" />
                      </div>
                      <Button 
                        type="submit" 
                        disabled={createEventMutation.isPending}
                        className="w-full"
                      >
                        {createEventMutation.isPending ? "作成中..." : "作成"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <p>読み込み中...</p>
              ) : events.length === 0 ? (
                <p className="text-gray-500">イベントがありません</p>
              ) : (
                <div className="space-y-2">
                  {events.map((event: any) => (
                    <div key={event.id} className="p-3 border rounded-lg">
                      <h3 className="font-medium">{event.name}</h3>
                      <p className="text-sm text-gray-600">
                        {new Date(event.eventDate).toLocaleDateString('ja-JP')}
                      </p>
                      {event.description && (
                        <p className="text-sm text-gray-600">{event.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 次のステップの案内 */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>次のステップ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>1. 組織を作成してください</p>
              <p>2. 各組織にイベントを作成してください</p>
              <p>3. 写真アップロード機能を実装します</p>
              <p>4. カテゴリとアルバム管理機能を追加します</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}