# ShiftApp

シフト管理・給与計算・売上管理を行うWebアプリケーションです。
オーナー、管理者、従業員の利用を想定し、シフト作成、勤務時間集計、給与見込み、売上管理、人件費率、黒字・赤字判定を確認できます。

---

## 概要

ShiftAppは、店舗運営に必要なシフト管理と人件費管理をまとめて行うためのアプリです。
オーナーは売上や人件費を確認しながらシフトを作成でき、従業員は自分のシフトや給与見込みを確認できます。

主な目的は以下です。

* オーナーがシフト作成・売上入力・人件費確認を行えるようにする
* 従業員が自分の勤務予定と給与見込みを確認できるようにする
* 深夜勤務を含む給与計算を自動化する
* 週ごとの黒字・赤字判定を確認できるようにする
* PCとスマホの両方で使いやすいUIにする

---

## 使用技術

### Frontend

* React
* TypeScript
* Vite
* React Router
* Axios

### Backend

* Python
* FastAPI
* SQLAlchemy
* Uvicorn

### Database

* PostgreSQL
* ClickHouse Cloud PostgreSQL互換DB

### Deploy

* Frontend: Vercel
* Backend: Render

---

## ディレクトリ構成

```txt
Shiftapp/
├── backend/
│   ├── routers/
│   │   ├── owner.py
│   │   ├── salary.py
│   │   ├── sales.py
│   │   ├── shifts.py
│   │   └── users.py
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts
│   │   ├── components/
│   │   │   └── ShiftTimeline.tsx
│   │   ├── pages/
│   │   │   ├── EmployeeDashboard.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── OwnerDashboard.tsx
│   │   │   └── OwnerDashboard.css
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.ts
│
├── .gitignore
└── README.md
```

---

## 主な機能

### オーナー画面

* 月間売上合計の表示
* 月間人件費の表示
* 人件費率の表示
* 週ごとの黒字・赤字判定
* 売上入力
* シフト作成
* 紙のシフト表に近いタイムライン表示
* PC・スマホ両対応のレスポンシブUI

### 従業員画面

* 自分のシフト一覧表示
* 月間勤務時間表示
* 通常勤務時間表示
* 深夜勤務時間表示
* 給与対象額表示

### 給与計算

* 勤務時間の集計
* 深夜時間の集計
* 深夜割増を含む給与対象額の計算

### 売上・人件費管理

* 日別売上の登録
* 月間売上合計の集計
* 月間人件費の集計
* 人件費率の計算
* 週ごとの利益計算
* 黒字・赤字判定

---

## API一覧

| メソッド | パス                             | 内容             |
| ---- | ------------------------------ | -------------- |
| GET  | `/users/`                      | ユーザー一覧取得       |
| GET  | `/shifts/`                     | シフト一覧取得        |
| POST | `/shifts/`                     | シフト作成          |
| GET  | `/shifts/user/{user_id}`       | 指定ユーザーのシフト取得   |
| GET  | `/shifts/user/{user_id}/month` | 指定ユーザーの月間シフト取得 |
| GET  | `/salary/user/{user_id}/month` | 指定ユーザーの月間給与計算  |
| GET  | `/sales/`                      | 売上一覧取得         |
| POST | `/sales/`                      | 売上登録           |
| GET  | `/owner/dashboard/month`       | オーナー用月間集計      |
| GET  | `/owner/dashboard/week`        | オーナー用週間黒字・赤字判定 |

---

## ローカル環境での起動方法

### Backend

```bash
cd ~/OneDrive/Desktop/Shiftapp/backend
uvicorn main:app --reload
```

起動確認：

```txt
http://127.0.0.1:8000
```

Swagger UI：

```txt
http://127.0.0.1:8000/docs
```

---

### Frontend

別ターミナルで実行します。

```bash
cd ~/OneDrive/Desktop/Shiftapp/frontend
npm run dev
```

起動確認：

```txt
http://localhost:5173
```

---

## Frontendのビルド確認

