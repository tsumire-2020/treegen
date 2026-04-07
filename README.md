# treegen

Markdown の `tree` コードブロックからディレクトリ／ファイル構成を生成する TypeScript CLI です。設計ドキュメントに書いた構成を、そのまま安全にローカルへ反映できます。

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

`npm run preview/validate/create` を使うと、ローカルビルド済みの CLI をそのまま実行できます。

---

## プロジェクト構成

- `src/parser`: Markdown から `tree` ブロックを抽出し、インデント付きテキストを `TreeNode` に変換
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
