import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { Category } from "@shared/schema";
import type { Event, Organization } from "@shared/schema";
import OrganizationBanner from "@/components/OrganizationBanner";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useAuth } from "@/hooks/use-auth";
import { getSalesStatus } from "@/utils/date-utils";
import SalesPreparationNotice from "@/components/SalesPreparationNotice";

export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const eventId = parseInt(id);
  const { user } = useAuth();

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: [`/api/events/${eventId}`],
  });

  const { data: organization, isLoading: orgLoading } = useQuery<Organization>({
    queryKey: [`/api/organizations/${event?.organizationId}`],
    enabled: !!event?.organizationId,
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: [`/api/events/${eventId}/categories`],
    enabled: !!event,
  });

  const isLoading = eventLoading || orgLoading || categoriesLoading;

  if (isLoading && !event) {
    return <div className="container mx-auto px-4 py-8">読み込み中...</div>;
  }

  // 販売期間の状態を確認
  const salesStatus = event ? getSalesStatus(event.salesStartDate, event.salesEndDate) : null;
  
  // 管理者ユーザーかどうか確認
  const isAdmin = user?.isAdmin === true;
  
  // 販売開始前かどうか (管理者も一般ユーザーと同じ表示にする)
  const showPreparationNotice = salesStatus?.isBeforeSalesStart;
  
  return (
    <div>
      <OrganizationBanner organization={organization} event={event} />
      
      <Breadcrumbs
        items={[
          { label: organization?.name || "", href: `/organizations/${organization?.id}` },
          { label: event?.name || "", href: `/events/${eventId}` },
        ]}
      />

      {/* 販売開始前の場合は準備中ページを表示 */}
      {showPreparationNotice && event ? (
        <SalesPreparationNotice event={event} />
      ) : (
        <div className="container mx-auto px-4 py-8">
          <h2 className="text-2xl font-bold mb-6">カテゴリー</h2>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="h-64 animate-pulse">
                  <CardContent className="h-full bg-gray-200"></CardContent>
                </Card>
              ))}
            </div>
          ) : categories && categories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category) => (
                <Link key={category.id} href={`/categories/${category.id}`}>
                  <a className="group">
                    <Card className="overflow-hidden transition-transform hover:shadow-lg transform hover:-translate-y-1">
                      <div
                        className="h-48 bg-cover bg-center"
                        style={{
                          backgroundImage: `url('${category.coverImage}')`,
                        }}
                      ></div>
                      <CardContent className="p-4">
                        <h3 className="font-bold text-lg group-hover:text-accent transition-colors">
                          {category.name}
                        </h3>
                        <p className="text-gray-600 text-sm">{category.description}</p>
                        <div className="mt-2 flex justify-between items-center">
                          <span className="text-sm text-gray-500">アルバムを見る</span>
                          <ArrowRight className="h-4 w-4 text-accent" />
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="p-6">
              <p>カテゴリーが見つかりません。</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
