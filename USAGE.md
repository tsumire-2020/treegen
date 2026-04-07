# Treegen CLI セットアップ & 利用ガイド

このドキュメントは、`treegen` CLI をローカル環境にセットアップし、Markdown の `tree` コードブロックからディレクトリ／ファイル構成を生成するまでの手順をまとめたものです。

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

```md
```tree
project/
  src/
    index.ts
  README.md
```
```

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
