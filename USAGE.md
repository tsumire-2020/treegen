# Treegen CLI セットアップ & 利用ガイド

このドキュメントは、`treegen` CLI をローカル環境にセットアップし、CSV・Markdown 表・`tree` コードブロックからディレクトリ／ファイル構成を生成するまでの手順をまとめたものです。

---

## 1. 前提条件

- Node.js **20 以上**
- npm が使用できること（推奨: npm 10 以上）
- Windows / macOS / Linux いずれも可

---

## 2. 初回セットアップ

```bash
git clone <this-repo-url>
cd treegen
npm install
npm run build
```

> テスト実行: `npm test`  
> CLI を直接試すときはビルド後に `npm run preview ...` などの npm script を利用します。

---

## 3. 想定する Markdown 構造

````md
```tree
project/
  src/
    index.ts
  README.md
```
````

- 2 スペースでインデントを表現します。
- ディレクトリ名の末尾に `/` を付与します。
- 空の構造や絶対パス・禁止文字（`..`, `<`, `>`, `:` など）はバリデーションで弾かれます。

---

## 4. 主要コマンド

| コマンド | 目的 | 代表的なオプション |
| --- | --- | --- |
| `treegen preview --input <file>` | Markdown を解析し、生成予定のパス一覧を表示 | `-i, --input` (必須) |
| `treegen validate --input <file>` | `tree` ブロック構造の検証のみを実施 | `-i, --input` (必須) |
| `treegen create --input <file> [--output <dir>] [options]` | 実際にディレクトリ／ファイルを作成 | `-o, --output` (デフォルト: `.`)、`--dry-run`、`--force`、`--skip-existing`、`--template-dir` |

### サンプル

```bash
# プレビュー
npm run preview -- --input ./example-structure.md

# 構造チェックのみ
npm run validate -- --input ./example-structure.md

# 実際に生成
npm run create -- --input ./example-structure.md --output ./sandbox --dry-run   # まず dry-run
npm run create -- --input ./example-structure.md --output ./sandbox             # 本番生成
```

---

## 5. create コマンドのオプション詳細

- `--dry-run`  
  ファイルシステムを変更せず、作成／スキップ件数のみ出力。

- `--force`  
  既存ファイルがあっても強制的に上書き。

- `--skip-existing`  
  既存ファイルがある場合はスキップし、`skipped` カウントを増やす。

- `--template-dir <path>`  
  `templates/` 配下などを指定すると、`handler.ts.tpl` 等のテンプレートを解決してファイル内容に反映。テンプレートが見つからない場合は空文字を書き込みます。

> `--force` と `--skip-existing` は同時指定不可。指定がなければ既存ファイル検出時にエラーで停止します。

---

## 6. 開発用スクリプト

| npm script | 内容 |
| --- | --- |
| `npm run dev` | CLI を `tsx` で起動（開発用） |
| `npm run preview` / `validate` / `create` | それぞれのコマンドを npm script 経由で実行 |
| `npm run build` | TypeScript を `dist/` にコンパイル |
| `npm test` | Vitest によるユニットテスト |

---

## 7. 生成結果の確認とクリーンアップ

1. `--output` で指定したディレクトリに生成されるため、再生成時は `--dry-run` で内容を確認する。
2. 生成物をリセットしたい場合は、出力先ディレクトリを手動で削除する。

---

## 8. トラブルシューティング

- `spawn EPERM` 等で npm script が失敗する場合  
  → 権限のあるシェルを使用するか、管理者権限で実行してください。

- 「インデントが不正」と表示される場合  
  → 2 スペース単位になっているか、階層を飛び級していないかを確認。

- テンプレートが適用されない場合  
  → `--template-dir` のパスと、ファイル名に対応する `<name>.tpl` が存在するか確認。

---

このガイドを参考に Treegen CLI を活用し、設計用 Markdown から安全にディレクトリ構成を生成してください。

## 9. 追加の入力形式と共通オプション

