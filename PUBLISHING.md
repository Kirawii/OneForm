# 发布 OneForm

仓库地址：https://github.com/Kirawii/OneForm

官网地址：https://kirawii.github.io/OneForm/

项目通过 `.github/workflows/pages.yml` 自动发布 GitHub Pages。每次推送到 `main`，GitHub 会运行测试、重新构建并部署 `docs` 目录。

## 第一次发布

首次推送后，如果 Pages 没有自动启用：

1. 打开仓库的 `Settings`。
2. 在左侧选择 `Pages`。
3. 在 `Build and deployment` 中，将 `Source` 设为 `GitHub Actions`。
4. 打开 `Actions` 页面查看 `Deploy OneForm to GitHub Pages`。

## 发布更新

修改代码后运行：

```bash
npm run check
```

确认测试通过，再提交全部改动。GitHub Pages 会在 `main` 分支更新后重新发布。

## 发布前必须检查

- `docs/oneform.html` 已生成。
- 公开文件中没有任何真实个人资料。
- 官网的“在线使用”和“下载离线版”可以打开。
- 仓库必须保留 `docs/index.html`。

GitHub 官方说明：[配置 GitHub Pages 发布来源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
