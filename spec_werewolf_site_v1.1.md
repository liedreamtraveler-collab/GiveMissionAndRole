# 役職・お題ランダム決定サイト 要件定義書 v1.1

> ゲーム：人狼オマージュ型 ロール＆ミッション抽選システム
> 作成日：2026-03-17
> 対象開発プラットフォーム：Antigravity（Google製 AIエージェント型自律開発プラットフォーム）

---

## 0. Antigravity向け実装ガイドライン

本仕様書はAIエージェントが計画・実装・検証を自律的に行うことを前提として記述する。以下の方針に従うこと。

- **曖昧な表現を排除**：各機能は入力・処理・出力の3点セットで記述する
- **フェーズ順に実装**：§11の開発フェーズを上から順に完了させること
- **検証ポイントを明記**：各フェーズに受け入れテストを設けている
- **確認待ち事項はゼロ**：本書v1.1の時点で未確定事項は存在しない

---

## 1. プロジェクト概要

### 1.1 目的

人狼ゲームをオマージュしたリアル／オンライン会話ゲームにおいて、**全員共通のミッション**と**個人ごとのロール**をランダムかつ公平に割り振るWebアプリケーション。ホストが自分のPCでサーバーを起動し、同一ネットワーク上のプレイヤーがブラウザでアクセスして利用する。

### 1.2 想定利用シーン

| 項目 | 内容 |
|------|------|
| プレイ人数 | 3〜15人程度 |
| 利用環境 | 同一LAN / ローカルIPでのアクセス |
| ホスト機器 | Windows / Mac PC |
| プレイヤー機器 | スマートフォン・PC（ブラウザ） |

---

## 2. 技術スタック

| レイヤー | 技術 | バージョン | 理由 |
|----------|------|-----------|------|
| バックエンド | Node.js | 20 LTS | ローカルサーバー起動 |
| Webフレームワーク | Express | 4.x | HTTPサーバー + 静的配信 |
| リアルタイム通信 | Socket.io | 4.x | 接続管理・個別チャンネル配信 |
| フロントエンド | Vite + TypeScript | 5.x | バンドル・型安全 |
| アニメーション | GSAP | 3.x | 高性能アニメーション |
| パーティクル | tsParticles | 2.x | 背景エフェクト |
| 入力サニタイズ | he | 1.x | XSS対策 |
| パッケージ管理 | npm | - | - |

### 2.1 ディレクトリ構成

```
project-root/
├── server/
│   ├── index.ts            # Express + Socket.io サーバー本体
│   ├── gameManager.ts      # ゲームステート管理
│   ├── sessionManager.ts   # セッション・再接続管理
│   └── types.ts            # 型定義（全体共通）
├── client/
│   ├── index.html
│   ├── src/
│   │   ├── main.ts
│   │   ├── socket.ts       # Socket.io クライアント
│   │   ├── state.ts        # クライアントサイドのUI状態管理
│   │   ├── pages/
│   │   │   ├── home.ts     # ホーム画面ロジック
│   │   │   └── result.ts   # リザルト画面ロジック
│   │   ├── ui/
│   │   │   ├── box.ts      # ミッション/ロールボックスコンポーネント
│   │   │   ├── preset.ts   # プリセット管理UI
│   │   │   ├── toast.ts    # トースト通知
│   │   │   └── modal.ts    # モーダルダイアログ
│   │   └── animation/
│   │       ├── background.ts   # パーティクル背景
│   │       ├── lottery.ts      # 抽選アニメーション（GSAP）
│   │       └── transition.ts   # 画面遷移アニメーション
│   └── styles/
│       ├── global.css
│       ├── variables.css   # CSS カスタムプロパティ
│       ├── home.css
│       ├── result.css
│       └── animations.css
├── shared/
│   └── events.ts           # Socket.ioイベント名の定数定義（サーバー/クライアント共用）
├── package.json
├── tsconfig.json
└── README.md
```

### 2.2 起動コマンド

```bash
# 依存インストール（初回のみ）
npm install

# 本番起動
npm run start
# → http://localhost:3000 でアクセス可
# → LAN内は http://<ホストのローカルIP>:3000

# 開発モード（ホットリロード）
npm run dev
```

