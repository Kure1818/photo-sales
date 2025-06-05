import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    // ドット区切りのチェック（ハッシュ.ソルト）
    if (!stored.includes('.')) {
      console.error('パスワードフォーマットエラー: ソルトが見つかりません');
      return false;
    }
    
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    
    // バッファー比較（タイミング攻撃を防ぐ）
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error('パスワード比較中にエラーが発生しました:', error);
    return false; // エラーの場合は比較失敗
  }
}

export async function setupAuth(app: Express) {
  const sessionSecret = process.env.SESSION_SECRET || "picstore-session-secret";
  
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: true, // 毎回セッションを保存
    saveUninitialized: true, // 未初期化セッションも保存する
    store: storage.sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30日間
      sameSite: 'lax',
      httpOnly: true,
      secure: false, // 開発環境でも動作するようfalseに設定
      path: '/'
    },
    name: 'fit-create.sid' // セッションクッキーに明示的な名前を設定
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`ログイン試行 - ユーザー名: ${username}`);
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          console.log(`ユーザーが見つかりません: ${username}`);
          return done(null, false, { message: 'ユーザーが見つかりません' });
        }
        
        console.log(`ユーザーが見つかりました: ${username}`);
        // パスワード比較
        const isPasswordValid = await comparePasswords(password, user.password);
        console.log(`パスワード検証結果: ${isPasswordValid ? '成功' : '失敗'}`);
        
        if (!isPasswordValid) {
          return done(null, false, { message: 'パスワードが一致しません' });
        }
        
        // 認証成功
        return done(null, user);
      } catch (err) {
        console.error('認証エラー:', err);
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log("シリアライズするユーザー:", user);
    // ユーザーオブジェクト全体ではなく、IDとisAdminフラグを保存
    return done(null, {
      id: user.id,
      isAdmin: user.isAdmin === true
    });
  });
  
  passport.deserializeUser(async (data: {id: number, isAdmin: boolean}, done) => {
    try {
      console.log("デシリアライズするデータ:", data);
      const user = await storage.getUser(data.id);
      if (!user) {
        console.log("ユーザーが見つかりません:", data.id);
        return done(null, false);
      }
      
      // isAdminフラグが保存されていたらそれを優先して使用
      if (data.isAdmin) {
        user.isAdmin = true;
      }
      
      console.log("デシリアライズしたユーザー:", user);
      return done(null, user);
    } catch (err) {
      console.error("デシリアライズエラー:", err);
      return done(err);
    }
  });

  // 認証エンドポイント
  app.post("/api/login", (req, res, next) => {
    console.log("ログイン試行:", req.body);
    passport.authenticate("local", (err: any, user: SelectUser | false, info: any) => {
      if (err) {
        console.error("認証エラー:", err);
        return next(err);
      }
      if (!user) {
        console.log("認証失敗:", info);
        return res.status(401).json({ error: "ユーザー名またはパスワードが正しくありません" });
      }
      
      // ユーザーをログイン状態にする（セッションにユーザー情報を保存）
      req.login(user, (loginErr: any) => {
        if (loginErr) {
          console.error("ログインエラー:", loginErr);
          return next(loginErr);
        }
        
        // Force set the admin flag if needed
        if (user.isAdmin) {
          // セッションデータを拡張
          (req.session as any).isAdmin = true;
        }
        
        // セッションを確実に保存
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("セッション保存エラー:", saveErr);
            return next(saveErr);
          }
          
          // ログイン成功時に返すユーザー情報
          const userData = {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            isAdmin: user.isAdmin
          };
          
          console.log("ログイン成功:", userData);
          console.log("セッションID:", req.sessionID);
          console.log("セッション情報:", req.session);
          console.log("認証状態:", req.isAuthenticated());
          
          return res.status(200).json(userData);
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    console.log("ログアウト試行 - セッション:", req.session);
    req.logout((err) => {
      if (err) {
        console.error("ログアウトエラー:", err);
        return next(err);
      }
      
      req.session.destroy((err) => {
        if (err) {
          console.error("セッション破棄エラー:", err);
          return next(err);
        }
        res.clearCookie('fit-create.sid');
        console.log("ログアウト成功");
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", (req, res) => {
    console.log("GET /api/user - 認証状態:", req.isAuthenticated());
    console.log("GET /api/user - セッションID:", req.sessionID);
    console.log("GET /api/user - セッション内容:", req.session);
    
    // セッションの有効性を確認
    if (!req.session || !req.sessionID) {
      console.log("セッションが存在しないか無効です");
      return res.status(401).json({ error: "セッションが無効です" });
    }
    
    if (!req.isAuthenticated()) {
      console.log("未認証ユーザー");
      return res.status(401).json({ error: "認証されていません" });
    }
    
    console.log("GET /api/user - ユーザー情報:", req.user);
    
    // ユーザー情報をセッションに再保存して確実に維持
    req.session.touch();
    req.session.save((err) => {
      if (err) {
        console.error("セッション保存エラー:", err);
      }
      
      // パスワードを除外し、displayNameを含めたユーザー情報を返す
      res.json({
        id: req.user!.id,
        username: req.user!.username,
        displayName: req.user!.displayName || req.user!.username.split('@')[0],
        isAdmin: req.user!.isAdmin,
        createdAt: req.user!.createdAt
      });
    });
  });

  // 一般ユーザー登録エンドポイント
  app.post("/api/register", async (req, res, next) => {
    try {
      // サーバー側でのバリデーション
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(req.body.username)) {
        return res.status(400).json({ error: "有効なメールアドレスを入力してください" });
      }
      
      if (req.body.password.length < 8) {
        return res.status(400).json({ error: "パスワードは8文字以上入力してください" });
      }
      
      if (!req.body.displayName || req.body.displayName.length < 2) {
        return res.status(400).json({ error: "名前は2文字以上入力してください" });
      }

      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ error: "このユーザー名は既に使用されています" });
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      // 自動ログイン処理
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({
          id: user.id,
          username: user.username,
          isAdmin: user.isAdmin,
          message: "会員登録が完了しました。自動的にログインします。"
        });
      });
    } catch (err) {
      next(err);
    }
  });

  // 管理者専用アカウント作成エンドポイント
  app.post("/api/admin/register", async (req, res, next) => {
    // 管理者権限確認
    if (!req.isAuthenticated() || !req.user!.isAdmin) {
      return res.status(403).json({ error: "管理者権限が必要です" });
    }

    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ error: "このユーザー名は既に使用されています" });
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      res.status(201).json({
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin
      });
    } catch (err) {
      next(err);
    }
  });
}