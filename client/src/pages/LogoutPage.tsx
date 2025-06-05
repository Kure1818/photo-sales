import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export default function LogoutPage() {
  const { logoutMutation } = useAuth();
  
  useEffect(() => {
    logoutMutation.mutate();
  }, []);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <Loader2 className="h-8 w-8 animate-spin mb-4" />
      <p className="text-lg">ログアウト中...</p>
    </div>
  );
}