README.md には上記コマンドと「ローカルIPの確認方法（Windows: ipconfig / Mac: ifconfig）」を記載すること。

---

## 3. 画面遷移図

```
[ホーム画面: LOBBY]
  │ ゲーム開始ボタン押下（ホストのみ）
  ▼
[抽選アニメーション画面: LOTTERY]  ← 全員同時に表示
  │ アニメーション完了
  ▼
[リザルト画面: RESULT]
  │ 戻るボタン押下
  ▼
[ホーム画面: LOBBY]  ← ゲームステートリセット済み
```

---

## 4. サーバーサイド設計

### 4.1 型定義（server/types.ts）

```typescript
export type GamePhase = 'LOBBY' | 'LOTTERY' | 'RESULT';

export type UserRole = 'HOST' | 'PLAYER';

export interface PlayerInfo {
  socketId: string;
  sessionId: string;        // 再接続識別用の永続ID（クライアントがlocalStorageに保存）
  role: UserRole;
  connected: boolean;       // 現在接続中か
  assignedRole: string | null;  // 抽選で割り振られたロール
  phase: GamePhase;         // 切断時点のフェーズ（復帰画面判定に使用）
}

export interface GameState {
  phase: GamePhase;
  missions: string[];       // ミッションボックスの内容
  roles: string[];          // ロールボックスの内容
  selectedMission: string | null;
  players: Map<string, PlayerInfo>;  // sessionId → PlayerInfo
  participantSnapshot: string[];     // 抽選対象として確定したsessionIdの配列
  presets: Preset[];        // プリセット一覧（永続化はサーバー側ファイル or メモリ）
}

export interface Preset {
  id: string;
  name: string;
  missions: string[];
  roles: string[];
  createdAt: number;
}
```

### 4.2 セッション管理（server/sessionManager.ts）

#### セッションIDの発行・識別

- クライアントは初回接続時にサーバーから `sessionId`（UUID v4）を受け取り、`localStorage` に保存する
- 再接続時はクライアントが保存済みの `sessionId` を接続時ペイロードに含めて送信する
- サーバーは受信した `sessionId` でプレイヤー情報を検索し、存在すれば「再接続」として処理する

#### 接続フロー

```
クライアント接続
  └→ sessionId をペイロードに含めて socket.handshake.auth.sessionId として送信

サーバー受信
  ├→ sessionId が未知 または 未送信
  │    └→ 新規プレイヤーとして登録
  │       - 先着1人目: role = 'HOST'
  │       - 2人目以降: role = 'PLAYER'
  │       - 新しい sessionId を発行して返す
  └→ sessionId が既知（再接続）
       └→ §4.3 の再接続処理へ
```

#### 切断フロー

```
socket 'disconnect' イベント
  └→ 該当プレイヤーの connected = false に更新
  └→ players から削除せず Map に保持（再接続待機）
  └→ 全員に lobby:update を送信（切断者は "復帰待ち" として含める）
  └→ HOSTが切断した場合:
       - 接続中プレイヤーの中で最古の接続者に role = 'HOST' を付与
       - 全員に host:changed イベントを送信
```

### 4.3 再接続処理

```
再接続受信（既知のsessionId）
  ├→ PlayerInfoのsocketIdを新しいsocketIdに更新
  ├→ connected = true に更新
  └→ 再接続時点のGameStateのphaseによって分岐：

  フェーズ = LOBBY
    └→ 通常の参加者として扱う
    └→ lobby:update を全員に送信

  フェーズ = LOTTERY
    ├→ 抽選対象だった場合（participantSnapshotに含まれる）:
    │    └→ 個別に lottery:rejoin を送信
    │       ペイロード: { mission, role }（切断前に確定していたデータ）
    └→ 抽選対象外だった場合:
         └→ lottery:no_role を送信

  フェーズ = RESULT
    ├→ 抽選対象だった場合:
    │    └→ result:rejoin を送信
    │       ペイロード: { mission, role }
    └→ 抽選対象外だった場合:
         └→ result:no_role を送信
```

#### 復帰ボタンの表示ロジック（クライアント側）

```
result:rejoin または lottery:rejoin を受信
  └→ 通常のリザルト/抽選画面を表示（再接続前と同一の画面）
  └→ 画面上部に「ゲームに復帰しました」バナーを3秒間表示
```

