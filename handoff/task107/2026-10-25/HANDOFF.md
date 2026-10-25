# 引き継ぎの現在地
## 客観的な評価
今は移行しやすい区切りです。直前の試験は残存回収・専用close・Mac保全が完了し、台帳はseq23/active0です。
次の修正候補はコードレビュー、Main隔離差分26件、実原本のnonmutation preflightまで完了し、主担当が証拠受領・合格を確認しています。
予算条件により実発行は不可です。プロジェクト全体の試験成功・完了ではありません。
今の移行は稼働中の試験を中断して引き継ぐ場合より扱いやすい、という評価です。全AWS資源の最新不存在を今回あらためて照会したという意味ではありません。

## 担当
Replitの既存Media Marketplace Main Agentが設計・修正担当。Mac mini上のCodexが実操作・原本照合担当です。
同じReplitプロジェクトと同じAWSアカウント・東京リージョンのCloudShell HOMEを継続します。
新しいCloudShell環境を別アカウントに作る操作や旧試験の再実行は不要です。

## 完了したこと
- 正式seq23-next-review packet: 172685 bytes / 28 pins、SHAはSTATUS.json。
- 新source891件と宣言された差分が完全一致。
- Main隔離26件成功: runtime13、親7、vendor2、vendor拒否2、接続2。
- 実configure→inspect_inputs成功。実prepare・issue・runは未実施。
- 私有33JSONとanchorの集合・SHA不変。
- 新vendorはcryptography50.0.2、565files、ELF要求GLIBC最大2.17。RFC8032検証と改変拒否成功。
- 実Lambda上での動作確認は未実施。
- 初回readelf不足、Mainのfixture引数誤指定は失敗ログを保持し、是正後の成功と区別。

## 厳守
予算上限を変更しない。新予約・実issue・run・setup・StartBuildを行わない。
成功済み26件や旧suite、回収、closeを反復しない。
署名・時刻・一回性・40call枠・ready120秒・firstmutation60秒のguardを独断で変更しない。
金融本文・署名鍵・認証情報をGitHub/Replitへ送らない。private-transferは丸ごとGitHubへ載せない。
Mac miniのログイン・ブラウザー接続・filesystem権限は本人が必要な範囲で設定する。旧Macの許可やタブIDは新Macに持ち越せる前提にしない。

## Mac miniでの再開
1. private-transferを安全なローカル場所へコピー。旧Macの原本は残す。
2. ターミナルで python3 -B verify_handoff.py private-transfer を実行し、全ファイル一致を確認。
3. Codex・Chrome・Replit・AWSに本人がログイン。既存Mainプロジェクトと同じCloudShell HOMEを選ぶ。
4. 最新チャットとCloudShell HOMEのstatusを読み、seq23/active0と未発行を確認する。矛盾したら実行せず証拠を読む。
5. Mac miniの保存先を登録する。旧Macの絶対パスをそのまま存在すると仮定しない。
6. 予算変更なし・新予約等禁止を維持し、受領確認で引き継ぎを完了する。新しい実試験は開始しない。
7. 旧Macの監視を停止した状態で、必要な場合のみ新Mac側へ監視を設定する。両端末で同時操作しない。

## GitHubに置くもの
この説明書、再開プロンプト、機密を除いた状態、将来レビュー済みコードを置く運用が適します。
ログインセッション・端末権限・私有台帳・大容量アーカイブはGitHub同期と別です。
GitHubは通常ファイル100MiB超を拒否し、バックアップ用途を目的としていません。
https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github
