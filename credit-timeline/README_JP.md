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
- **Active 表示** — ログからセッションまたはサブエージェントが実行中と判断できる場合、
  タイムラインの帯に細い輪郭と、ゆっくり横切る控えめな反射を表示する。
  セッションは `assistant.turn_start` から `assistant.turn_end` または `abort` までを実行中とし、
  `session.resume` だけでは Active にしない。サブエージェントは完了または失敗イベントまでを
  Active とする。動きを減らす OS 設定では静的な輪郭に切り替わる。
- **実行設定** — セッション名の右に、直近のモデルと reasoning effort を表示。
  行のホバーでは、途中で設定が変わった場合を含む使用履歴・回数・AIU を確認できる。
- **現在のセッション** — 青い背景・左線・`Now` バッジで、このキャンバスを開いているセッションを示す。
- **セッション階層** — `create_session` または fork で起こした子セッションは親の下に字下げして並ぶ。
  各行の `Focus` は、選択中のスコープ内でそのセッションを表示上のルートにして絞り込む。
  パンくずのスコープ名から元の範囲へ戻れる。KPI・レジェンド・時間軸はいずれも表示中の範囲で
  再計算される。
- **行内の `chevron + N`** — そのセッションのサブエージェントだけを展開・折りたたみする。
  行全体にはクリック操作を割り当てず、`Focus` との誤操作を防ぐ。
- **Collapse all / expand all**（シェブロンのアイコンボタン）: 全セッションのサブエージェント表示を一括で切り替える。
- **サブエージェント行** — 左にエージェント名、中央に作業概要、右にモデルと effort を表示する。
- **ホバー** — 期間・AIU・リクエスト・トークン・PR/Issue 参照を表示。
  サブエージェントでは起動時の作業名・依頼概要も表示する。

## 操作

- **アイコン + 短い英語** — UI のラベルはアイコンと短い英単語で構成し、言語に依存しない表示にしている。
  アイコンのみのボタン（Refresh・全展開/全折りたたみ・行のシェブロン）にも英語の `title` / `aria-label` を付けている。
- **スコープ切替** — `Chat` は現在セッションと app に記録された creator/親リンクで確認できる配下を表示する。
  `Repo` と `Folder` は一致する通常セッションを seed とし、子の worktree path や
  repository metadata が異なる場合も、確実な親子リンクがある全子孫を含める。`All` は
  ローカルの全チャット・全プロジェクトセッションを明示的に表示する。プロジェクトセッションの
  既定は current repository、repository 情報がない一般チャットの既定は current chat tree。
- ステージのチップ: クリックで表示/非表示。
- `Compress / Real`: 圧縮は 40 分以上の無活動区間を破線に畳んで密度を保つ。実時間は等速の時間軸。
  長期間で区間数が増えた場合も、無活動ギャップ幅を表示領域に合わせて縮小し、時間列と AIU 列を
  キャンバス内に収める。
- `Time / Credits`: 行の並び替え（時間軸は常に実時刻）。
- `Auto / Auto 30s`: ON 時に即時更新し、以降は 30 秒間隔で更新する。既定は OFF。
- **Refresh**（回転矢印のアイコンボタン）: データ再読込。agent からは `refresh` action。`top_consumers` action で消費上位を取得できる。
- **ライブ同期**: agent の `refresh` action やスコープ変更を Server-Sent Events で開いている画面へ即時反映する。
  接続状態はヘッダーに表示し、切断時は自動再接続する。
- **タイムゾーン切替**: ヘッダーにはローカルタイムゾーンの短縮名を表示する。クリックすると UTC、
  もう一度押すとローカル時刻に戻る。ボタンは増やさず、この短縮名だけがトグルになっている。

## 時刻とステージ分類

- 時刻表示の初期値は **ブラウザー／ホストのローカル IANA タイムゾーン**で、UTC に切り替え可能。
  DB は UTC で持っているので、表示時にだけ変換する。
  切り替えると、現在の期間・ツールチップ・時間軸の目盛り・生成時刻など**すべての wall-clock 表示**が
  同じタイムゾーンに揃う。状態はパネル内の UI 状態で、リロードするとローカル時刻に戻る。
- タイムラインと概要は、読み込んだデータの最初のイベントから最後のイベントまでを表示する。
  終端は完了時刻と確認済みの usage 活動を優先し、実行中のセッションだけ現在時刻まで延長する。
  時間トラックの両端を実線レールで示し、開始・終了ラベルはレール上に中央揃えの太字で表示する。
  破線は圧縮された無活動区間を示す。
- ステージはセッション名からの**推定**であって、記録された事実ではない。Scrum のスキル名と
  Scrum キーワードを最優先し、Product Goal から Retrospective までの既存分類を維持する。
  Scrum に該当しない場合は Research、Design、Implementation、Testing、Debugging、
  Documentation、Maintenance、Feedback、Tooling へ分類し、該当しなければ Other とする。
  誤分類はありうる。ルールの正は `data.mjs` の `SKILL_STAGES` と `classifyStageDetail()`。

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

repository、folder、all sessions スコープでは、`session.shutdown` が記録済み、使用リクエスト数が
厳密に 0、nano-AIU が厳密に 0 の3条件をすべて満たすセッションだけを除外する。実行中や
ライフサイクルイベントなしのセッションは初回 usage 記録前でも残す。current chat tree は
root/子構造を完全に保つため、終了済みゼロ利用ノードも意図的に残す。フィルタ対象の親に有効な子が
ある場合、最も近い表示対象の祖先またはトップレベルへ昇格する。KPI と actions は最終表示集合から集計する。
加えて、タイトル・branch・ライフサイクルイベントがすべてなく、リクエストと AIU も 0 の
未初期化レコードは、フォルダーなどの一覧表示では除外する。
AIU = `SUM(total_nano_aiu) / 1,000,000,000` で、ローカル記録上のモデル使用量。
premium request 枠や課金額ではない。セッション行の AIU は子エージェント分を含む内数。

**チャットウィンドウの「AI Credit」との差**: アプリ側の表示は `initiator = 'compaction'`
（コンテキスト圧縮）の分を除外している。このキャンバスは全部を合計したうえで、
ヘッダーとツールチップに「compaction」を内数で出す。差分が出たらここを見れば説明できる。

```text
open_canvas({ canvasId: "credit-timeline", instanceId: "credit-timeline-1" })
```

open input の `scope` には `current_chat_tree`、`current_repository`、`current_folder`、
`all_sessions` を指定できる。
`input` の省略・`null`・`{}` は同じ扱いで、既定のスコープを開く。
別リポジトリを見る場合は `{ scope: "current_repository", repository: "owner/repo" }` を渡す。
`refresh` と `top_consumers` actions も同じ任意の scope / repository / folder を受け付ける。

## Privacy

この extension はローカルの Copilot セッション DB を読み取り専用で参照し、ダッシュボードは
`127.0.0.1` にバインドしたループバック HTTP サーバーからのみ配信する。
セッションデータを外部サービスへ送信することはない。

画面はホストのテーマトークン、狭いキャンバス幅、OS のモーション低減設定に追従する。
