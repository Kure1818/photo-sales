export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // 認証チェック - 本実装では外部認証サービス（Firebase Auth等）を使用
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // モックユーザー情報（実際の実装では認証トークンを検証）
    const user = {
      id: 1,
      username: 'admin',
      email: 'yuhki.90884@gmail.com',
      role: 'admin'
    };

    return res.status(200).json(user);
  }

  res.status(405).json({ error: 'Method not allowed' });
}