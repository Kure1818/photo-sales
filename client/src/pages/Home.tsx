import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { Organization } from "@shared/schema";

export default function HomePage() {
  const { data: organizations, isLoading, error } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
  });

  return (
    <div>
      <div className="bg-gradient-to-r from-primary to-secondary text-white">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              PIC'store
            </h1>
            <p className="text-xl md:text-2xl mb-8">
              プロフェッショナルなイベント写真を簡単に管理・販売できるマーケットプレイスプラットフォーム
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-8">組織一覧</h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="h-64 animate-pulse">
                <CardContent className="h-full bg-gray-200"></CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="p-6 bg-red-50 border-red-200">
            <p className="text-red-500">組織情報の読み込みに失敗しました。</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizations?.map((org) => (
              <div key={org.id} className="group">
                <Link href={`/organizations/${org.id}`}>
                  <Card className="overflow-hidden h-64 transition-shadow hover:shadow-lg">
                    <div
                      className="h-40 bg-cover bg-center"
                      style={{
                        backgroundImage: `url('${org.bannerImage}')`,
                      }}
                    ></div>
                    <CardContent className="p-4">
                      <h3 className="font-bold text-lg group-hover:text-accent transition-colors">
                        {org.name}
                      </h3>
                      <p className="text-gray-600 text-sm line-clamp-2">
                        {org.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            ))}
          </div>
        )}

        <div className="mt-16">
          <h2 className="text-3xl font-bold mb-8">写真家の方へ</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-3">簡単アップロード</h3>
                <p className="text-gray-600">
                  ドラッグ＆ドロップで簡単に写真をアップロードできます。自動的にサムネイルとウォーターマークが生成されます。
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-3">柔軟な価格設定</h3>
                <p className="text-gray-600">
                  個別の写真価格やアルバム一括価格を自由に設定できます。販売戦略に合わせた料金体系を構築しましょう。
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-3">階層型構造</h3>
                <p className="text-gray-600">
                  組織 {'>'} イベント {'>'} カテゴリー {'>'} アルバムの階層型構造で、コンテンツを効率的に整理できます。
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
