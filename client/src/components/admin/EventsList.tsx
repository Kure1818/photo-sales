import { useQuery } from "@tanstack/react-query";
import { Event } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, BarChart } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { Link } from "wouter";

// 日付文字列が正しい形式かどうか確認
const isValidDateString = (dateStr: string | null | undefined): boolean => {
  if (!dateStr) return false;
  
  // ISO形式のみをサポート
  try {
    const date = parseISO(dateStr);
    return isValid(date);
  } catch (e) {
    return false;
  }
};

// 日付を安全にフォーマット
const formatDateSafely = (dateStr: string | null | undefined, format: string): string => {
  if (!dateStr) return "";
  
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return "";
    return format_(date, format, { locale: ja });
  } catch (e) {
    return "";
  }
};

// format関数をラップしてエラーハンドリングを追加
const format_ = (date: Date, formatStr: string, options: any): string => {
  try {
    if (!isValid(date)) return "";
    return format(date, formatStr, options);
  } catch (e) {
    return "";
  }
};

export default function EventsList() {
  // すべてのイベントを取得
  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    select: (events) => {
      // イベントを日付の降順に並べ替え（最新のイベントが先頭に）
      return [...events].sort((a, b) => {
        let dateA: Date;
        let dateB: Date;
        
        // createdAtが常に有効な場合（現在のAPIの仕様上）、それを使用
        if (a.createdAt) {
          try {
            const parsedDate = new Date(a.createdAt);
            dateA = isValid(parsedDate) ? parsedDate : new Date();
          } catch (e) {
            dateA = new Date();
          }
        } else {
          dateA = new Date();
        }
        
        if (b.createdAt) {
          try {
            const parsedDate = new Date(b.createdAt);
            dateB = isValid(parsedDate) ? parsedDate : new Date();
          } catch (e) {
            dateB = new Date();
          }
        } else {
          dateB = new Date();
        }
        
        return dateB.getTime() - dateA.getTime();
      });
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center my-8">
        <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-gray-900 rounded-full"></div>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="border rounded-md p-4">
        <p className="text-center text-gray-500 py-8">
          イベントが見つかりません。組織ページから新しいイベントを追加してください。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <div key={event.id} className="border rounded-md p-4 hover:bg-gray-50">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold">{event.name}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {/* 作成日表示 - SafeなFormat関数を使用 */}
                {event.createdAt && 
                  format_(new Date(event.createdAt), 'yyyy年MM月dd日', { locale: ja })
                }
                {event.location && ` • ${event.location}`}
              </p>
              {event.description && (
                <p className="text-sm text-gray-700 mt-2">{event.description}</p>
              )}
            </div>
            <div className="flex space-x-2">
              <Link href={`/admin/organizations/${event.organizationId}/events/${event.id}/categories`}>
                <Button variant="outline" size="sm">
                  <DollarSign className="w-4 h-4 mr-1" />
                  販売管理
                </Button>
              </Link>
              <Link href={`/admin/events/${event.id}/sales`}>
                <Button variant="outline" size="sm">
                  <BarChart className="w-4 h-4 mr-1" />
                  売り上げデータ
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}