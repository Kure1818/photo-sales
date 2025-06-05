import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";
import MinimalHome from "@/pages/MinimalHome";
import OrganizationPage from "@/pages/OrganizationPage";
import EventPage from "@/pages/EventPage";
import CategoryPage from "@/pages/CategoryPage";
import AlbumPage from "@/pages/AlbumPage";
import UploadPage from "@/pages/UploadPage";
import CartPage from "@/pages/CartPage";
import CheckoutPage from "@/pages/CheckoutPage";
import PaymentSuccessPage from "@/pages/PaymentSuccessPage";
import OrdersPage from "@/pages/OrdersPage";
import AccountPage from "@/pages/AccountPage";
import AuthPage from "@/pages/auth-page";
import AdminPage from "@/pages/admin-page";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import OrganizationEventsPage from "@/pages/admin/OrganizationEventsPage";
import EventSalesPage from "@/pages/admin/EventSalesPage";
import EventCategoriesPage from "@/pages/admin/EventCategoriesPage";
import CategoryEditPage from "@/pages/admin/CategoryEditPage";
import CategoryAlbumsPage from "@/pages/admin/CategoryAlbumsPage";
import AlbumPhotosPageNew from "@/pages/admin/AlbumPhotosPageNew";
// 軽量化のため削除
import LogoutPage from "@/pages/LogoutPage";
// 軽量化のため削除

import EventCreatePage from "./pages/admin/EventCreatePage";
import { AuthProvider } from "@/hooks/use-auth";
import { CartProvider } from "@/hooks/useCart";
import { AdminRoute, ProtectedRoute } from "@/lib/protected-route";

function Router() {
  return (
    <Switch>
      {/* 最小構成：軽量版 */}
      <Route path="/" component={MinimalHome} />
      
      {/* 軽量版デプロイのため管理機能を一時削除 */}
      
      {/* 404ページ */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Layout>
            <Router />
          </Layout>
          <Toaster />
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
