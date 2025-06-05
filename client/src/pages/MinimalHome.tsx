import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Organization } from "@shared/schema";

export default function MinimalHome() {
  const [, navigate] = useLocation();
  
  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">PIC'store</h1>
            <p className="text-sm opacity-90">イベント写真販売プラットフォーム</p>
          </div>
          <button
            onClick={() => navigate("/login")}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg border border-white/30 transition-all"
          >
            管理者ログイン
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <section className="mb-8">
          <h2 className="text-3xl font-bold mb-4">写真を探す</h2>
          <p className="text-gray-600 mb-6">
            イベントの思い出を高品質な写真でお楽しみください
          </p>
        </section>

        <section>
          <h3 className="text-xl font-semibold mb-4">組織一覧</h3>
          {organizations.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 max-w-md mx-auto">
                <p className="text-gray-600 mb-4">現在、組織が登録されていません</p>
                <p className="text-sm text-gray-500 mb-6">
                  管理者がまず組織とイベントを作成する必要があります
                </p>
                <button
                  onClick={() => navigate("/login")}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  管理者として始める
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/organizations/${org.id}`)}
                >
                  {org.bannerImage && (
                    <img
                      src={org.bannerImage}
                      alt={org.name}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h4 className="font-semibold text-lg mb-2">{org.name}</h4>
                    <p className="text-gray-600 text-sm">{org.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="bg-gray-800 text-white p-8 mt-16">
        <div className="container mx-auto text-center">
          <p>&copy; 2024 PIC'store. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}