ホーム画面での切断者表示：

```
lobby:update のペイロード例:
{
  userCount: 4,        // 接続中 + 復帰待ち の合計
  connected: 3,        // 現在接続中
  reconnecting: 1      // 復帰待ち（切断中）
}

UI表示例:
「4人参加中（1人復帰待ち）」
```

新規接続者が来たとき、その sessionId がすでに LOTTERY/RESULT フェーズのスナップショットに含まれる場合（= 復帰）：

```
ホーム画面にボタンを2つ表示：
  [▶ ゲーム開始]  ← HOSTのみ表示・かつ LOBBY フェーズの場合のみ
  [↩ ゲームに復帰]  ← 抽選済みの自分のリザルト画面へジャンプ
```

---

## 5. ゲームロジック（server/gameManager.ts）

### 5.1 ゲーム開始処理

```
game:start イベント受信
  ├→ 送信者の role が 'HOST' でない場合 → game:error を送信者に返す
  ├→ バリデーション実行（§6.3）
  │    └→ エラーあり → game:error を送信者に返す
  └→ バリデーション通過
       ├→ phase = 'LOTTERY' に変更
       ├→ 接続中の connected = true のプレイヤーをスナップショットとして固定
       │    └→ participantSnapshot = [...接続中のsessionId]
       ├→ 全員に game:phase { phase: 'LOTTERY' } を送信
       └→ 500ms後に抽選ロジック実行（§5.2）
```

### 5.2 抽選ロジック

```typescript
function runLottery(state: GameState): void {
  // 1. ミッションをランダムに1つ選択
  const mission = state.missions[
    Math.floor(Math.random() * state.missions.length)
  ];
  state.selectedMission = mission;

  // 2. ロールをFisher-Yatesシャッフル
  const shuffledRoles = [...state.roles];
  for (let i = shuffledRoles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledRoles[i], shuffledRoles[j]] = [shuffledRoles[j], shuffledRoles[i]];
  }

  // 3. 参加者スナップショットをシャッフル
  const shuffledParticipants = [...state.participantSnapshot];
  for (let i = shuffledParticipants.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledParticipants[i], shuffledParticipants[j]] =
      [shuffledParticipants[j], shuffledParticipants[i]];
  }

  // 4. ロールを参加者に1対1でマッピング・保存
  shuffledParticipants.forEach((sessionId, i) => {
    const player = state.players.get(sessionId);
    if (player) player.assignedRole = shuffledRoles[i];
  });

  // 5. 全員にミッション送信
  io.emit('lottery:mission', { mission });

  // 6. 接続中の参加者に個別ロール送信
  //    切断中の参加者は再接続時に §4.3 で送信
  shuffledParticipants.forEach((sessionId) => {
    const player = state.players.get(sessionId);
    if (player && player.connected) {
      io.to(player.socketId).emit('lottery:role', { role: player.assignedRole });
    }
  });

  // 7. スナップショット外の接続者に通知
  state.players.forEach((player, sessionId) => {
    if (!state.participantSnapshot.includes(sessionId) && player.connected) {
      io.to(player.socketId).emit('lottery:no_role');
    }
  });
}
```

### 5.3 ゲームリセット処理

```
game:reset イベント受信（HOSTのみ受け付ける）
  └→ GameState を初期化
       - phase = 'LOBBY'
       - selectedMission = null
       - participantSnapshot = []
       - 各プレイヤーの assignedRole = null
       - missions / roles / presets は保持
  └→ 全員に game:phase { phase: 'LOBBY' } を送信
```

---

## 6. 機能要件

### 6.1 ミッションボックス

| 操作 | トリガー | 処理 |
|------|---------|------|
| 追加 | 「＋追加」ボタン or Enter キー | 入力値をトリミング・空文字チェック後リストに追加 |
| 削除 | 各アイテムの「×」ボタン | 該当インデックスを配列から除去 |
| 編集 | 各アイテムをダブルクリック | インライン `<input>` に切り替え、フォーカスアウトで確定 |
| 並び替え | ドラッグ＆ドロップ | HTML5 DragAPI でリスト内順序変更 |
| 永続化 | 変更のたびに | `localStorage` キー `"missions"` に JSON で保存 |

