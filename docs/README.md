# GitHub Pages 公開手順

1. GitHub のリポジトリ設定を開く
2. Settings → Pages
3. Build and deployment → Source を "Deploy from a branch" にする
4. Branch: `main` / Folder: `/docs` を選択して保存
5. 公開 URL が表示されるので控える

## アプリへの反映

`app.json` の以下を公開URLで差し替えます。

```json
{
  "expo": {
    "extra": {
      "publicWebBaseUrl": "https://<github-username>.github.io/<repo>"
    }
  }
}
```

## ローカル確認

- `docs/index.html` をブラウザで開く
- ヘッダー/フッターのリンクが切れていないか確認
