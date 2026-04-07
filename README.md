# treegen

Markdown の `tree` コードブロックから、フォルダ・ファイル構成を生成する TypeScript CLI のひな形です。

## 目的

- 設計用 Markdown に書いた構成をそのままディレクトリへ反映する
- dry-run / validate / create を分けて安全に扱う
- 将来的にテンプレート適用や GUI 化へ拡張しやすい構成にする

## 想定入力

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

## コマンド

```bash
treegen preview --input ./structure.md
treegen validate --input ./structure.md
treegen create --input ./structure.md --output ./sandbox
```

## セットアップ

```bash
npm install
npm run build
npm run preview -- --input ./examples/structure.md
```

## 実装方針

- `src/parser`: Markdown から `tree` ブロックを抽出して構造化
- `src/domain`: 型・バリデーション・ドメインルール
- `src/generator`: ディレクトリ・ファイル生成
- `src/commands`: CLI コマンド単位のオーケストレーション
- `templates/`: 将来的なファイル初期テンプレート

## 注意

この段階のコードは「実装骨組み + 主要ロジックの下地」です。
一部はコメント中心で、今後の実装前提になっています。