### 6.2 ロールボックス

| 操作 | トリガー | 処理 |
|------|---------|------|
| 追加 | 「＋追加」ボタン or Enter キー | 入力値をトリミング・空文字チェック後リストに追加 |
| 削除 | 各アイテムの「×」ボタン | 該当インデックスを配列から除去 |
| 編集 | 各アイテムをダブルクリック | インライン `<input>` に切り替え、フォーカスアウトで確定 |
| 並び替え | ドラッグ＆ドロップ | HTML5 DragAPI でリスト内順序変更 |
| 永続化 | 変更のたびに | `localStorage` キー `"roles"` に JSON で保存 |
| カウント表示 | 常時 | 「ロール {n}件 / 現在 {m}人接続中」を表示 |

### 6.3 バリデーション（ゲーム開始時）

以下を順に検証し、最初のエラーで処理を停止してクライアントに通知する。

| チェック順 | 条件 | エラーコード | エラーメッセージ（日本語） |
|-----------|------|------------|------------------------|
| 1 | missions.length === 0 | `ERR_NO_MISSION` | 「ミッションを1つ以上登録してください」 |
| 2 | roles.length === 0 | `ERR_NO_ROLE` | 「ロールを1つ以上登録してください」 |
| 3 | roles.length < connected人数 | `ERR_ROLE_SHORT` | 「ロールが {差分} 個足りません」 |
| 4 | roles.length > connected人数 | `ERR_ROLE_EXCESS` | 「ロールが {差分} 個多すぎます」 |

エラー表示：画面上部からスライドインするトースト通知（赤・5秒で自動消去）。

### 6.4 プリセット機能

#### 概要

ミッションボックスとロールボックスの内容を「プリセット」として名前付きで保存・ロードできる。サーバーメモリ上に保持し、サーバー再起動で消去（永続化はv2以降の課題）。

#### UI構成

```
[プリセット] ▼
  ├─ 「新しいプリセットとして保存」
  └─ ────────────────────
     ・ 夜の教室殺人事件  [ロード] [削除]
     ・ 宇宙人侵略シナリオ [ロード] [削除]
```

- ボタン：「プリセット」ドロップダウンをホーム画面ヘッダー付近に配置
- 「保存」押下時：モーダルでプリセット名を入力 → 確定で保存
- 「ロード」押下時：確認ダイアログ「現在の内容を上書きしますか？」→ 了承でロード

#### Socket.io イベント（プリセット）

| イベント（C→S） | ペイロード | 処理 |
|--------------|-----------|------|
| `preset:save` | `{ name, missions, roles }` | サーバーに追加、全員に `preset:list` を再送 |
| `preset:load` | `{ id }` | 全員に `preset:loaded` を送信 |
| `preset:delete` | `{ id }` | サーバーから削除、全員に `preset:list` を再送 |
| `preset:list_request` | なし | 送信者に現在のプリセット一覧を返す |

| イベント（S→C） | ペイロード | 処理 |
|--------------|-----------|------|
| `preset:list` | `{ presets: Preset[] }` | UIのプリセット一覧を更新 |
| `preset:loaded` | `{ missions, roles }` | ミッション・ロールボックスを上書き更新 |

---

## 7. Socket.io イベント全一覧

### クライアント → サーバー

| イベント名 | ペイロード | 送信タイミング |
|-----------|-----------|-------------|
| `game:start` | `{ missions: string[], roles: string[] }` | ゲーム開始ボタン押下（HOSTのみ） |
| `game:reset` | なし | 戻るボタン押下 |
| `preset:save` | `{ name: string, missions: string[], roles: string[] }` | プリセット保存 |
| `preset:load` | `{ id: string }` | プリセットロード |
| `preset:delete` | `{ id: string }` | プリセット削除 |
| `preset:list_request` | なし | 接続時・UI開時 |

### サーバー → クライアント

