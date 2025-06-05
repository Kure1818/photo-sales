// 外部データベース接続（Supabase等）を想定
let organizations = [
  {
    id: 1,
    name: 'フィットクリエイト',
    description: 'フィットネス・スポーツイベント専門',
    bannerImage: '/uploads/banners/fitcreate-banner.jpg',
    createdAt: new Date().toISOString()
  }
];

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 認証チェック
  const authHeader = req.headers.authorization;
  const isAdmin = authHeader && authHeader.includes('mock-jwt-token');

  if (req.method === 'GET') {
    return res.status(200).json(organizations);
  }

  if (req.method === 'POST') {
    if (!isAdmin) {
      return res.status(401).json({ error: 'Admin access required' });
    }

    const { name, description, bannerImage } = req.body;
    const newOrg = {
      id: organizations.length + 1,
      name,
      description,
      bannerImage: bannerImage || null,
      createdAt: new Date().toISOString()
    };

    organizations.push(newOrg);
    return res.status(201).json(newOrg);
  }

  if (req.method === 'PATCH') {
    if (!isAdmin) {
      return res.status(401).json({ error: 'Admin access required' });
    }

    const { id } = req.query;
    const updates = req.body;
    
    const orgIndex = organizations.findIndex(org => org.id === parseInt(id));
    if (orgIndex === -1) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    organizations[orgIndex] = { ...organizations[orgIndex], ...updates };
    return res.status(200).json(organizations[orgIndex]);
  }

  if (req.method === 'DELETE') {
    if (!isAdmin) {
      return res.status(401).json({ error: 'Admin access required' });
    }

    const { id } = req.query;
    const orgIndex = organizations.findIndex(org => org.id === parseInt(id));
    
    if (orgIndex === -1) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    organizations.splice(orgIndex, 1);
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}