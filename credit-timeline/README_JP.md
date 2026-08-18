# Credit Timeline

> 日本語版 / [English](README.md)

セッションとサブエージェントを**時系列のタイムライン**で並べ、クレジット (AIU) 消費を
俯瞰する GitHub Copilot canvas extension。

## Requirements

- GitHub Copilot app with canvas extension support
- Local Copilot session data under `$COPILOT_HOME` (default: `~/.copilot`)
- A Node.js runtime that provides `node:sqlite`

Canvas APIs are currently experimental and may change between Copilot app releases.

## Installation

Copy this directory to one of the extension discovery locations:

- Project scope: `.github/extensions/credit-timeline/`
- User scope: `$COPILOT_HOME/extensions/credit-timeline/`

Reload extensions in the GitHub Copilot app after installation.

## 見方

- **上段の棒グラフ** — 時間バケットごとの AIU をステージ色で積み上げ。重ねた細線は累積比率。
  期間の長さに関係なくキャンバス全幅へ縮尺し、左端から表示する。
- **タイムライン** — 1 行 = 1 セッション。バーの左右がセッションの開始/終了、色がステージ。
  バー内の白い縦線はサブエージェントの起動時刻。右端の細バーと数値がそのセッションの AIU。
- **実行設定** — セッション名の右に、直近のモデルと reasoning effort を表示。
  行のホバーでは、途中で設定が変わった場合を含む使用履歴・回数・AIU を確認できる。
- **現在のセッション** — 青い背景・左線・`現在` バッジで、このキャンバスを開いているセッションを示す。
- **セッション階層** — `create_session` または fork で起こした子セッションは親の下に字下げして並ぶ。
  各行の `フォーカス` は、選択中のスコープ内でそのセッションを表示上のルートにして絞り込む。
  パンくずのスコープ名から元の範囲へ戻れる。KPI・レジェンド・時間軸はいずれも表示中の範囲で
  再計算される。
- **行内の `▾ N / ▸ N`** — そのセッションのサブエージェントだけを展開・折りたたみする。
  行全体にはクリック操作を割り当てず、`フォーカス` との誤操作を防ぐ。
- `すべて折りたたむ / すべて展開`: 全セッションのサブエージェント表示を一括で切り替える。
- **サブエージェント行** — 左にエージェント名、中央に作業概要、右にモデルと effort を表示する。
- **ホバー** — 期間・AIU・リクエスト・トークン・PR/Issue 参照を表示。
  サブエージェントでは起動時の作業名・依頼概要も表示する。

## 操作

- **スコープ切替** — `現在チャット` は現在セッションと app に記録された creator/親リンクで確認できる配下を表示する。
  `リポジトリ` と `フォルダー` は一致する通常セッションを seed とし、子の worktree path や
  repository metadata が異なる場合も、確実な親子リンクがある全子孫を含める。`全セッション` は
  ローカルの全チャット・全プロジェクトセッションを明示的に表示する。プロジェクトセッションの
  既定は current repository、repository 情報がない一般チャットの既定は current chat tree。
- ステージのチップ: クリックで表示/非表示。
- `圧縮 / 実時間`: 圧縮は 40 分以上の無活動区間を破線に畳んで密度を保つ。実時間は等速の時間軸。
- `時系列 / 消費順`: 行の並び替え（時間軸は常に実時刻）。
- `自動 OFF / 自動 ON · 30秒`: ON 時に即時更新し、以降は 30 秒間隔で更新する。既定は OFF。
- `更新`: データ再読込。agent からは `refresh` action。`top_consumers` action で消費上位を取得できる。
- **タイムゾーン切替**: ヘッダーの `JST 時点` をクリックすると UTC、もう一度押すと JST に戻る。
  ボタンは増やさず、メタ情報のこの一語だけがトグルになっている。

## 時刻とステージ分類

- 時刻表示は **JST（`Asia/Tokyo`）と UTC を切り替え可能**。初期値は JST。
  DB は UTC で持っているので、表示時にだけ変換する。ホストが UTC で動いていても既定は JST。
  切り替えると、現在の期間・ツールチップ・時間軸の目盛り・生成時刻など**すべての wall-clock 表示**が
  同じタイムゾーンに揃う。状態はパネル内の UI 状態で、リロードすると JST に戻る。
- ステージはセッション名からの**推定**であって、記録された事実ではない。判定順は
  スキル名の完全一致（`increment-development` など）→ キーワード。誤分類はありうる。
  ルールの正は `data.mjs` の `SKILL_STAGES` と `classifyStageDetail()`。

## データ

`$COPILOT_HOME/session-store.db`（AIU・token・PR/Issue 参照）、`session-state/<id>/workspace.yaml`
（名前・branch）、`session-state/<id>/events.jsonl`（サブエージェントの親子関係）、
`$COPILOT_HOME/data.db` の `workspace_parent_links`（セッション同士の親子関係）。
最後のものが読めない場合は階層表示を諦めてフラットに並べる。
repository、正規化したルートフォルダー、チャット階層は独立したフィルタとして扱う。repository は
`workspace.yaml` を優先する。repository/folder の一致から seed を選び、current chat tree と同じく
`coordinating_creator_session_id`、`creator_session_id`、`workspace_parent_links` の優先順で
記録済みの関係だけを使って子孫を追加する。creator は workspace 行を持たない一般チャットでもよい。
リンクを読めない場合は関係を推測しない。
AIU = `SUM(total_nano_aiu) / 1,000,000,000` で、ローカル記録上のモデル使用量。
premium request 枠や課金額ではない。セッション行の AIU は子エージェント分を含む内数。

**チャットウィンドウの「AI Credit」との差**: アプリ側の表示は `initiator = 'compaction'`
（コンテキスト圧縮）の分を除外している。このキャンバスは全部を合計したうえで、
ヘッダーとツールチップに「うち圧縮」を内数で出す。差分が出たらここを見れば説明できる。

```text
open_canvas({ canvasId: "credit-timeline", instanceId: "credit-timeline-1" })
```

open input の `scope` には `current_chat_tree`、`current_repository`、`current_folder`、
`all_sessions` を指定できる。
別リポジトリを見る場合は `{ scope: "current_repository", repository: "owner/repo" }` を渡す。
`refresh` と `top_consumers` actions も同じ任意の scope / repository / folder を受け付ける。

## Privacy

この extension はローカルの Copilot セッション DB を読み取り専用で参照し、ダッシュボードは
`127.0.0.1` にバインドしたループバック HTTP サーバーからのみ配信する。
セッションデータを外部サービスへ送信することはない。
