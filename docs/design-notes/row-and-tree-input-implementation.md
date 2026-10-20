# 行データ・罫線 tree 実装工程記録

2026-10-21、HO-168 の採用済み仕様を実装した。
[先行設計](row-and-tree-input-design.md) と [決定記録](../decisions.md) は、設計工程時点の履歴として保持した。
両文書にある「未実装」「今回実装しない」は先行の設計工程についての記録であり、本実装の状態はこの文書に記録する。

## 実装の流れ

1. 対象の origin、main、HEAD と clean な作業ツリーを確認し、先行設計・既存 parser / validator / generator / CLI / テストを読んだ。
2. 元の物理行・コードポイント列・セル範囲・CSV レコード番号と関連位置を扱う構造化診断を追加した。TreeNode は既存の必須フィールドと呼出し方法を保ち、任意の位置情報を付加した。
3. CSV / Markdown 表のセル解析と共通の全件参照解決、全成分の循環検出を追加した。罫線 tree は構造を組み立ててから兄弟接続子・祖先継続線を照合する。
4. Markdown の対象列挙・選択とコンテナ判別を共通入口にまとめ、選択後の構文エラーからのフォールバックを排除した。
5. preview / validate / create を同じ静的検証へ接続し、生成器でも全体検証と全対象の字句上の包含検査を最初の書込より前に実行するようにした。
6. 6 形式の公開サンプル、単体・CLI 統合テスト、README / USAGE を追加・更新した。

## 採用決定と実装・検証の対応

| 決定 | 実装 | 実行可能な検証 |
| --- | --- | --- |
| D01 / D02 / D06 | rows.ts の厳密な列名、必須列、重複列・方式混在、不正 type の診断 | input.test.ts の header / CSV syntax、row error、reordered columns |
| D03 / D04 | 文字列 ID、空親のみ根、全件索引と入力順の接続 | later parents / string IDs、special root labels、empty directories |
| D05 / D07 | 親パスの明示祖先、単一セグメント名、未正規化の安全検証 | explicit ancestors、unsafe parent paths、whitespace / special root labels |
| D08 | parseCsv、fatal UTF-8 読取、先頭 BOM のみ除去 | BOM / CRLF / quotes / multiline ranges、CSV syntax、CLI malformed UTF-8 |
| D09 | tableCells / parseTable の限定エスケープ、コードスパン認識、平文検査 | table escapes / code pipes / decoration、missing cells / separator count |
| D10 / D11 / D12 / D13 | parseTreeLines の style と接続整合検査 | malformed tree、multiple roots、file-with-child、空行後の位置 |
| D14 | parseInput の拡張子・明示形式の選択 | extension / explicit options、unknown extension、no fallback |
| D15 / D16 | enumerateTargets / selectTarget、共通 CLI オプション | selected top-level candidate / per-kind numbers、fences / quotes / lists / HTML、incompatible options |
| D17 | 構文位置の罫線検出、明示 style、混在拒否 | malformed / mixed tree、explicit indent、branches mismatch |
| D18 | loadInput が全コマンドで validateTree まで実行 | CLI invalid-input tests が preview / validate / create dry-run の結果を比較 |
| D19 | 型に依存しない出力相対パスの小文字キー衝突検査 | same / mixed type / case collision、generator preflight、Unicode 非正規化 |
| D20 | create action の同時指定拒否 | CLI simultaneous overwrite flags、全 6 入力の default / skip / force |
| D21 | 意味エラーの集約、CSV・表・tree の構文停止、全成分巡回 | independent semantic errors、複数の独立循環、unselected broken table |
| D22 | SourceRange / Diagnostic / InputError、セル・ノード対応、生成診断 | codepoint columns / multiline ranges / records / related locations、control escaping、write failure source |

設計 §8 の正常な 6 入力は examples の実ファイルを単体・統合テストから読み込む。
共通の 4 ノードと順序を確認し、各入力の preview / validate / dry-run / 実生成、テンプレート、
既定の既存ファイル衝突、skip / force を一時ディレクトリで検証する。
不正 CSV・表・tree と入力内衝突では、出力先が未作成であること、既存ファイルが force 指定でも
変化しないことを確認する。既存 example-structure.md と従来の公開 parser 呼出しも回帰対象に含めた。

## 検証と制約

- `npm test`: 7 ファイル、95 件成功（既存テストを含む）。
- `npm run build`: 成功。
- `git diff --check`: 成功。
- 既存のローカル依存を使用した。依存インストール・ネットワークアクセスは行っていない。
- 初期の subprocess 方式は sandbox の同期起動 EPERM と非同期 pipe 出力取得の制約で失敗した。
  CLI 統合テストは実行ファイルと同じ runCli 関数を同一プロセスで呼び、実際の Commander 引数解析・
  非ゼロの結果コード・実ファイル I/O を検証する形にした。src/cli/index.ts はその結果を process.exitCode に渡す。
  独立した OS プロセスからの標準出力・終了コード観測はホストで追加確認できる。
