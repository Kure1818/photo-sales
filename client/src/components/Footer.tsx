import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-primary text-white mt-12">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">PIC'store</h3>
            <p className="text-gray-300">
              プロフェッショナルなイベント写真を簡単に管理・販売できるマーケットプレイスプラットフォーム。
            </p>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4">リンク</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-300 hover:text-accent transition-colors">
                  ホーム
                </Link>
              </li>
              <li>
                <Link href="/upload" className="text-gray-300 hover:text-accent transition-colors">
                  写真家の方へ
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-300 hover:text-accent transition-colors">
                  イベント主催者の方へ
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-300 hover:text-accent transition-colors">
                  料金プラン
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-300 hover:text-accent transition-colors">
                  お問い合わせ
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4">お問い合わせ</h3>
            <p className="text-gray-300 mb-2">
              ご質問やサポートが必要な場合は、お気軽にお問い合わせください。
            </p>
            <a href="mailto:info@picstore.jp" className="text-accent hover:underline">
              info@picstore.jp
            </a>
            <div className="mt-4">
              <p className="text-sm text-gray-400">SNSでフォローしてください</p>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-6 text-sm text-gray-400">
          <p>© 2023 FIT-CREATE. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
