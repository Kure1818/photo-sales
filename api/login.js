export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    const { username, password } = req.body;

    // 管理者認証（実際の実装では暗号化されたパスワードと比較）
    if (username === 'yuhki.90884@gmail.com' && password === 'kurekure90') {
      const user = {
        id: 1,
        username: 'admin',
        email: 'yuhki.90884@gmail.com',
        role: 'admin'
      };

      // 実際の実装ではJWTトークンを生成
      const token = 'mock-jwt-token-' + Date.now();
      
      res.setHeader('Set-Cookie', `auth-token=${token}; HttpOnly; Path=/; Max-Age=86400`);
      return res.status(200).json(user);
    }

    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.status(405).json({ error: 'Method not allowed' });
}