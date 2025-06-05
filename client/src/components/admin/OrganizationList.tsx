import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Organization } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Building, Calendar, Loader2, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import OrganizationForm from "./OrganizationForm";

export default function OrganizationList() {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const {
    data: organizations,
    isLoading,
    error,
  } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
    staleTime: 30 * 1000, // 30秒間はキャッシュを使用
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">組織データの読み込みに失敗しました</p>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
        >
          再読み込み
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新規組織作成
        </Button>
      </div>

      {organizations && organizations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {organizations.map((organization) => (
            <OrganizationCard key={organization.id} organization={organization} />
          ))}
        </div>
      ) : (
        <div className="border rounded-md p-8 text-center">
          <Building className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">組織が見つかりません</h3>
          <p className="text-gray-500 mb-4">
            新しい組織を作成して、イベントや写真を管理しましょう。
          </p>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            組織を作成
          </Button>
        </div>
      )}

      <OrganizationForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />
    </div>
  );
}

function OrganizationCard({ organization }: { organization: Organization }) {
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-start">
          <span className="flex items-center">
            <Building className="h-5 w-5 mr-2 flex-shrink-0" />
            {organization.name}
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => setIsEditFormOpen(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </CardTitle>
        <CardDescription>
          {organization.description || "説明なし"}
        </CardDescription>
      </CardHeader>
      
      {/* 編集フォーム */}
      <OrganizationForm 
        isOpen={isEditFormOpen} 
        onClose={() => setIsEditFormOpen(false)} 
        organization={organization}
        mode="edit"
      />
      {organization.bannerImage && (
        <CardContent className="pb-2">
          <div className="h-32 rounded-md overflow-hidden">
            <img
              src={organization.bannerImage}
              alt={organization.name}
              className="w-full h-full object-cover"
            />
          </div>
        </CardContent>
      )}
      <CardFooter>
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link href={`/admin/organizations/${organization.id}/events`}>
            <Calendar className="mr-2 h-4 w-4" />
            イベントを管理
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}