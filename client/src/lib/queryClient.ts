import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// 静的サイト用のAPI URLを取得
const getApiUrl = () => {
  return import.meta.env.VITE_API_URL || 'http://localhost:5000';
};

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // 外部API用のURL構築
  const apiUrl = url.startsWith('http') ? url : `${getApiUrl()}${url}`;
  
  // ヘッダーの準備
  const headers: HeadersInit = {
    'X-Requested-With': 'XMLHttpRequest',
  };
  
  // データがある場合はContent-Typeを追加
  if (data) {
    headers['Content-Type'] = 'application/json';
  }
  
  const res = await fetch(apiUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    const apiUrl = url.startsWith('http') ? url : `${getApiUrl()}${url}`;
    
    const res = await fetch(apiUrl, {
      credentials: "include",
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Cache-Control': 'no-cache',
      }
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.warn(`認証エラー: ${apiUrl} へのリクエストが未認証です`);
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
