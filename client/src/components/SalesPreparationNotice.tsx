import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Event } from "@shared/schema";
import { Calendar, Clock, Mail, ExternalLink } from "lucide-react";
import { formatDateToJapanese, getSalesStatus } from "@/utils/date-utils";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface SalesPreparationNoticeProps {
  event: Event;
}

export default function SalesPreparationNotice({ event }: SalesPreparationNoticeProps) {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { toast } = useToast();

  // 販売状態を取得
  const salesStatus = getSalesStatus(event.salesStartDate, event.salesEndDate);
  
  // 日本語形式の販売開始日時（時刻情報も含む）
  const formattedSalesStartDate = formatDateToJapanese(event.salesStartDate, true);
  
  // カウントダウン表示（24時間以内）
  const showCountdown = salesStatus.daysUntilStart <= 1 && salesStatus.isBeforeSalesStart;
  
  // メール通知の登録処理
  const handleSubscribe = () => {
    // 本来はサーバーに登録処理を送信
    // デモ用に成功トースト表示
    toast({
      title: "通知設定完了",
      description: `${email}へ販売開始時に通知します`,
    });
    setEmail("");
    setIsSubscribed(true);
  };
  
  // Googleカレンダーに追加するためのURLを生成
  const getGoogleCalendarUrl = () => {
    if (!event.salesStartDate) return "";
    
    const startDate = new Date(event.salesStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1); // 終了日は翌日
    
    const startDateStr = startDate.toISOString().replace(/-|:|\.\d+/g, "");
    const endDateStr = endDate.toISOString().replace(/-|:|\.\d+/g, "");
    
    const title = encodeURIComponent(`【販売開始】${event.name}`);
    const desc = encodeURIComponent(`${event.name}の写真販売が開始されます。`);
    
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateStr}/${endDateStr}&details=${desc}`;
  };
  
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Card className="shadow-md">
        <CardHeader className="text-center bg-blue-50 rounded-t-lg">
          <CardTitle className="text-2xl text-blue-800">販売準備中</CardTitle>
          <CardDescription className="text-blue-600 text-lg">
            このイベントの写真はまだ販売開始前です
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6 text-center space-y-6">
          <div className="text-lg">
            <p className="mb-4">
              <span className="font-semibold">
                「{event.name}」
              </span>
              の写真販売は、以下の日時より開始予定です。
            </p>
            
            <div className="inline-flex items-center justify-center gap-2 text-xl font-medium text-green-700 bg-green-50 px-4 py-2 rounded-full">
              <Calendar className="h-5 w-5" />
              <span>販売開始日時: {formattedSalesStartDate}</span>
            </div>
            
            {showCountdown && (
              <div className="mt-4 inline-flex items-center justify-center gap-2 text-xl font-medium text-orange-700 bg-orange-50 px-4 py-2 rounded-full">
                <Clock className="h-5 w-5" />
                <span>
                  販売開始まであと 
                  {salesStatus.daysUntilStart > 0 && `${salesStatus.daysUntilStart}日`} 
                  {salesStatus.hoursUntilStart > 0 && `${salesStatus.hoursUntilStart}時間`} 
                  {salesStatus.minutesUntilStart > 0 && `${salesStatus.minutesUntilStart}分`}
                </span>
              </div>
            )}
          </div>
          
          <p className="text-gray-600">
            販売開始までしばらくお待ちください。<br />
            販売開始後は、このページで写真をご覧いただけます。
          </p>
          
          <div className="mt-4 flex justify-center">
            <a 
              href={getGoogleCalendarUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 hover:text-blue-800"
            >
              <Button variant="outline" size="sm" className="inline-flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Googleカレンダーに追加</span>
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </a>
          </div>
          
          {!isSubscribed && (
            <div className="bg-gray-50 p-4 rounded-lg max-w-md mx-auto">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                販売開始をお知らせします
              </h3>
              <div className="mb-3">
                <Label htmlFor="email-notification">メールアドレス</Label>
                <Input
                  id="email-notification"
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mb-2"
                />
                <div className="flex items-center space-x-2 mb-2">
                  <Checkbox id="terms" checked={true} disabled />
                  <Label htmlFor="terms" className="text-xs text-gray-500">
                    プライバシーポリシーに同意します
                  </Label>
                </div>
                <Button 
                  onClick={handleSubscribe}
                  disabled={!email}
                  className="w-full"
                >
                  通知を受け取る
                </Button>
              </div>
            </div>
          )}
        </CardContent>
        
        {/* CardFooterからGoogleカレンダーボタンを削除（上部へ移動済み） */}
        <CardFooter className="justify-center pb-6 pt-0">
        </CardFooter>
      </Card>
    </div>
  );
}