CSV・Markdown 表の ID 方式／親パス方式と、罫線 tree を利用できます。
[examples](examples/) の 6 入力はすべて `project/src/index.ts` と `project/README.md` を
同じ順序で表します。各形式で preview → validate → create --dry-run → create を実行できます。

```bash
# CSV（ID 方式。親パス方式では examples/path.csv に置換）
npm run preview -- --input examples/id.csv
npm run validate -- --input examples/id.csv
npm run create -- --input examples/id.csv --output sandbox --dry-run
npm run create -- --input examples/id.csv --output sandbox

# 表（親パス方式。ID 方式では examples/id-table.md に置換）
npm run preview -- --input examples/path-table.md --source table:1
npm run validate -- --input examples/path-table.md --source table:1
npm run create -- --input examples/path-table.md --source table:1 --output sandbox --dry-run
npm run create -- --input examples/path-table.md --source table:1 --output sandbox --skip-existing

# 罫線 tree（従来の 2 スペース tree は examples/indent.md）
npm run preview -- --input examples/branches.md --tree-style branches
npm run validate -- --input examples/branches.md --source tree:1 --tree-style branches
npm run create -- --input examples/branches.md --output sandbox --dry-run
npm run create -- --input examples/branches.md --output sandbox --skip-existing
```

同じ sandbox へ続けて生成する場合、既定では既存ファイル衝突になります。
内容を確認し、必要に応じて skip-existing または force を単独で指定してください。
テンプレート、dry-run、上書き・スキップの意味はすべての形式で共通です。

| 共通オプション | 規則 |
| --- | --- |
| `--input-format auto` | 既定。拡張子 `.csv` は CSV、`.md` / `.markdown` は Markdown。大小文字は無視。未知拡張子は明示形式を要求。 |
| `--input-format csv` / `markdown` | 拡張子より優先。解析失敗後に別形式へ切り替えない。 |
| `--source tree:N` / `table:N` | Markdown の対象を 1 個だけ選択。N は種類ごとに 1 始まり。CSV には使用不可。 |
| `--tree-style auto` | tree では構文位置の罫線接続子があれば branches、それ以外は indent。根だけは indent と同義。 |
| `--tree-style indent` / `branches` | tree の構文を明示。CSV・表には明示 auto を含め使用不可。 |

### 行データの規則

ID 方式の必須列は `id,parent_id,name,type`、親パス方式は `parent_path,name,type`。
ヘッダーの外側空白は除きますが、英小文字の列名を厳密に要求し、別名・重複列・予約列の
方式混在・部分的な列組を拒否します。無関係な追加列は無視します。

type は `file` / `directory` だけです。name の末尾 `/` で型を示すことはできません。
拡張子なしの file と空 directory も明示的に表せます。id は非空の文字列で `001` と `1` は別です。
空の parent_id / parent_path のみが根です。`NULL` や `0`、`.` を根として特別扱いしません。
親行は後でも構いません。根と兄弟は入力順を保ちます。全祖先の行が必要で、暗黙の親は作りません。
重複 ID、不在参照、自己参照・根に接続しない成分を含む循環、file 配下の子を拒否します。

name は `/`・バックスラッシュを含まない単一セグメントです。parent_path は `project/src` のような
相対パスで、先頭・末尾 `/`、空成分、`.`・`..`、ドライブ指定・バックスラッシュを拒否します。
空白だけの名前・親、制御文字、既存の禁止文字も拒否します。危険値を正規化して受理しません。
CSV の ID・名前・親の空白は保存して照合します。

CSV は UTF-8（不正バイトは拒否）、先頭 BOM、LF / CRLF に対応します。カンマ固定で、
二重引用符で囲むセル、引用内のカンマ・改行、`""` による引用符を解釈します。
完全な空行は読み飛ばしますが、カンマだけの行は必須値エラーです。列数不一致や不正な引用はエラーです。
改行セルは CSV として読めても、名前などの制御文字禁止規則で拒否します。
先頭以外の BOM は値の一部です。ヘッダー以外の値を trim しません。