```bash
cd ~/OneDrive/Desktop/Shiftapp/frontend
npm run build
```

成功すると以下のように表示されます。

```txt
✓ built in ...
```

---

## 環境変数

### Backend

Renderまたはローカルの `.env` に以下を設定します。

```env
DB_USER=postgres
DB_PASSWORD=自分のDBパスワード
DB_HOST=自分のDBホスト名
DB_PORT=5432
DB_NAME=postgres
```

### Frontend

Vercelまたはローカルの `.env` に以下を設定します。

```env
VITE_API_BASE_URL=https://shiftapp-alil.onrender.com
```

ローカル開発時は以下でも使用できます。

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

---

## Render Backend設定

Renderでは `backend` フォルダをWeb Serviceとして公開します。

### Root Directory

```txt
backend
```

### Build Command

```bash
pip install -r requirements.txt
```

### Start Command

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Environment Variables

```txt
DB_USER=postgres
DB_PASSWORD=自分のDBパスワード
DB_HOST=自分のDBホスト名
DB_PORT=5432
DB_NAME=postgres
```

### Backend 本番URL

```txt
https://shiftapp-alil.onrender.com
```

---

## Vercel Frontend設定

Vercelでは `frontend` フォルダを公開します。

### Root Directory

```txt
frontend
```

### Build Command

```bash
npm run build
```

### Output Directory

```txt
dist
```

### Environment Variables

```txt
VITE_API_BASE_URL=https://shiftapp-alil.onrender.com
```

---

## 本番URL

### Frontend

```txt
https://shift-app-r7j1-git-main-omochi05s-projects.vercel.app
```

HashRouterを使用している場合は、以下のURLで直接アクセスします。

### オーナー画面

```txt
https://shift-app-r7j1-git-main-omochi05s-projects.vercel.app/#/owner
```

### 従業員画面

```txt
https://shift-app-r7j1-git-main-omochi05s-projects.vercel.app/#/employee/2
```

### Backend

```txt
https://shiftapp-alil.onrender.com
```

---

## CORS設定

VercelのfrontendからRenderのbackendへアクセスするため、FastAPI側でCORS設定を行います。

開発中は以下のように全許可にしています。

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

本番運用では、以下のようにVercelのURLを指定する形に変更するのが望ましいです。

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://shift-app-r7j1-git-main-omochi05s-projects.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## GitHubへ反映する方法

```bash
cd ~/OneDrive/Desktop/Shiftapp
git status
git add .
git commit -m "Update app"
git push origin main
```

---

## 注意事項

`.env` にはDB接続情報やパスワードを含むため、GitHubにアップロードしないようにします。

`.gitignore` には以下を含めます。

```gitignore
.env
backend/.env
frontend/.env
node_modules/
frontend/node_modules/
__pycache__/
*.pyc
.venv/
venv/
dist/
frontend/dist/
```

---

## 今後追加したい機能

* ログイン認証
* JWTを使った認証・認可
* オーナー、管理者、従業員ごとの権限管理
* シフト編集・削除機能
* 売上編集・削除機能
* 103万円の壁の管理
* 深夜料金・手当の詳細設定
* 通知機能
* 自動シフト作成
* スマホ向けUIのさらなる改善
* PWA対応
* テストコード追加
* CI/CD整備

---

## 開発メモ

### Backend起動

```bash
cd ~/OneDrive/Desktop/Shiftapp/backend
uvicorn main:app --reload
```

### Frontend起動

```bash
cd ~/OneDrive/Desktop/Shiftapp/frontend
npm run dev
```

### Frontendビルド確認

```bash
cd ~/OneDrive/Desktop/Shiftapp/frontend
npm run build
```

### Render本番起動コマンド

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

### GitHub反映

```bash
cd ~/OneDrive/Desktop/Shiftapp
git status
git add .
git commit -m "変更内容を書く"
git push origin main
```

---

## 補足

このアプリは現在開発中です。
今後、認証機能や権限管理、自動シフト作成機能を追加して、実運用に近い形へ改善していく予定です。
