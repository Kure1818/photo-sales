# #107 Mac miniへの引き継ぎ
作業の現在地と再開手順を、端末が変わっても参照するための資料です。
これは**稼働中アプリの新版への置換や、実試験の実行許可ではありません**。

1. [現在地・禁止事項](HANDOFF.md)を読む。
2. [初心者向けの別送・再開手順](TRANSFER_GUIDE.md)に沿って私有データをMac miniへ移す。
3. [再開プロンプト](RESUME_PROMPT.md)をMac mini側のCodexに渡す。
4. 受領・照合・ログインを確認する。予算条件が未解決のため、新予約・実issue/runはしない。

[STATUS.json](STATUS.json)は機密を含まない状況の要約です。
このGitHubには私有台帳・予算具体額・認証情報・秘密鍵・保全ZIP・大容量データを載せていません。
このリポジトリの既存アプリがReplitの最新コードと一致するとは仮定しません。
既存Mainプロジェクトと別送の固定packetを正式な再開資料として確認してください。

## コード
[code/seq23-reviewed](code/seq23-reviewed)には、検査済み候補から私有値を含まないhelper/testだけを原文で収録しました。
[CODE-MANIFEST.json](CODE-MANIFEST.json)で原packetとのSHAを照合できます。
完全な固定packetは別送データ内にあります。これらのhelperだけで本番実行する構成ではありません。
Linux x86_64用検査は従来のCloudShellで行います。Mac miniのARM環境へ同じruntimeを直接実行しません。

## 公開範囲
この追加は引き継ぎ専用ディレクトリだけです。既存アプリ・デプロイ設定・予算・AWSは変更しません。
公開リポジトリなので、新しい記録を足す場合も台帳や識別情報を混ぜないでください。
