// Firebase設定は後で有効化予定
// import { initializeApp } from "firebase/app";
// import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

// const firebaseConfig = {
//   apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
//   authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
//   projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
//   storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
//   appId: import.meta.env.VITE_FIREBASE_APP_ID,
// };

// Firebase初期化
// const app = initializeApp(firebaseConfig);
// export const auth = getAuth(app);

// Google認証プロバイダー（後で有効化予定）
// const googleProvider = new GoogleAuthProvider();
// googleProvider.addScope('email');
// googleProvider.addScope('profile');

// Googleでログイン（後で有効化予定）
export const signInWithGoogle = async () => {
  throw new Error("Firebase設定が完了していません。後で有効化予定です。");
  // try {
  //   const result = await signInWithPopup(auth, googleProvider);
  //   return result.user;
  // } catch (error) {
  //   console.error("Google認証エラー:", error);
  //   throw error;
  // }
};

// ログアウト（後で有効化予定）
export const firebaseSignOut = async () => {
  throw new Error("Firebase設定が完了していません。後で有効化予定です。");
  // try {
  //   await signOut(auth);
  // } catch (error) {
  //   console.error("ログアウトエラー:", error);
  //   throw error;
  // }
};