| イベント名 | ペイロード | 送信先 | タイミング |
|-----------|-----------|-------|----------|
| `session:init` | `{ sessionId: string, role: UserRole }` | 接続者のみ | 初回接続時 |
| `lobby:update` | `{ userCount, connected, reconnecting }` | 全員 | 接続・切断時 |
| `host:changed` | `{ newHostSessionId: string }` | 全員 | HOST変更時 |
| `game:phase` | `{ phase: GamePhase }` | 全員 | フェーズ変更時 |
| `game:error` | `{ code: string, message: string }` | 送信者のみ | バリデーション失敗 |
| `lottery:start` | なし | 全員 | 抽選開始 |
| `lottery:mission` | `{ mission: string }` | 全員 | 抽選完了 |
| `lottery:role` | `{ role: string }` | 個別（接続中の参加者） | 抽選完了 |
| `lottery:no_role` | なし | 個別（スナップショット外） | 抽選完了 |
| `lottery:rejoin` | `{ mission: string, role: string }` | 個別（再接続した参加者） | 再接続時 |
| `result:rejoin` | `{ mission: string, role: string }` | 個別（再接続した参加者） | 再接続時（RESULTフェーズ） |
| `result:no_role` | なし | 個別（再接続・対象外） | 再接続時（RESULTフェーズ） |
| `preset:list` | `{ presets: Preset[] }` | 全員 | プリセット変更時 |
| `preset:loaded` | `{ missions: string[], roles: string[] }` | 全員 | プリセットロード時 |

---

## 8. UIデザイン仕様

### 8.1 カラーパレット（CSS変数）

```css
:root {
  --color-bg:          #090e1a;   /* ベース背景 */
  --color-surface:     #111827;   /* カード背景 */
  --color-card:        #1c2333;   /* ボックス背景 */
  --color-border:      #2d3748;   /* ボーダー */
  --color-accent-1:    #7c3aed;   /* パープル（メインアクセント） */
  --color-accent-2:    #06b6d4;   /* シアン（サブアクセント） */
  --color-accent-glow: rgba(124, 58, 237, 0.4);  /* グロウ用 */
  --color-text:        #f1f5f9;   /* メインテキスト */
  --color-text-sub:    #94a3b8;   /* サブテキスト */
  --color-error:       #ef4444;
  --color-success:     #10b981;
  --color-warning:     #f59e0b;
  --color-reconnect:   #f59e0b;   /* 復帰待ち表示色 */
}
```

### 8.2 タイポグラフィ

| 用途 | フォント | Weight | Size |
|------|---------|--------|------|
| サイトタイトル | `Cinzel` | 700 | 48px (PC) / 32px (SP) |
| セクション見出し | `Cinzel` | 600 | 24px |
| ロール表示（リザルト） | `Cinzel` | 700 | 56px (PC) / 36px (SP) |
| ミッション表示 | `Inter` | 600 | 20px |
| 本文・ラベル | `Inter` | 400 | 14px〜16px |

Google Fonts 読み込み：`Cinzel` `Inter`

### 8.3 共通コンポーネント仕様

#### ミッション/ロールボックス

```
┌────────────────────────────────────────┐
│ 🎯 ミッションボックス            [2件] │  ← ヘッダー
│    グラデーション下線 ────────────────  │
│                                        │
│  ╔══════════════════════════════════╗  │
│  ║ 犯人を特定せよ        [✎] [×]  ║  │  ← アイテム
│  ╠══════════════════════════════════╣  │
│  ║ 嘘をつかずに生き残れ  [✎] [×]  ║  │
│  ╚══════════════════════════════════╝  │
│                                        │
│  ┌──────────────────────┐ [＋ 追加]   │  ← 入力エリア
│  │ ミッションを入力...  │             │
│  └──────────────────────┘             │
└────────────────────────────────────────┘
```

- `border-radius: 16px`
- `backdrop-filter: blur(10px)`
- 背景：`rgba(28, 35, 51, 0.8)`
- ボーダー：`1px solid rgba(124, 58, 237, 0.3)`
- ホバー時アイテム：`transform: translateX(4px)` + `transition: 0.2s`

#### ゲーム開始ボタン（HOSTのみ）

- 幅：`280px`・高さ：`64px`
- 背景：`linear-gradient(135deg, var(--color-accent-1), var(--color-accent-2))`
- ホバー：`box-shadow: 0 0 32px var(--color-accent-glow)`
- 押下：`transform: scale(0.97)`
- 無効状態（HOSTでない場合）：`display: none`

#### ゲームに復帰ボタン（再接続HOSTかつRESULT/LOTTERY中）

