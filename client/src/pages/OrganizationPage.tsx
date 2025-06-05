import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { Organization, Event } from "@shared/schema";
import OrganizationBanner from "@/components/OrganizationBanner";
import Breadcrumbs from "@/components/Breadcrumbs";
import { formatDateToJapanese, formatEventDateRange, getSalesStatus } from "@/utils/date-utils";

export default function OrganizationPage() {
  const { id } = useParams<{ id: string }>();
  const orgId = parseInt(id);

  const { data: organization, isLoading: orgLoading } = useQuery<Organization>({
    queryKey: [`/api/organizations/${orgId}`],
  });

  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: [`/api/organizations/${orgId}/events`],
    enabled: !!organization,
  });

  const isLoading = orgLoading || eventsLoading;

  if (isLoading && !organization) {
    return <div className="container mx-auto px-4 py-8">読み込み中...</div>;
  }

  return (
    <div>
      <OrganizationBanner organization={organization} />
      
      <Breadcrumbs
        items={[
          { label: organization?.name || "", href: `/organizations/${orgId}` },
        ]}
      />

      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">イベント</h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="h-64 animate-pulse">
                <CardContent className="h-full bg-gray-200"></CardContent>
              </Card>
            ))}
          </div>
        ) : events && events.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Link key={event.id} href={`/events/${event.id}`}>
                <a className="group">
                  <Card className="overflow-hidden transition-transform hover:shadow-lg transform hover:-translate-y-1 relative">
                    {/* 販売状態を確認 */}
                    {event.salesStartDate && event.salesEndDate && 
                      getSalesStatus(event.salesStartDate, event.salesEndDate).isSalesPeriod && (
                      <div className="absolute top-0 left-0 z-10 overflow-hidden h-24 w-24">
                        <div className="absolute top-6 left-[-35px] w-[140px] transform rotate-[-45deg] bg-green-600 text-white text-center text-xs font-semibold py-1 shadow-md">
                          🟢 販売中
                        </div>
                      </div>
                    )}
                    <div
                      className="h-48 bg-cover bg-center"
                      style={{
                        backgroundImage: `url('${event.bannerImage}')`,
                      }}
                    ></div>
                    <CardContent className="p-4">
                      <h3 className="font-bold text-lg group-hover:text-accent transition-colors">
                        {event.name}
                      </h3>
                      <p className="text-gray-600 text-sm">{event.description}</p>
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500"><span className="mr-1">📅</span> 開催期間：{event.date ? formatEventDateRange(event.date) : "未設定"}</span>
                          <ArrowRight className="h-4 w-4 text-accent" />
                        </div>
                        {/* 販売中のイベントは販売終了日のみ表示、それ以外は販売期間を表示 */}
                        {event.salesStartDate && event.salesEndDate && (
                          getSalesStatus(event.salesStartDate, event.salesEndDate).isSalesPeriod ? (
                            <div className="text-xs text-green-600">
                              <span className="mr-1">🛒</span> 販売終了日：{formatDateToJapanese(event.salesEndDate, true)}
                            </div>
                          ) : (
                            <div className="text-xs text-green-600">
                              <span className="mr-1">🛒</span> 販売期間：{formatDateToJapanese(event.salesStartDate, false)} 〜 {formatDateToJapanese(event.salesEndDate, false)}
                            </div>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </a>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-6">
            <p>イベントが見つかりません。</p>
          </Card>
        )}
      </div>
    </div>
  );
}
