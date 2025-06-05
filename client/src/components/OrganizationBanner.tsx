import { Organization, Event } from "@shared/schema";
import { formatDateToJapanese, formatEventDateRange } from "@/utils/date-utils";

interface OrganizationBannerProps {
  organization?: Organization;
  event?: Event;
}

export default function OrganizationBanner({ organization, event }: OrganizationBannerProps) {
  const bannerImage = event?.bannerImage || organization?.bannerImage;
  const title = event?.name || organization?.name || "FIT-CREATE";
  const subtitle = event?.description || organization?.description || "イベント写真マーケットプレイス";
  // イベントがある場合のメタデータを表示
  const hasMetadata = event?.date || event?.salesStartDate || event?.salesEndDate;
  
  const metadata = hasMetadata ? (
    <div className="flex flex-wrap gap-2">
      {event?.date && (
        <span className="bg-primary bg-opacity-75 px-3 py-1 rounded-full text-sm">
          <span className="mr-1">📅</span> 開催期間：{event.date ? formatEventDateRange(event.date) : "未設定"}
        </span>
      )}
      {event?.salesStartDate && (
        <span className="bg-green-600 bg-opacity-75 px-3 py-1 rounded-full text-sm">
          <span className="mr-1">🛒</span> 販売開始：{formatDateToJapanese(event.salesStartDate, true)}
        </span>
      )}
    </div>
  ) : null;

  return (
    <div 
      className="relative h-64 md:h-80 bg-cover bg-center" 
      style={{ backgroundImage: `url('${bannerImage}')` }}
    >
      <div className="absolute inset-0 bg-black bg-opacity-50"></div>
      <div className="container mx-auto px-4 h-full flex flex-col justify-center relative z-10 text-white">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">{title}</h1>
        <p className="text-lg md:text-xl">{subtitle}</p>
        {metadata && <div className="mt-4">{metadata}</div>}
      </div>
    </div>
  );
}