- 幅：`280px`・高さ：`64px`
- 背景：`var(--color-warning)`（アンバー）
- アイコン：「↩」
- ゲーム開始ボタンの直下に表示

#### 接続人数表示

- 「👥 4人参加中（1人復帰待ち）」形式
- 復帰待ちがいる場合：「復帰待ち」部分を `var(--color-warning)` で色付け
- 変化時：数値がフラッシュ（`animation: flash 0.3s ease`）

#### プリセットUI

- ホーム画面のヘッダー右端にドロップダウンボタン
- クリックで開くパネル（`position: absolute`、`z-index: 100`）
- パネル内は縦スクロール可（`max-height: 240px; overflow-y: auto`）

### 8.4 レスポンシブ

| ブレークポイント | 対応 |
|---------------|------|
| ≥ 1024px (PC) | 2カラム（ミッションボックス + ロールボックス横並び） |
| < 1024px (タブレット・SP) | 1カラム縦積み |

---

## 9. アニメーション仕様

### 9.1 背景パーティクル（常時）

tsParticles で実装。

```javascript
// 設定値
{
  particles: {
    number: { value: 80 },
    color: { value: ['#7c3aed', '#06b6d4', '#f1f5f9'] },
    opacity: { value: 0.3, random: true },
    size: { value: { min: 1, max: 3 } },
    move: { enable: true, speed: 0.5, direction: 'none', random: true },
    links: { enable: true, distance: 120, opacity: 0.15 }
  },
  background: { color: 'transparent' }
}
```

### 9.2 タイトルグリッチ

```css
@keyframes glitch {
  0%, 100% { text-shadow: none; transform: none; }
  20% { text-shadow: 3px 0 #06b6d4, -3px 0 #7c3aed; }
  40% { transform: translateX(-2px); }
  60% { text-shadow: -3px 0 #06b6d4, 3px 0 #7c3aed; }
  80% { transform: translateX(2px); }
}
/* ランダム間隔で発火（JSでanimation-playを制御） */
```

### 9.3 カードボーダーオーロラ

```css
@keyframes aurora {
  0%   { border-color: rgba(124, 58, 237, 0.5); }
  50%  { border-color: rgba(6, 182, 212, 0.5); }
  100% { border-color: rgba(124, 58, 237, 0.5); }
}
.card { animation: aurora 4s ease-in-out infinite; }
```

### 9.4 抽選アニメーション（GSAP）

**フェーズ1：ロック（0〜0.5s）**

```javascript
const tl = gsap.timeline();
tl.to('#game-start-btn', { scale: 1.1, duration: 0.1 })
  .to('#game-start-btn', { scale: 0, opacity: 0, duration: 0.3 })
  .to(['.mission-box', '.role-box'], {
    opacity: 0, y: -20, duration: 0.3, stagger: 0.1
  }, '-=0.2');
```

**フェーズ2：ルーレット（0.5〜3.0s）**

- 画面中央にカードが出現（`scaleY: 0 → 1`）
- カード内テキストがミッション・ロールをランダム高速スクロール（setInterval 50ms → 徐々に間隔を拡大）
- 3秒で決定位置に停止 + バウンス（`ease: "elastic.out(1, 0.5)"`）

**フェーズ3：リビール（3.0〜4.5s）**

```javascript
// カードフリップ（ミッション）
tl.to('#lottery-card', { rotateY: 90, duration: 0.3 })
  .call(() => { /* カード表面をミッション表示に差し替え */ })
  .to('#lottery-card', { rotateY: 0, duration: 0.3 });

// パーティクルバースト
// tsParticles の confetti モードを一時発火
```

**フェーズ4：リザルト定着（4.5s〜）**

```javascript
// リザルト画面スライドイン
tl.fromTo('#result-screen', 
  { y: '100%', opacity: 0 },
  { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }
);

// ロール名スケールアップ
tl.fromTo('#your-role',
  { scale: 0.5, opacity: 0 },
  { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' }
);
```

### 9.5 画面遷移

| 遷移 | アニメーション |
|------|-------------|
| LOBBY → LOTTERY | ページ全体 `opacity: 1 → 0` (0.3s) → LOTTERY画面フェードイン |
| LOTTERY → RESULT | §9.4 フェーズ4参照 |
| RESULT → LOBBY | 戻るボタン押下 → フェードアウト → フェードイン |

