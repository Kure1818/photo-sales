import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";
import { z } from "zod";
import { insertOrderSchema } from "@shared/schema";
import { setupAuth } from "./auth";
import { createPaypalOrder, capturePaypalOrder, loadPaypalDefault } from "./paypal";
import { randomUUID } from "crypto";
import Stripe from "stripe";
import archiver from "archiver";

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
const thumbnailsDir = path.join(uploadDir, "thumbnails");
const watermarkedDir = path.join(uploadDir, "watermarked");

// Create directories if they don't exist
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(thumbnailsDir, { recursive: true });
fs.mkdirSync(watermarkedDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + "-" + file.originalname);
    },
  }),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Apply watermark to an image using Sharp only (Pythonは使用しない)
async function applyWatermark(inputPath: string, outputPath: string, text = "PIC'store") {
  try {
    // Sharpのみを使用した透かし処理
    return fallbackWatermark(inputPath, outputPath, text);
  } catch (error) {
    console.error("透かし適用エラー:", error);
    throw error;
  }
}

// 角度付きのSVGパターンを使用したウォーターマーク処理
async function fallbackWatermark(inputPath: string, outputPath: string) {
  try {
    // 処理後の画像をリサイズ
    const processedImage = await sharp(inputPath)
      .rotate() // 自動回転
      .resize(800, null, { fit: 'inside' }) // リサイズ
      .toBuffer();
    
    // メタデータを取得
    const metadata = await sharp(processedImage).metadata();
    const width = metadata.width || 800;
    const height = metadata.height || 600;
    
    // ウォーターマークのサイズと配置を設定
    const TEXT_SIZE = 24; // 文字サイズを大きく
    const ROTATION = 45; // 45度回転
    const ROWS = 5; // 行数を減らして各ロゴを大きく
    const COLS = 5;
    const ROW_HEIGHT = Math.ceil(height / (ROWS - 0.5)); // 間隔を広げる
    const COL_WIDTH = Math.ceil(width / (COLS - 0.5)); // 間隔を広げる
    
    // SVGを作成
    let watermarkSvg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .logo {
          font-family: Arial, sans-serif;
          font-size: ${TEXT_SIZE}px;
          font-weight: bold;
          fill: white;
          fill-opacity: 0.7;
          text-anchor: middle;
        }
      </style>`;
    
    // ロゴテキストを配置
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        // 奇数行は半分ずらす
        const xOffset = (row % 2) ? COL_WIDTH / 2 : 0;
        const x = col * COL_WIDTH + xOffset + (COL_WIDTH / 2);
        const y = row * ROW_HEIGHT + (ROW_HEIGHT / 2);
        
        // 角度をつけて配置
        watermarkSvg += `
        <text x="${x}" y="${y}" class="logo" transform="rotate(${ROTATION}, ${x}, ${y})">FIT-CREATE</text>`;
      }
    }
    
    watermarkSvg += `</svg>`;
    
    console.log(`画像サイズ: ${width}x${height}, 角度付きウォーターマーク作成 (${COLS}x${ROWS}グリッド, ${ROTATION}度回転)`);
    
    // 元画像にSVGウォーターマークを合成して保存
    await sharp(processedImage)
      .composite([{
        input: Buffer.from(watermarkSvg),
        gravity: 'center'
      }])
      .jpeg({ quality: 85 })
      .toFile(outputPath);
    
    return outputPath;
  } catch (error) {
    console.error("Error applying watermark:", error);
    throw error;
  }
}

// Create thumbnail from an image
async function createThumbnail(inputPath: string, outputPath: string, size = 400) {
  try {
    // 写真のメタデータを取得して向き（Orientation）を確認
    const metadata = await sharp(inputPath).metadata();
    
    // 画像を処理するための新しいSharpインスタンスを作成
    let image = sharp(inputPath);
    
    // EXIFの向き情報を維持するため、これを設定
    // これによりシャープは自動的に画像を適切な向きに回転させる
    image = image.rotate(); // 引数なしでEXIFデータに基づいて自動回転
    
    // 正方形に切り抜く（中心上部を優先）
    await image
      .resize(size, size, { 
        fit: "cover",       // カバーモードで切り抜き
        position: "top",    // 上部を基準に
        withoutEnlargement: true  // 元のサイズより大きくしない
      })
      .toFile(outputPath);
      
    return outputPath;
  } catch (error) {
    console.error("Error creating thumbnail:", error);
    throw error;
  }
}

// Generate album cover from the first photo
async function generateAlbumCover(albumId: number) {
  try {
    // Get all photos for the album
    const photos = await storage.getPhotosByAlbum(albumId);
    
    if (!photos || photos.length === 0) {
      console.log(`No photos found for album ID ${albumId}`);
      return null;
    }
    
    // Sort by creation date to get the first uploaded photo (or use any other criteria)
    const sortedPhotos = [...photos].sort((a, b) => 
      new Date(a.createdAt || new Date()).getTime() - new Date(b.createdAt || new Date()).getTime()
    );
    
    const firstPhoto = sortedPhotos[0];
    
    // Try to get filePath from metadata if available
    let photoPath = "";
    if (firstPhoto.metadata && typeof firstPhoto.metadata === 'object' && 'filePath' in firstPhoto.metadata) {
      photoPath = firstPhoto.metadata.filePath as string;
    }
    
    // Fallback to original path based on URL
    if (!photoPath) {
      // Extract filename from original URL and reconstruct the file path
      const filename = path.basename(firstPhoto.originalUrl);
      photoPath = path.join(uploadDir, filename);
    }
    
    if (!photoPath || !fs.existsSync(photoPath)) {
      console.error(`Photo file does not exist: ${photoPath}`);
      return null;
    }
    
    // Create thumbnail directory if it doesn't exist
    if (!fs.existsSync(thumbnailsDir)) {
      fs.mkdirSync(thumbnailsDir, { recursive: true });
    }
    
    // Generate a unique thumbnail name
    const coverFilename = `album_${albumId}_cover_${randomUUID()}.jpg`;
    const coverPath = path.join(thumbnailsDir, coverFilename);
    
    // Create the cover thumbnail
    await createThumbnail(photoPath, coverPath, 600); // Larger size for album cover
    
    // Get the relative path from upload directory
    const relativePath = `/uploads/thumbnails/${coverFilename}`;
    
    // Update the album with the cover path
    const updatedAlbum = await storage.updateAlbumCover(albumId, relativePath);
    
    return updatedAlbum;
  } catch (error) {
    console.error(`Error generating album cover for album ${albumId}:`, error);
    return null;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  await setupAuth(app);
  
  // Serve uploaded files
  app.use("/uploads", express.static(uploadDir));
  
  // ミドルウェア: 管理者権限確認
  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {

    
    // ▼▼▼ 開発中の一時的な対応策: クッキーをチェックして管理者トークンが存在するか確認 ▼▼▼
    const cookies = req.headers.cookie || '';
    if (cookies.includes('admin_bypass=true')) {

      // 一時的な管理者ユーザーを設定
      (req as any).user = {
        id: 9999,
        username: "admin@example.com",
        isAdmin: true,
        displayName: "管理者さん"
      };
      return next();
    }
    // ▲▲▲ 開発中の一時的な対応策 ▲▲▲
    
    // セッション状態を確認
    if (!req.session || !req.sessionID) {

      return res.status(401).json({ error: "セッションが無効です" });
    }
    
    // 未認証の場合は、ログイン画面にリダイレクト
    if (!req.isAuthenticated() || !req.user) {

      
      // セッションを明示的にタッチして有効期限をリセット
      req.session.touch();
      
      if (req.method === 'GET' && req.accepts('html')) {
        // ブラウザからのGETリクエストの場合は、ログインページにリダイレクト
        return res.redirect('/auth');
      } else {
        // APIリクエストの場合は401エラー
        return res.status(401).json({ error: "認証が必要です。再度ログインしてください。" });
      }
    }
    
    // 管理者権限のチェック
    if (!req.user.isAdmin) {

      return res.status(403).json({ error: "管理者権限が必要です" });
    }
    

    next();
  };
  
  // API routes - prefixed with /api
  
  // 管理者専用エンドポイント
  // バナー画像アップロード
  app.post("/api/admin/upload/banner", requireAdmin, upload.single("image"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "画像ファイルが提供されていません" });
      }
      
      const filePath = req.file.path;
      const fileName = req.file.filename;
      const fileUrl = `/uploads/${fileName}`;
      
      // 画像処理が必要な場合はここでリサイズなどを行う
      // 例: サイズを最適化したり、アスペクト比を調整したりする
      
      res.status(201).json({ 
        imageUrl: fileUrl,
        fileName: fileName
      });
    } catch (error) {
      console.error("バナー画像アップロードエラー:", error);
      res.status(500).json({ error: "バナー画像のアップロードに失敗しました" });
    }
  });

  app.post("/api/admin/organizations", requireAdmin, async (req: Request, res: Response) => {
    try {
      const organization = await storage.createOrganization(req.body);
      res.status(201).json(organization);
    } catch (error) {
      res.status(500).json({ error: "組織の作成に失敗しました" });
    }
  });
  
  app.patch("/api/admin/organizations/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const organizationId = parseInt(req.params.id);
      if (isNaN(organizationId)) {
        return res.status(400).json({ error: "無効な組織IDです" });
      }
      
      const updatedOrganization = await storage.updateOrganization(organizationId, req.body);
      if (!updatedOrganization) {
        return res.status(404).json({ error: "組織が見つかりません" });
      }
      
      res.status(200).json(updatedOrganization);
    } catch (error) {
      console.error("組織更新エラー:", error);
      res.status(500).json({ error: "組織の更新に失敗しました" });
    }
  });
  
  app.delete("/api/admin/organizations/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const organizationId = parseInt(req.params.id);
      if (isNaN(organizationId)) {
        return res.status(400).json({ error: "無効な組織IDです" });
      }
      
      const success = await storage.deleteOrganization(organizationId);
      if (!success) {
        return res.status(404).json({ error: "組織が見つかりません" });
      }
      
      res.status(200).json({ success: true, message: "組織を削除しました" });
    } catch (error) {
      console.error("組織削除エラー:", error);
      res.status(500).json({ error: "組織の削除に失敗しました" });
    }
  });
  
  app.post("/api/admin/events", requireAdmin, async (req: Request, res: Response) => {
    try {

      const event = await storage.createEvent(req.body);
      res.status(201).json(event);
    } catch (error) {
      console.error("イベント作成エラー:", error);
      res.status(500).json({ error: "イベントの作成に失敗しました" });
    }
  });
  
  // イベント更新エンドポイント
  app.patch("/api/admin/events/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        return res.status(400).json({ error: "無効なイベントIDです" });
      }
      
      console.log("イベント更新リクエスト:", req.body);
      
      // イベントの存在確認
      const existingEvent = await storage.getEvent(eventId);
      if (!existingEvent) {
        return res.status(404).json({ error: "イベントが見つかりません" });
      }
      
      // 更新データの作成
      const updateData = {
        ...req.body,
        id: eventId
      };
      
      const updatedEvent = await storage.updateEvent(updateData);
      
      res.status(200).json(updatedEvent);
    } catch (error) {
      console.error("イベント更新エラー:", error);
      res.status(500).json({ error: "イベントの更新に失敗しました" });
    }
  });
  
  // イベント削除エンドポイント
  app.delete("/api/admin/events/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        return res.status(400).json({ error: "無効なイベントIDです" });
      }
      
      console.log("イベント削除リクエスト: ID", eventId);
      
      // イベントの存在確認
      const existingEvent = await storage.getEvent(eventId);
      if (!existingEvent) {
        return res.status(404).json({ error: "イベントが見つかりません" });
      }
      
      // イベントとその関連データを削除
      const result = await storage.deleteEvent(eventId);
      
      if (result) {
        res.status(200).send();
      } else {
        res.status(500).json({ error: "イベントの削除に失敗しました" });
      }
    } catch (error) {
      console.error("イベント削除エラー:", error);
      res.status(500).json({ error: "イベントの削除に失敗しました" });
    }
  });
  
  app.post("/api/admin/categories", requireAdmin, async (req: Request, res: Response) => {
    try {
      // リクエストボディのログを出力（デバッグ用）
      console.log("カテゴリ作成リクエスト:", req.body);
      
      // 必須フィールドの検証
      if (!req.body.name || !req.body.eventId) {
        return res.status(400).json({ error: "カテゴリ名とイベントIDは必須です" });
      }
      
      // nullの場合は空文字列に変換（オプショナルフィールド）
      if (req.body.description === null) req.body.description = "";
      if (req.body.coverImage === null) req.body.coverImage = "";
      
      const category = await storage.createCategory(req.body);
      console.log("作成されたカテゴリ:", category);
      res.status(201).json(category);
    } catch (error) {
      console.error("カテゴリ作成エラー:", error);
      res.status(500).json({ error: "カテゴリの作成に失敗しました" });
    }
  });
  
  app.post("/api/admin/albums", requireAdmin, async (req: Request, res: Response) => {
    try {
      // リクエストボディのログを出力（デバッグ用）
      console.log("アルバム作成リクエスト:", req.body);
      
      // 必須フィールドの検証
      if (!req.body.name || !req.body.categoryId) {
        return res.status(400).json({ error: "アルバム名とカテゴリIDは必須です" });
      }
      
      // nullの場合は空文字列や0に変換（オプショナルフィールド）
      if (req.body.description === null) req.body.description = "";
      if (req.body.coverImage === null) req.body.coverImage = "";
      if (req.body.price === null || req.body.price === undefined) req.body.price = 0;
      
      // アルバムの作成
      const album = await storage.createAlbum(req.body);
      console.log("作成されたアルバム:", album);
      res.status(201).json(album);
    } catch (error) {
      console.error("アルバム作成エラー:", error);
      res.status(500).json({ error: "アルバムの作成に失敗しました" });
    }
  });
  
  // Get all organizations
  app.get("/api/organizations", async (req: Request, res: Response) => {
    try {
      const organizations = await storage.getOrganizations();
      res.json(organizations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  // Get organization by ID
  app.get("/api/organizations/:id", async (req: Request, res: Response) => {
    try {
      const organization = await storage.getOrganization(parseInt(req.params.id));
      if (!organization) {
        return res.status(404).json({ error: "組織が見つかりません" });
      }
      res.json(organization);
    } catch (error) {
      res.status(500).json({ error: "組織の取得に失敗しました" });
    }
  });

  // Get events by organization ID
  app.get("/api/organizations/:id/events", async (req: Request, res: Response) => {
    try {
      const events = await storage.getEventsByOrganization(parseInt(req.params.id));
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "イベントの取得に失敗しました" });
    }
  });

  // Get all events
  app.get("/api/events", async (req: Request, res: Response) => {
    try {
      const events = await storage.getEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "イベントの取得に失敗しました" });
    }
  });

  // Get a single event
  app.get("/api/events/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const event = await storage.getEvent(id);
      
      if (!event) {
        return res.status(404).json({ error: "イベントが見つかりません" });
      }
      
      console.log("イベント詳細取得:", event);
      res.json(event);
    } catch (error) {
      res.status(500).json({ error: "イベントの取得に失敗しました" });
    }
  });

  // Get events by organization
  app.get("/api/organizations/:id/events", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const events = await storage.getEventsByOrganization(id);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  // このエンドポイントは上記で定義済みのため削除

  // Get categories by event
  app.get("/api/events/:id/categories", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const categories = await storage.getCategoriesByEvent(id);
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "カテゴリの取得に失敗しました" });
    }
  });

  // Get category by ID
  app.get("/api/categories/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const category = await storage.getCategory(id);
      
      if (!category) {
        return res.status(404).json({ error: "カテゴリが見つかりません" });
      }
      
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch category" });
    }
  });
  
  // Update a category
  app.patch("/api/admin/categories/:id", async (req: Request, res: Response) => {
    try {
      // 管理者権限チェック
      if (!req.isAuthenticated() || !req.user.isAdmin) {
        return res.status(403).json({ error: "この操作には管理者権限が必要です" });
      }
      
      const id = parseInt(req.params.id);
      const category = await storage.getCategory(id);
      
      if (!category) {
        return res.status(404).json({ error: "カテゴリが見つかりません" });
      }
      
      const { name, description, coverImage } = req.body;
      
      // 更新可能なフィールドをチェック
      const updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (coverImage !== undefined) updateData.coverImage = coverImage;
      
      const updatedCategory = await storage.updateCategory(id, updateData);
      res.json(updatedCategory);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ error: "カテゴリの更新に失敗しました" });
    }
  });

  // Get albums by category with photo counts
  app.get("/api/categories/:id/albums", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      let albums = await storage.getAlbumsByCategory(id);
      
      console.log("認証状態:", req.isAuthenticated(), "管理者:", req.isAuthenticated() ? req.user.isAdmin : false);
      
      // 管理者パスがあるか確認
      const path = req.headers.referer || '';
      const isAdminPath = path.includes('/admin/');
      console.log("リクエスト元URL:", path, "管理画面からのリクエスト:", isAdminPath);
      
      // 管理画面からのリクエスト以外は公開済みのアルバムのみを表示
      if (!isAdminPath) {
        console.log("一般公開ページ向けフィルタリング適用:", albums.length, "個のアルバム中、公開済みのみ表示");
        albums = albums.filter(album => album.isPublished === true);
        console.log("フィルタリング後:", albums.length, "個のアルバムを表示");
      } else if (req.isAuthenticated() && req.user.isAdmin) {
        console.log("管理者向け全アルバム表示:", albums.length, "個のアルバム");
      } else {
        // 管理画面だが管理者でない場合は403エラー
        return res.status(403).json({ message: "管理者権限が必要です" });
      }
      
      // アルバムごとの写真数を取得
      const albumsWithPhotoCount = await Promise.all(
        albums.map(async album => {
          const photos = await storage.getPhotosByAlbum(album.id);
          return {
            ...album,
            photoCount: photos.length
          };
        })
      );
      
      res.json(albumsWithPhotoCount);
    } catch (error) {
      console.error("アルバム一覧取得エラー:", error);
      res.status(500).json({ message: "Failed to fetch albums" });
    }
  });

  // Get album by ID
  app.get("/api/albums/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const album = await storage.getAlbum(id);
      
      if (!album) {
        return res.status(404).json({ message: "アルバムが見つかりません" });
      }
      
      // 管理者パスがあるか確認
      const path = req.headers.referer || '';
      const isAdminPath = path.includes('/admin/');
      console.log("アルバムAPI - リクエスト元URL:", path, "管理画面からのリクエスト:", isAdminPath);
      
      // 管理画面からのリクエスト以外、または非公開アルバムの場合
      if (!isAdminPath && album.isPublished !== true) {
        console.log("一般ページでの非公開アルバムアクセス制限");
        return res.status(404).json({ message: "アルバムが見つかりません" });
      } else if (isAdminPath && (!req.isAuthenticated() || !req.user.isAdmin)) {
        // 管理画面だが管理者でない場合は403エラー
        return res.status(403).json({ message: "管理者権限が必要です" });
      }
      
      res.json(album);
    } catch (error) {
      res.status(500).json({ message: "アルバムの取得に失敗しました" });
    }
  });
  
  // 複数アルバムの公開状態を一括更新
  app.patch("/api/albums/bulk-publish", async (req: Request, res: Response) => {
    // 管理者以外は操作不可
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(403).json({ message: "管理者権限が必要です" });
    }

    try {
      const { albumIds, isPublished } = req.body;
      
      if (!Array.isArray(albumIds) || albumIds.length === 0) {
        return res.status(400).json({ message: "有効なアルバムIDのリストが必要です" });
      }
      
      // 各アルバムを更新
      const results = [];
      for (const id of albumIds) {
        const album = await storage.getAlbum(id);
        if (album) {
          const updatedAlbum = await storage.updateAlbum(id, { ...album, isPublished });
          results.push(updatedAlbum);
        }
      }
      
      res.json({
        message: isPublished ? `${results.length}件のアルバムを公開しました` : `${results.length}件のアルバムを非公開にしました`,
        updatedCount: results.length
      });
    } catch (error) {
      console.error("アルバム一括更新エラー:", error);
      res.status(500).json({ message: "アルバムの一括更新に失敗しました" });
    }
  });

  // Update album
  app.patch("/api/albums/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const album = await storage.getAlbum(id);
      
      if (!album) {
        return res.status(404).json({ message: "アルバムが見つかりません" });
      }
      
      const { name, description, price } = req.body;
      
      // 更新可能なフィールドをチェック
      const updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (price !== undefined) updateData.price = Number(price);
      
      const updatedAlbum = await storage.updateAlbum(id, updateData);
      res.json(updatedAlbum);
    } catch (error) {
      console.error("Error updating album:", error);
      res.status(500).json({ message: "アルバムの更新に失敗しました" });
    }
  });
  
  // アルバムの公開状態を更新するエンドポイント
  app.post("/api/categories/:categoryId/albums/publish", async (req: Request, res: Response) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: "有効なカテゴリIDを指定してください" });
      }
      
      // カテゴリに属するすべてのアルバムを取得
      const albumList = await storage.getAlbumsByCategory(categoryId);
      
      if (!albumList || albumList.length === 0) {
        return res.status(404).json({ message: "カテゴリに属するアルバムが見つかりません" });
      }
      
      // アルバムごとに更新を実行
      const updatePromises = albumList.map(album => {
        return storage.updateAlbum(album.id, { isPublished: true });
      });
      
      await Promise.all(updatePromises);
      
      return res.status(200).json({ 
        message: "アルバムの公開設定が完了しました", 
        publishedCount: albumList.length 
      });
    } catch (error) {
      console.error("アルバム公開設定エラー:", error);
      res.status(500).json({ message: "アルバムの公開設定に失敗しました" });
    }
  });

  // Update album cover
  app.patch("/api/albums/:id/cover", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const album = await storage.getAlbum(id);
      
      if (!album) {
        return res.status(404).json({ message: "アルバムが見つかりません" });
      }
      
      const { coverImage } = req.body;
      if (!coverImage) {
        return res.status(400).json({ message: "カバー画像URLを指定してください" });
      }
      
      const updatedAlbum = await storage.updateAlbumCover(id, coverImage);
      res.json(updatedAlbum);
    } catch (error) {
      console.error("Error updating album cover:", error);
      res.status(500).json({ message: "カバー画像の更新に失敗しました" });
    }
  });
  
  // Update photos price (batch update)
  app.patch("/api/albums/:id/photos/price", async (req: Request, res: Response) => {
    try {
      const albumId = parseInt(req.params.id);
      const { photoIds, price } = req.body;
      
      if (!Array.isArray(photoIds) || typeof price !== 'number') {
        return res.status(400).json({ message: "無効なリクエストです。photoIdsは配列で、priceは数値である必要があります。" });
      }
      
      // アルバムが存在するか確認
      const album = await storage.getAlbum(albumId);
      if (!album) {
        return res.status(404).json({ message: "アルバムが見つかりません" });
      }
      
      // 写真が指定されていない場合は、アルバム内のすべての写真を取得
      let photoIdsToUpdate = photoIds;
      if (photoIdsToUpdate.length === 0) {
        const photos = await storage.getPhotosByAlbum(albumId);
        photoIdsToUpdate = photos.map(photo => photo.id);
      }
      
      // 写真の価格を更新
      const updatedPhotos = await storage.updatePhotosPrice(photoIdsToUpdate, price);
      
      res.json({
        success: true,
        updatedCount: updatedPhotos.length,
        photos: updatedPhotos
      });
    } catch (error) {
      console.error("写真価格更新エラー:", error);
      res.status(500).json({ message: "写真価格の更新に失敗しました" });
    }
  });

  // Get photos by album
  app.get("/api/albums/:id/photos", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // アルバム情報を取得して公開状態を確認
      const album = await storage.getAlbum(id);
      if (!album) {
        return res.status(404).json({ message: "アルバムが見つかりません" });
      }
      
      // 管理者パスがあるか確認
      const path = req.headers.referer || '';
      const isAdminPath = path.includes('/admin/');
      console.log("写真API - リクエスト元URL:", path, "管理画面からのリクエスト:", isAdminPath);
      
      // 一般ページでの非公開アルバムへのアクセス制限
      if (!isAdminPath && album.isPublished !== true) {
        console.log("一般ページでの非公開アルバムの写真アクセス制限");
        return res.status(404).json({ message: "アルバムが見つかりません" });
      } else if (isAdminPath && (!req.isAuthenticated() || !req.user.isAdmin)) {
        // 管理画面だが管理者でない場合は403エラー
        return res.status(403).json({ message: "管理者権限が必要です" });
      }
      
      // 写真を取得
      const photos = await storage.getPhotosByAlbum(id);
      res.json(photos);
    } catch (error) {
      console.error("写真取得エラー:", error);
      res.status(500).json({ message: "写真の取得に失敗しました" });
    }
  });
  
  // Delete photo
  app.delete("/api/photos/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const photo = await storage.getPhoto(id);
      
      if (!photo) {
        return res.status(404).json({ message: "写真が見つかりません" });
      }
      
      const success = await storage.deletePhoto(id);
      if (success) {
        res.status(200).json({ message: "写真を削除しました" });
      } else {
        res.status(500).json({ message: "写真の削除に失敗しました" });
      }
    } catch (error) {
      console.error("Error deleting photo:", error);
      res.status(500).json({ message: "写真の削除に失敗しました" });
    }
  });
  
  // Add a new API endpoint to manually generate album cover
  app.post("/api/albums/:id/generate-cover", async (req: Request, res: Response) => {
    try {
      const albumId = parseInt(req.params.id);
      const album = await storage.getAlbum(albumId);
      
      if (!album) {
        return res.status(404).json({ error: "アルバムが見つかりません" });
      }
      
      // Generate the album cover
      const updatedAlbum = await generateAlbumCover(albumId);
      
      if (!updatedAlbum) {
        return res.status(400).json({ error: "サムネイル生成に失敗しました。アルバムに写真がアップロードされていることを確認してください。" });
      }
      
      res.json({ 
        message: "サムネイルを生成しました", 
        album: updatedAlbum 
      });
    } catch (error) {
      console.error("Error generating cover:", error);
      res.status(500).json({ error: "Failed to generate cover" });
    }
  });

  // Get photo by ID
  app.get("/api/photos/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const photo = await storage.getPhoto(id);
      
      if (!photo) {
        return res.status(404).json({ message: "Photo not found" });
      }
      
      res.json(photo);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch photo" });
    }
  });

  // Upload a photo
  app.post("/api/albums/:id/photos/upload", upload.single("photo"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No photo uploaded" });
      }

      const albumId = parseInt(req.params.id);
      const album = await storage.getAlbum(albumId);
      
      if (!album) {
        return res.status(404).json({ error: "アルバムが見つかりません" });
      }
      
      // Generate thumbnails and watermarked versions
      const originalPath = req.file.path;
      const filename = path.basename(originalPath);
      const thumbnailPath = path.join(thumbnailsDir, filename);
      const watermarkedPath = path.join(watermarkedDir, filename);
      
      await createThumbnail(originalPath, thumbnailPath);
      await applyWatermark(originalPath, watermarkedPath);
      
      // Convert filesystem paths to URLs
      const originalUrl = `/uploads/${filename}`;
      const thumbnailUrl = `/uploads/thumbnails/${filename}`;
      const watermarkedUrl = `/uploads/watermarked/${filename}`;
      
      // Store photo information in database with filePath for thumbnail generation
      const photo = await storage.createPhoto({
        albumId,
        filename,
        originalUrl,
        thumbnailUrl,
        watermarkedUrl,
        price: parseInt(req.body.price) || 1200, // Default price
        metadata: {
          dateTaken: req.body.dateTaken || new Date().toISOString(),
          description: req.body.description || "",
          filePath: originalPath // Store the actual file path for cover generation
        },
      });
      
      // Check if this is the first photo and we need to generate a cover
      const photos = await storage.getPhotosByAlbum(albumId);
      if (photos.length === 1 && !album.coverImage) {
        // Generate the album cover in the background
        setTimeout(async () => {
          try {
            const updatedAlbum = await generateAlbumCover(albumId);
            console.log(`アルバム ${albumId} のサムネイル生成完了:`, updatedAlbum?.coverImage);
          } catch (error) {
            console.error(`アルバム ${albumId} のサムネイル生成エラー:`, error);
          }
        }, 500); // Small delay to not block the response
      }
      
      res.status(201).json(photo);
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Failed to upload photo" });
    }
  });

  // Get all orders (admin only)
  app.get("/api/admin/orders", async (req: Request, res: Response) => {
    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "注文の取得に失敗しました" });
    }
  });

  // Get orders by event ID
  app.get("/api/events/:id/orders", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const orders = await storage.getOrders();
      
      // イベントに関連するアルバムを取得
      const eventCategories = await storage.getCategoriesByEvent(id);
      const albumsForEvent: Record<number, boolean> = {};
      
      for (const category of eventCategories) {
        const albums = await storage.getAlbumsByCategory(category.id);
        for (const album of albums) {
          albumsForEvent[album.id] = true;
        }
      }
      
      // イベントに関連する注文のみをフィルタリング
      const filteredOrders = orders.filter(order => {
        try {
          const orderItems = order.items as any[];
          return orderItems.some(item => albumsForEvent[item.albumId]);
        } catch (e) {
          return false;
        }
      });
      
      res.json(filteredOrders);
    } catch (error) {
      res.status(500).json({ error: "イベントの注文取得に失敗しました" });
    }
  });

  // アルバム削除エンドポイント
  app.delete("/api/albums/:id", async (req: Request, res: Response) => {
    try {
      const albumId = parseInt(req.params.id);
      if (isNaN(albumId)) {
        return res.status(400).json({ message: "無効なアルバムIDです" });
      }

      // アルバムを取得
      const album = await storage.getAlbum(albumId);
      if (!album) {
        return res.status(404).json({ message: "アルバムが見つかりません" });
      }

      // アルバムの写真を取得
      const photos = await storage.getPhotosByAlbum(albumId);
      
      // 写真がある場合、全ての写真を削除
      for (const photo of photos) {
        await storage.deletePhoto(photo.id);
      }
      
      // アルバムを削除
      const success = await storage.deleteAlbum(albumId);
      
      if (success) {
        res.status(200).json({ message: `アルバム ${albumId} を削除しました` });
      } else {
        res.status(500).json({ message: "アルバムの削除に失敗しました" });
      }
    } catch (error) {
      console.error("アルバム削除エラー:", error);
      res.status(500).json({ message: "アルバムの削除に失敗しました" });
    }
  });

  // Serve uploaded files
  app.use("/uploads", express.static(uploadDir));
  app.use("/uploads/thumbnails", express.static(thumbnailsDir));
  app.use("/uploads/watermarked", express.static(watermarkedDir));

  // PayPal決済処理エンドポイント
  app.get("/api/paypal/setup", async (req: Request, res: Response) => {
    await loadPaypalDefault(req, res);
  });

  app.post("/api/paypal/order", async (req: Request, res: Response) => {
    await createPaypalOrder(req, res);
  });

  app.post("/api/paypal/order/:orderID/capture", async (req: Request, res: Response) => {
    await capturePaypalOrder(req, res);
  });

  // Stripe決済処理
  app.post("/api/create-payment-intent", async (req: Request, res: Response) => {
    try {
      const { amount } = req.body;
      
      console.log("=== STRIPE PAYMENT DEBUG ===");
      console.log("Payment intent request:", { amount, body: req.body });
      console.log("受信した金額の型:", typeof amount, "値:", amount);
      console.log("リクエストボディ全体:", JSON.stringify(req.body, null, 2));
      
      if (!amount || amount <= 0) {
        console.error("Invalid amount:", amount);
        return res.status(400).json({ message: "有効な金額を指定してください" });
      }

      // 日本円は整数のみ - そのまま使用（変換なし）
      const paymentAmount = Math.round(Number(amount));
      console.log("Stripeに送信する金額（JPY）:", paymentAmount);
      console.log("=== 金額処理詳細 ===");
      console.log("元の金額:", amount);
      console.log("Number変換後:", Number(amount));
      console.log("最終的なStripe送信金額:", paymentAmount);
      
      if (paymentAmount !== Number(amount)) {
        console.warn("金額が変換されました:", Number(amount), "->", paymentAmount);
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: paymentAmount,
        currency: "jpy",
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          source: "picstore_checkout"
        }
      });

      console.log("Payment intent created successfully:", paymentIntent.id);

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    } catch (error: any) {
      console.error("Payment intent creation error:", {
        message: error.message,
        type: error.type,
        code: error.code,
        statusCode: error.statusCode,
        stack: error.stack
      });
      res.status(500).json({ 
        message: "決済の準備中にエラーが発生しました: " + error.message 
      });
    }
  });

  // 注文作成エンドポイント
  app.post("/api/orders", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }

    try {
      const { paymentIntentId, amount, items } = req.body;
      
      console.log("注文作成リクエスト:", { 
        paymentIntentId, 
        amount, 
        items, 
        userId: req.user.id,
        user: req.user
      });

      // データの検証
      if (!amount || typeof amount !== 'number') {
        console.error("無効な金額:", amount);
        return res.status(400).json({ message: "無効な金額です" });
      }

      if (!items || !Array.isArray(items)) {
        console.error("無効なアイテムデータ:", items);
        return res.status(400).json({ message: "無効なアイテムデータです" });
      }

      const orderData = {
        customerEmail: req.user.username,
        customerName: req.user.displayName || req.user.username,
        totalAmount: amount,
        status: "completed",
        items: items, // 配列のまま渡す
      };

      console.log("ストレージに保存する注文データ:", orderData);
      
      const order = await storage.createOrder(orderData);

      console.log("注文作成完了:", order);
      res.json(order);
    } catch (error) {
      console.error("注文作成エラー詳細:", error);
      res.status(500).json({ message: "注文の作成に失敗しました", error: error.message });
    }
  });

  // ユーザーの注文履歴取得エンドポイント
  app.get("/api/orders", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "認証が必要です" });
    }

    try {
      const orders = await storage.getUserOrders(req.user.id);
      res.json(orders);
    } catch (error) {
      console.error("注文履歴取得エラー:", error);
      res.status(500).json({ message: "注文履歴の取得に失敗しました" });
    }
  });

  // 購入完了後のダウンロードエンドポイント
  app.get("/api/download/:type/:id", async (req: Request, res: Response) => {
    console.log("=== ダウンロードリクエスト受信 ===");
    console.log("パラメータ:", req.params);
    console.log("認証状況:", req.isAuthenticated());
    console.log("ユーザー:", req.user);

    if (!req.isAuthenticated()) {
      console.log("認証エラー: ユーザーが認証されていません");
      return res.status(401).json({ message: "認証が必要です" });
    }

    try {
      const { type, id } = req.params;
      const itemId = parseInt(id);
      
      console.log("ダウンロード対象:", { type, itemId });
      
      if (isNaN(itemId)) {
        console.log("エラー: 無効なID", id);
        return res.status(400).json({ message: "無効なIDです" });
      }
      
      // ユーザーがこのアイテムを購入しているかチェック
      const userOrders = await storage.getUserOrders(req.user.id);
      const hasAccess = userOrders.some(order => {
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        return order.status === 'completed' && items.some((item: any) => 
          item.type === type && item.itemId === itemId
        );
      });

      if (!hasAccess) {
        return res.status(403).json({ message: "このコンテンツへのアクセス権限がありません" });
      }
      
      if (type === "photo") {
        const photo = await storage.getPhoto(itemId);
        if (!photo) {
          return res.status(404).json({ message: "写真が見つかりません" });
        }
        
        const filePath = path.join(process.cwd(), photo.originalUrl);
        if (fs.existsSync(filePath)) {
          return res.download(filePath, photo.filename);
        } else {
          return res.status(404).json({ message: "ファイルが見つかりません" });
        }
      } else if (type === "album") {
        console.log("アルバムダウンロード処理開始:", itemId);
        const album = await storage.getAlbum(itemId);
        if (!album) {
          console.log("アルバムが見つかりません:", itemId);
          return res.status(404).json({ message: "アルバムが見つかりません" });
        }
        
        console.log("アルバム情報:", album);
        
        // アルバム内の全ての写真を取得
        const photos = await storage.getPhotosByAlbum(itemId);
        console.log("アルバム内の写真数:", photos.length);
        
        if (photos.length === 0) {
          console.log("アルバムに写真がありません:", itemId);
          return res.status(404).json({ message: "アルバムに写真がありません" });
        }
        
        // ZIPファイルとして返す
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        // エラーハンドリング
        archive.on('error', (err: any) => {
          console.error('ZIP作成エラー:', err);
          if (!res.headersSent) {
            res.status(500).json({ message: "ZIPファイルの作成に失敗しました" });
          }
        });

        archive.on('warning', (err: any) => {
          if (err.code === 'ENOENT') {
            console.warn('ZIP警告:', err);
          } else {
            console.error('ZIP致命的エラー:', err);
          }
        });
        
        const zipFilename = `${album.name.replace(/[^\w\s-]/g, '')}.zip`;
        console.log("ZIP ファイル名:", zipFilename);
        
        // レスポンスヘッダーを設定
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
        res.setHeader('Cache-Control', 'no-cache');
        
        archive.pipe(res);

        // 各写真をZIPに追加
        let addedFiles = 0;
        for (const photo of photos) {
          try {
            const originalPath = path.join(process.cwd(), photo.originalUrl);
            console.log("写真パス確認:", originalPath);
            
            if (fs.existsSync(originalPath)) {
              const filename = photo.filename.replace(/[^\w\s.-]/g, '');
              archive.file(originalPath, { name: filename });
              addedFiles++;

            } else {
              console.warn("ファイルが存在しません:", originalPath);
            }
          } catch (err) {
            console.error(`写真の追加エラー: ${photo.filename}`, err);
          }
        }


        
        archive.finalize();
      } else {
        return res.status(400).json({ message: "無効なリソースタイプです" });
      }
    } catch (error: any) {
      console.error("ダウンロードエラー:", error);
      res.status(500).json({ message: "ダウンロードに失敗しました" });
    }
  });

  // Googleログイン用のAPIエンドポイント
  app.post("/api/auth/google", async (req: Request, res: Response) => {
    try {
      const { email, displayName, uid } = req.body;
      
      if (!email || !displayName || !uid) {
        return res.status(400).json({ message: "必要な情報が不足しています" });
      }

      // 既存ユーザーをメールアドレスで検索
      let user = await storage.getUserByUsername(email);
      
      if (!user) {
        // 新規ユーザーを作成
        user = await storage.createUser({
          username: email,
          displayName: displayName,
          password: `google_${uid}`, // Googleユーザー用の特別なパスワード
          isAdmin: false
        });
      }

      // セッションにログイン
      req.login(user, (err) => {
        if (err) {
          console.error("セッション作成エラー:", err);
          return res.status(500).json({ message: "ログインに失敗しました" });
        }
        res.json(user);
      });
    } catch (error) {
      console.error("Googleログインエラー:", error);
      res.status(500).json({ message: "ログインに失敗しました" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
