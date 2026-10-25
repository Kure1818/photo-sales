# Mac miniへの移し方（初心者向け）
## 1. GitHubとは別に移すフォルダ
旧MacのFinderで、Codexが作成した **mac-mini-handoff-20261025** フォルダを開きます。
これは約693MBの一式です。中のprivate-transferには私有データがあります。
このフォルダ全体をGitHubへアップロードせず、外付けSSD/USBメモリ等で本人のMac miniへコピーします。

## 2. 外付けSSDでコピーする方法
1. 旧Macに外付けSSDをつなぐ。
2. mac-mini-handoff-20261025フォルダをSSDへドラッグして**コピー**する。元のフォルダは消さない。
3. コピー完了後にSSDを取り出す。
4. Mac miniにSSDをつなぐ。
5. 同じフォルダをMac miniの「書類」等の本人だけが使う場所へコピーする。
6. 中に START-HERE.md、verify_handoff.py、github-ready、private-transfer があることを確認する。
AirDropを使う場合も一式を本人のMac miniへ送り、受領後に同じ照合を行います。公開リンクの共有は不要です。

## 3. Mac miniで確認すること
1. Codex、Chromeを開き、本人のアカウントへログインする。
2. Codexにコピーしたフォルダを作業場所として開かせる。
3. RESUME_PROMPT.mdの文章を渡す。最初にSHA照合だけを依頼する。
4. Python3が利用できる場合、フォルダ内で次を実行すると読み取り専用で照合できる。
   `python3 -B verify_handoff.py private-transfer`
5. 「HANDOFF VERIFIED」が出ることを確認する。不一致なら試験を始めず、旧Macの原本と照合する。
6. 既存のReplit Mainプロジェクトと、同じAWSアカウント・東京のCloudShell HOMEへ本人がログインする。
7. Mac mini側の保存先とブラウザー操作接続を確認する。
8. 現在地・禁止事項・受領照合が一致したとCodexに報告させる。新しい試験は始めない。

## 4. 移行後も守ること
- 予算上限変更・新予約・実issue/runは許可されていません。
- 検査済み26件や旧close/回収は繰り返しません。
- パスワード、OTP、秘密鍵、ブラウザーのログイン情報をGitHubへ書き込みません。
- 旧Macの定期監視は移行のため一時停止済みです。勝手に両Macで同時操作しません。
- Mac miniでの受領確認が済むまで、旧MacやSSDの原本は消しません。
- 端末移行の完了は、実試験の実行許可とは別です。