- 診断の範囲終端は排他的。CSV の改行セルと Markdown 元文書の位置を保持する。
- Markdown は今回の限定された表・フェンス構文を扱う。任意の Markdown 拡張を解釈する実装ではない。
- 名前の大小文字比較は JavaScript の toLowerCase による。Unicode 正規化や全ファイルシステム固有の同一性は保証しない。
- 生成器は逐次 I/O。実行先状態の衝突や I/O エラーでは部分生成があり、ロールバックを実装していない。
  包含検査は字句上の検査であり、シンボリックリンクの完全な防御は追加していない。
- テンプレート機構の拡張、npx / グローバル対応、CRUD 展開は追加していない。
- ステージ・コミット・push・PR・公開操作は行っていない。


## 2026-10-21 レビュー指摘の修正（D09 / D15・D16）

採用済み仕様の範囲で、次の2件を修正した。先行設計書と決定記録は変更していない。

- **D09**: 強調記号の対応と前後の空白・句読点を判定し、`_bold_.txt` と
  `pre**bold**post` を対象セルの `CELL_DECORATION` として拒否する。
  語中のアンダースコア（`snake_case`、`a_b_c.txt`、`pre__bold__post`）は受理する。
  ID / 親 ID / 親パス / name / type の診断に、列名・原値・元行・対象番号が残ることを確認した。
  CSV の値と無関係な追加列の扱いは維持した。
- **D15 / D16**: `blockquote` を含む標準的なブロックタグの開始・終了タグ、大小文字、
  属性とタグ名境界を補完した。空行終端のブロックと、script / pre / style / textarea、
  コメント、処理命令、宣言、CDATA の専用終端を区別する。
  独立行の汎用タグは段落を中断しない。表の直後に続く HTML ブロック開始は表の境界として扱い、
  ブロック開始に該当しない通常の表行（先頭パイプ付きの行など）の HTML セルはセル検証で拒否する。
  HTML 内の tree と候補表を番号から除外し、境界後の tree / 表の番号と元行を保持する。

単体テストは強調の正常・異常例と HTML ブロック種別の境界をパラメータ化した。
HTML 内の例に続くトップレベル tree を自動選択と `tree:1` の両方で確認し、
後続の表が `table:1` になることも確認した。既存のフェンス・引用・リスト回帰テストも通過した。
CLI 統合テストでは、強調セルの不正入力について preview / validate / create dry-run が
非ゼロになり、force 指定でも出力先を作成せず、既存ファイルを変更しないことを確認した。
HTML 後の tree の自動選択と `--source tree:1` による明示選択も実ファイル入力で確認した。
README / USAGE に対象番号の除外規則と具体的な強調・アンダースコアの例を追記した。

修正後の実行結果:

- `npm test`: 7 ファイル、210 件成功。
- `npm run build`: 成功。
- `git diff --check`: 成功。
- 既存のローカル依存のみ使用。依存追加・インストール・ネットワークアクセスは行っていない。
- ステージ・コミット・push・PR・リリース・公開操作は行っていない。

## 2026-10-21 再レビュー指摘の修正（表直後の HTML 境界）

表本文の走査でパイプの有無を HTML 開始より優先していたため、空行なしで続く
`<blockquote title="a|b">` が表行として消費され、内部の tree が候補番号に含まれていた。
既存の `htmlBlockEnd` を使ってブロック開始を先に判定し、境界行を外側の走査で再処理して
HTML 終端管理へ渡すようにした。表は段落と異なるため、独立行の汎用タグも表を終了する。
既存のフェンス・引用・リスト・見出し境界に加えて水平線を確認した。
ブロック開始に該当しない行はパイプがなくてもセル検証へ送り、`COLUMN_COUNT` の診断を維持する。

単体テストでは先行表、パイプ付き HTML 開始行、内部 tree、終端・空行、後続 tree を並べ、
列挙結果・元行・種類ごとの番号を確認した。自動選択と `tree:1` は後続 tree を、
`table:1` は先行表だけを選ぶ。汎用タグ・専用終端のタグ・コメントも同じ境界条件で検証した。
先頭セルの HTML 拒否テストは先頭パイプ付きに変更し、`CELL_DECORATION` と元行・列の検証を維持した。
CLI 統合テストでも同じ blockquote 入力を実ファイルから読み、preview / validate の
自動選択と `--source tree:1` を確認した。採用済み仕様書と決定記録は変更していない。

今回の実行結果:

- `npm test`: 7 ファイル、224 件成功。
- `npm run build`: 成功。
- `git diff --check`: 成功。
- 既存のローカル依存のみ使用。依存インストール・ネットワークアクセスは行っていない。
- ステージ・コミット・push・PR・リリース・公開操作は行っていない。
