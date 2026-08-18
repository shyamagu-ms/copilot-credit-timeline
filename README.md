# Credit Timeline

セッションとサブエージェントを**時系列のタイムライン**で並べ、クレジット (AIU) 消費を
俯瞰する GitHub Copilot canvas extension。

## Requirements

- GitHub Copilot app with canvas extension support
- Local Copilot session data under `$COPILOT_HOME` (default: `~/.copilot`)
- A Node.js runtime that provides `node:sqlite`

Canvas APIs are currently experimental and may change between Copilot app releases.

## Installation

Install the `credit-timeline` folder from:

```text
https://github.com/shyamagu-ms/copilot-credit-timeline/tree/main/credit-timeline
```

Alternatively, copy the repository's `credit-timeline` directory to one of the
extension discovery locations:

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
- **セッション階層** — `create_session` で起こした子セッションは親の下に字下げして並ぶ。
  各行の `フォーカス` は、子の有無にかかわらずそのセッションをルートにして表示範囲を絞り込む。
  既定のルートは**このキャンバスを開いたセッション**（子が無ければ 1 行になる）。
  パンくずから上位に戻れる。KPI・レジェンド・時間軸はいずれも表示中の範囲で再計算される。
- **行内の `▾ N / ▸ N`** — そのセッションのサブエージェントだけを展開・折りたたみする。
  行全体にはクリック操作を割り当てず、`フォーカス` との誤操作を防ぐ。
- `すべて折りたたむ / すべて展開`: 全セッションのサブエージェント表示を一括で切り替える。
- **サブエージェント行** — 左にエージェント名、中央に作業概要、右にモデルと effort を表示する。
- **ホバー** — 期間・AIU・リクエスト・トークン・PR/Issue 参照を表示。
  サブエージェントでは起動時の作業名・依頼概要も表示する。

## 操作

- ステージのチップ: クリックで表示/非表示。
- `圧縮 / 実時間`: 圧縮は 40 分以上の無活動区間を破線に畳んで密度を保つ。実時間は等速の時間軸。
- `時系列 / 消費順`: 行の並び替え（時間軸は常に実時刻）。
- `自動 OFF / 自動 ON · 30秒`: ON 時に即時更新し、以降は 30 秒間隔で更新する。既定は OFF。
- `更新`: データ再読込。agent からは `refresh` action。`top_consumers` action で消費上位を取得できる。

## 時刻とステージ分類

- 時刻表示はすべて **JST 固定**（`Asia/Tokyo`）。DB は UTC で持っているので、表示時にだけ変換する。
  ホストが UTC で動いていても JST で出る。
- ステージはセッション名からの**推定**であって、記録された事実ではない。判定順は
  スキル名の完全一致（`increment-development` など）→ キーワード。誤分類はありうる。
  ルールの正は `data.mjs` の `SKILL_STAGES` と `classifyStageDetail()`。

## データ

`$COPILOT_HOME/session-store.db`（AIU・token・PR/Issue 参照）、`session-state/<id>/workspace.yaml`
（名前・branch）、`session-state/<id>/events.jsonl`（サブエージェントの親子関係）、
`$COPILOT_HOME/data.db` の `workspace_parent_links`（セッション同士の親子関係）。
最後のものが読めない場合は階層表示を諦めてフラットに並べる。
現在セッションの repository は `workspace.yaml` を優先し、セッションストアの古い値で
ルートセッションが除外されないようにする。
AIU = `SUM(total_nano_aiu) / 1,000,000,000` で、ローカル記録上のモデル使用量。
premium request 枠や課金額ではない。セッション行の AIU は子エージェント分を含む内数。

**チャットウィンドウの「AI Credit」との差**: アプリ側の表示は `initiator = 'compaction'`
（コンテキスト圧縮）の分を除外している。このキャンバスは全部を合計したうえで、
ヘッダーとツールチップに「うち圧縮」を内数で出す。差分が出たらここを見れば説明できる。

```text
open_canvas({ canvasId: "credit-timeline", instanceId: "credit-timeline-1" })
```

別リポジトリを見る場合は open input に `repository: "owner/repo"` を渡す。

## Privacy

The extension reads local Copilot session databases in read-only mode and serves the
dashboard only from a loopback HTTP server bound to `127.0.0.1`. It does not send
session data to an external service.
