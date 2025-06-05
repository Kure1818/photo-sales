import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import MinimalHome from "@/pages/MinimalHome";
import MinimalLogin from "@/pages/MinimalLogin";
import MinimalAdmin from "@/pages/MinimalAdmin";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const res = await fetch(queryKey[0] as string);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      },
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={MinimalHome} />
      <Route path="/login" component={MinimalLogin} />
      <Route path="/admin" component={MinimalAdmin} />
      <Route>
        <div className="min-h-screen flex items-center justify-center">
          <h1 className="text-2xl">ページが見つかりません</h1>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;