Markdown 表にはヘッダーと `---` 区切り行が必要です。区切り行の `:` による配置指定、
任意の外枠パイプ、空セルを扱います。欠けたセルは補完しません。
セル両端の配置用空白を除き、`\|` と `\\` だけを復元します。コードスパン内のパイプを
区切りと誤認しませんが、対象列のコードスパン・強調・リンク・HTML・実体参照はエラーです。
CSV の引用規則を適用しません。複数行セル・結合セルは非対応です。
CSV と表の外側空白の意味が違うため、前後空白が必要な名前の完全な相互変換は対象外です。

### tree の規則と対象選択

罫線 tree は Markdown の tree フェンス内に置きます。前置は `│   ` または 4 スペース、
接続子は `├── ` / `└── `（末尾スペース込み）です。最後の兄弟に `└──`、後続兄弟がある位置に
`├──` と祖先の `│` が必要です。根は接続子のない実ノードで、複数根も可能です。
`.` を生成先そのものとは扱いません。directory は従来と同じ末尾 `/` のみで示します。
混在、深さの飛び級、タブ、不完全な接続子、色エスケープ、末尾集計行を拒否します。
名前中の罫線文字は一律に禁止しません。旧形式の罫線に似た名前は `--tree-style indent` で明示できます。

対象はトップレベルの言語名が厳密に tree のフェンスと、候補表です。通常のフェンス内、引用・
リスト内の例は選びません。表は name / type のどちらかと、id / parent_id / parent_path の
どれかを持つ場合だけ候補になります。不完全な候補は選択後に必須列エラーにします。
無関係な表は table の番号に含めません。

source 未指定では最初の tree を優先します。tree がなく候補表が 1 個ならそれを選び、
複数なら番号・開始行を表示して指定を求めます。選択した対象が不正でも他へ切り替えません。
選ばない対象は検証せず、対象同士は統合しません。
単独の罫線テキストファイル、Markdown 内の CSV フェンス、TSV、文字コード推定は非対応です。

### 診断と互換性・安全保証

```text
structure.csv:3:3-3:10 (csv) [PARENT_NOT_FOUND] parent_id="missing": 参照先の親がありません (data record 2)
structure.csv:4:1-4:2 (csv) [DUPLICATE_ID] id="s": 重複した定義です (data record 3)
  related structure.csv:3:1-3:2 (csv)
structure.csv:5:4-6:9 (csv) [INVALID_NAME] name="bad\nname": name は安全な単一セグメントで指定してください (data record 4)
```

診断は code、元ファイル、対象、物理行・列、列名、エスケープした問題値と説明、必要な関連位置を
持ちます。列は Unicode コードポイント単位で 1 始まり、範囲の終端はその直後の位置です。
CSV ではヘッダーを除くデータレコード番号と複数物理行のセル範囲も表示します。
独立した意味エラーは可能な範囲で集約し、構文が壊れて位置を追えない場合は停止します。
エラー終了は非ゼロです。機械可読出力の CLI は追加していません。

正常な従来入力と既存 CLI オプションは維持します。採用済み D18〜D20 により preview も
共通検証を通し、同型・異型・大小文字差の出力パス衝突と force＋skip の同時指定を拒否します。
Unicode 正規化はせず、見た目の同一性やすべてのファイルシステム固有の同一性を検出する保証はありません。
force / skip は入力内の衝突や危険値を許可しません。

preview / validate は静的検証だけを行い、create は dry-run を含め生成先との包含・既存ファイル衝突も
確認します。全入力検証と全対象の字句上の包含検査は mkdir / writeFile より前に終えます。
入力エラー時は書き込みません。dry-run も書き込みませんが、存在確認とテンプレート読取は行います。
実際の既存ファイル衝突・I/O エラーでは逐次処理の途中まで生成される場合があります。
ロールバック・原子的生成は保証せず、dry-run 後の実行先状態変化も防ぎません。
包含検査は字句上のもので、シンボリックリンク経由の逸脱に対する完全な防御ではありません。
