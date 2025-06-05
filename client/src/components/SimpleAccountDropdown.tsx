import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export default function SimpleAccountDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logoutMutation } = useAuth();
  const [, navigate] = useLocation();

  if (!user) {
    return (
      <Button
        variant="ghost"
        className="text-white"
        onClick={() => navigate('/auth')}
      >
        ログイン
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        className="text-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        {user.username}さん
      </Button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50">
          <button 
            className="block w-full px-4 py-2 text-left hover:bg-gray-50"
            onClick={() => {
              navigate('/account');
              setIsOpen(false);
            }}
          >
            マイアカウント
          </button>
          <button 
            className="block w-full px-4 py-2 text-left hover:bg-gray-50"
            onClick={() => {
              logoutMutation.mutate();
              setIsOpen(false);
            }}
          >
            ログアウト
          </button>
        </div>
      )}
    </div>
  );
}