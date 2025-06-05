import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Category, Album } from "@shared/schema";
import type { Event, Organization } from "@shared/schema";
import OrganizationBanner from "@/components/OrganizationBanner";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useAuth } from "@/hooks/use-auth";

export default function CategoryPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const categoryId = parseInt(id);
  const { user } = useAuth();

  const { data: category, isLoading: categoryLoading } = useQuery<Category>({
    queryKey: [`/api/categories/${categoryId}`],
  });

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: [`/api/events/${category?.eventId}`],
    enabled: !!category?.eventId,
  });

  const { data: organization, isLoading: orgLoading } = useQuery<Organization>({
    queryKey: [`/api/organizations/${event?.organizationId}`],
    enabled: !!event?.organizationId,
  });

  const { data: albums, isLoading: albumsLoading } = useQuery<Album[]>({
    queryKey: [`/api/categories/${categoryId}/albums`],
    enabled: !!category,
  });

  const isLoading = categoryLoading || eventLoading || orgLoading || albumsLoading;

  if (isLoading && !category) {
    return <div className="container mx-auto px-4 py-8">読み込み中...</div>;
  }

  return (
    <div>
      <OrganizationBanner organization={organization} event={event} />
      
      <Breadcrumbs
        items={[
          { label: organization?.name || "", href: `/organizations/${organization?.id}` },
          { label: event?.name || "", href: `/events/${event?.id}` },
          { label: category?.name || "", href: `/categories/${categoryId}` },
        ]}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{category?.name} アルバム</h2>
          <Button
            variant="outline"
            className="text-primary hover:text-accent flex items-center"
            onClick={() => event && navigate(`/events/${event.id}`)}
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> カテゴリーに戻る
          </Button>
        </div>

        {isLoading ? (
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="h-64 animate-pulse">
                <CardContent className="h-full bg-gray-200"></CardContent>
              </Card>
            ))}
          </div>
        ) : albums && albums.length > 0 ? (
          <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {albums
              .filter(album => album.isPublished === true)
              .map((album) => (
              <Link key={album.id} href={`/albums/${album.id}`}>
                <a className="group">
                  <Card className="overflow-hidden transition-transform hover:shadow-lg transform hover:-translate-y-1 h-full flex flex-col scale-90">
                    <div
                      className="aspect-square bg-cover bg-center"
                      style={{
                        backgroundImage: `url('${album.coverImage}')`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    ></div>
                    <CardContent className="p-4 flex flex-col flex-grow justify-center items-center">
                      <h3 className="font-bold text-lg group-hover:text-accent transition-colors text-center">
                        {album.name}
                      </h3>
                    </CardContent>
                  </Card>
                </a>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-6">
            <p>アルバムが見つかりません。</p>
          </Card>
        )}
      </div>
    </div>
  );
}
