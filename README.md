# treegen

CSV、Markdown 表、`tree` コードブロックからディレクトリ／ファイル構成を生成する TypeScript CLI です。設計ドキュメントに書いた構成を、そのまま安全にローカルへ反映できます。

> セットアップから実行手順までの詳細ガイドは [USAGE.md](./USAGE.md) を参照してください。

---

## 特徴

- **Markdown→構成生成**: `tree` ブロックをパースし、階層化された `TreeNode` に変換。
- **安全な 3 ステップ**: `preview` / `validate` / `create` を分離。`--dry-run`・`--skip-existing` などで運用リスクを低減。
- **テンプレート適用**: `--template-dir` で `handler.ts.tpl` などの雛形を差し込める拡張性。
- **単体テスト済み**: parser / domain / generator の主要機能は Vitest でカバー。

---

## 想定入力例

````md
```tree
kajotecho-backend/
  src/
    functions/
      createRecord/
        handler.ts
        schema.ts
  README.md
```
````

ルール:

- インデントは **半角スペース 2 個刻み**。
- ディレクトリは末尾 `/` を付与。
- 空のブロック・絶対パス・禁止文字（`..`, `<`, `>`, `:` など）はバリデーションで弾かれます。

---

## クイックスタート

```bash
git clone <repo>
cd treegen
npm install
npm run build

# プレビュー
npm run preview -- --input ./example-structure.md

# バリデーション
npm run validate -- --input ./example-structure.md

# 生成 (dry-run → 本番)
npm run create -- --input ./example-structure.md --output ./sandbox --dry-run
npm run create -- --input ./example-structure.md --output ./sandbox
```

---

## コマンド概要

| コマンド | 目的 | 主なオプション |
| --- | --- | --- |
| `treegen preview` | 生成予定のパス一覧を表示 | `-i, --input` |
| `treegen validate` | `tree` ブロックの構造・ルールを検証 | `-i, --input` |
| `treegen create` | 実際にディレクトリ／ファイルを作成 | `-i, --input`, `-o, --output`, `--dry-run`, `--force`, `--skip-existing`, `--template-dir` |

`npm run preview/validate/create` を使うと、ローカルの TypeScript ソースを tsx で実行できます。

---

## プロジェクト構成

- `src/parser`: CSV・Markdown の対象を選択し、行データ・tree を `TreeNode` に変換
- `src/domain`: 型・バリデーション・ドメインルール
- `src/generator`: 生成ロジック（安全なパス解決、テンプレート適用、dry-run 集計など）
- `src/commands`: Commander ベースの CLI エントリポイント
- `templates/`: 既定テンプレート (`handler.ts.tpl` など)
- `tests/unit`: Vitest によるユニットテスト

---

## 開発スクリプト

| npm script | 説明 |
| --- | --- |
| `npm run dev` | `tsx` で CLI を起動（開発用ホットリロード） |
| `npm run build` | TypeScript を `dist/` へコンパイル |
| `npm test` | ユニットテスト |
| `npm run preview/validate/create` | 各 CLI コマンドのショートカット |

---

## 注意事項

- 生成先ディレクトリは `--output` で明示し、初回は必ず `--dry-run` で動作確認してください。
- テンプレートはファイル名にマッピングされるため、`templates/schema.ts.tpl` のように配置します。
- 追加のヒントやトラブルシューティングは [USAGE.md](./USAGE.md) にまとめています。

## CSV・Markdown 表・罫線 tree

採用済みの [入力設計](docs/design-notes/row-and-tree-input-design.md) D01〜D22 を実装しています。
全形式で同じ preview / validate / create と安全検証を利用できます。

| 入力 | サンプル | 親子関係 |
| --- | --- | --- |
| CSV | [id.csv](examples/id.csv) | `id,parent_id,name,type` |
| CSV | [path.csv](examples/path.csv) | `parent_path,name,type` |
| Markdown 表 | [id-table.md](examples/id-table.md) | ID 方式 |
| Markdown 表 | [path-table.md](examples/path-table.md) | 親パス方式 |
| 罫線 tree | [branches.md](examples/branches.md) | `├── ` / `└── ` / `│   ` |
| 2 スペース tree | [indent.md](examples/indent.md) | 従来の形式 |

```bash
npm run preview -- --input examples/id.csv
npm run validate -- --input examples/path-table.md --source table:1
npm run create -- --input examples/branches.md --tree-style branches --output sandbox --dry-run
```

全コマンド共通で `--input-format auto|csv|markdown`、`--source tree:N|table:N`、
`--tree-style auto|indent|branches` を指定できます。auto は拡張子で CSV / Markdown を
選び、Markdown では最初の tree を優先します。tree がなく候補表が複数ある場合は
種類ごとの 1 始まり番号で `--source table:2` のように指定します。
CSV への source、および CSV・表への tree-style（明示した auto も含む）はエラーです。

行データの type は `file` / `directory` のみ。根は空の親セルで示し、親の後置も可能です。
全祖先の明示が必要です。name は単一セグメント、親パスは厳密な `/` 区切り相対パスです。
CSV の値は空白を保存し、Markdown セルは両端の配置用空白を除去します。
詳細な構文、対象選択、診断例、非対応範囲は [USAGE](USAGE.md#9-追加の入力形式と共通オプション) を参照してください。

正常な従来入力と既存 CLI オプションは継続利用できます。採用済みの変更として、preview も
全体を検証し、不正入力は表示前に停止します。同名異型・大小文字差を含む出力パス衝突、
force と skip-existing の同時指定も拒否します。
入力エラー時は何も生成しません。実行先の既存ファイル衝突や I/O エラーでは部分生成がありえます。
包含検査は字句上の検査であり、シンボリックリンク経由の逸脱や原子的生成を保証しません。