---

## 10. セキュリティ

| 対策 | 実装 |
|------|------|
| XSS | ユーザー入力をサーバー受信時に `he.escape()` でエスケープ、表示時も `textContent` を使用（`innerHTML` 禁止） |
| イベント不正送信 | HOSTのみ受け付けるイベント（`game:start`, `game:reset`）はサーバー側で role チェック |
| ロール秘匿 | 各プレイヤーのロールはサーバーのみ保持、クライアントへは自分のロールのみ送信 |
| ポート公開 | デフォルト3000番。LANのみでの利用であり認証は不要（要件通り） |

---

## 11. 開発フェーズと受け入れテスト

### Phase 1：サーバー基盤・セッション管理（目安：1日）

**実装内容**
- Express + Socket.io サーバー起動
- セッションID発行・再接続識別
- `lobby:update` イベント（接続数・復帰待ち数）
- HOST判定ロジック・`host:changed` ロジック

**受け入れテスト**
- [ ] `npm run start` でサーバーが起動し `http://localhost:3000` に接続できる
- [ ] 2つのブラウザタブで接続し、片方を閉じると接続数が更新される
- [ ] 再接続時に同じsessionIdが使われ、接続数が変化しない
- [ ] 最初の接続者がHOSTになり、HOST切断時に次の接続者に引き継がれる

### Phase 2：ゲームロジック・バリデーション（目安：1日）

**実装内容**
- ミッション・ロールの登録・削除・編集
- バリデーション全チェック
- 抽選ロジック（Fisher-Yates シャッフル）
- 個別ロール配信・スナップショット外通知

**受け入れテスト**
- [ ] ミッション0件でゲーム開始 → ERR_NO_MISSION エラー表示
- [ ] ロール数 ≠ ユーザー数でゲーム開始 → 差分数付きエラー表示
- [ ] 3人で接続・3ロール登録 → 全員異なるロールが配信される
- [ ] 抽選開始後に4人目が接続 → `lottery:no_role` 受信を確認

### Phase 3：プリセット機能（目安：0.5日）

**実装内容**
- プリセット保存・ロード・削除
- プリセットUIドロップダウン
- ロード時の確認ダイアログ

**受け入れテスト**
- [ ] プリセット保存 → 別タブで同じプリセットが表示される
- [ ] プリセットロード → ミッション・ロールが上書きされる
- [ ] プリセット削除 → 全タブから消える

### Phase 4：再接続・復帰機能（目安：1日）

**実装内容**
- 切断中プレイヤーの復帰待ち表示
- 再接続フロー（LOBBY / LOTTERY / RESULT 各フェーズ）
- 「ゲームに復帰」ボタン

**受け入れテスト**
- [ ] 3人接続中に1人が切断 → 他2人に「1人復帰待ち」表示
- [ ] 切断者が再接続 → LOBBY中なら通常画面、RESULT中ならリザルト画面に復帰
- [ ] 復帰者に「ゲームに復帰しました」バナー表示

### Phase 5：UIデザイン・アニメーション（目安：1.5日）

**実装内容**
- 全CSSスタイリング（§8参照）
- tsParticles背景
- GSAPアニメーション全実装（§9参照）
- レスポンシブ対応

**受け入れテスト**
- [ ] PC・スマートフォンで崩れなく表示される
- [ ] 抽選アニメーションが3〜5秒で完了する
- [ ] 60fps を維持する（Chrome DevTools Performance確認）

### Phase 6：統合テスト・README整備（目安：0.5日）

**受け入れテスト**
- [ ] 5人同時接続での一連のゲームが完了する
- [ ] README のコマンドのみでサーバーが起動する
- [ ] エラーケース（接続切断・バリデーション）が全て正常動作する

---

## 付録A：localStorageキー一覧

| キー | 型 | 内容 |
|------|-----|------|
| `"sessionId"` | `string` | サーバー発行のセッションID |
| `"missions"` | `string` (JSON) | ミッションリスト `string[]` |
| `"roles"` | `string` (JSON) | ロールリスト `string[]` |

---

*本仕様書はv1.1です。未確定事項なし。実装はPhase 1から順に進めること。*
