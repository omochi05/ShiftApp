### react実行手順
1.npm install
2.npm start

## 1.タスク管理 (Notion)

「ステータス更新」と **「タスクページの確認」** を忘れないこと。

### ステータス運用

- 未着手: 着手前の状態
- 進行中: 作業を開始したら更新
- レビュー: PRを作成したタイミングで更新
- 完了: マージされた時点更新、操作不要

## 2.ブランチの切り方

ブランチは「Notionのタスク単位」で作成する。
命名は「タスクID-種類-概要」の順で統一する。

### 命名規則

- <タスクID(数字の部分)>-<種類>-<概要>
- 例：
    - 49-feature-user_login_flow
    - 120-fix-api_timeout_retry
- 種類:
    - feature: 機能
    - fix: バグ修正
    - docs: ドキュメント
    - chore: 設定・雑務

### 作成手順

1. Notionのタスクページを確認
2. 開発ブランチを最新化
    - `git checkout develop`
    - `git pull`
3. タスクブランチを作成
    - `git checkout -b <タスクID>-<種類>-<概要>`
    - 例: `git checkout -b 49-feature-user_login_flow`

## 3.コミットの仕方

小さく、意味のある単位で「コツコツ」コミット
メッセージは一貫した形式で、後から履歴を追いやすく

### 命名規則

- <種別>: <概要 (日本語)>
- 種別は英語で固定 (feat, fix, docs, refactor, test, chore)
- 概要は簡潔な日本語で1文
- 例：`feat: ユーザーログインフローを実装`

### 種別ごとのコミット内容の基準

- feat (機能追加)
- fix (不具合修正)
- docs (ドキュメント)
- refactor (リファクタ)
- test (テスト)
- chore (雑務・設定)

## 4.プルリクエスト (PR) の作成

Notionのタスクが完了 (実装と自己確認済み) したらPRを作成

### 作成ルール

- 対象ブランチ: `develop`へ向けて作成する
- タイトル: 「タスクID (例:pom-49) + 概要 (日本語)」を含める
- 説明 (PR本文) に含める項目
    - 変更点 (なにを、どこを、どのように変更したか)
- Reviewers: `pomeeeeeeeene`を追加する
- Assignees: 作成者本人を選択する

### 作業手順 (GitHub)

1. ブランチをプッシュする
    - `git push -u origin <タスクID>-<種類>-<概要>`
2. GitHubでPRを作成
    - リポジトリページ -> "Compare & pull request" をクリック
3. 上記の作成ルールに従う

### merge手順
git checkout {マージ元}
git pull
git checkout {マージ先ブランチ}
git merge {merge元}