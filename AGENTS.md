# AGENTS.md

## 这是原型：验证范围按风险分层，不要默认全量

默认只做第 0 / 第 1 层。**e2e 是"演示前一次性把关"，不是每次改动的默认动作。**
每层只做该层的事，能眼睛看就别跑测试。

### 第 0 层 — 纯界面改动（文案、样式、布局、删叶子节点、调 class）

原型迭代的日常。

- 在 `pnpm dev` 里看一眼。**够了。**
- **不跑 e2e，不跑 vitest。**
- 除非：改动碰了被测试引用的符号（组件 props、store 字段、`data-testid`、被断言的文案），
  或改了跨页共享的 CSS token（`src/styles/global.css`、`src/theme.ts`）→ 往下走。

### 第 1 层 — 改动碰了被测试引用的东西

1. `pnpm verify`（typecheck + lint）。删改符号后这是主要防线（unused 变量 / 导入）。
2. `grep` 涉及的 `data-testid` / 文案 / class 在 `src/`、`e2e/`、`src/tests/` 的全部引用。
3. 只跑命中的 spec，并指向 dev server（**无需 build**）：

   ```sh
   pnpm test:e2e:dev e2e/<file>.spec.ts
   # 端口被占时：E2E_PORT=4199 pnpm test:e2e:dev ...（dev server 会自己拉起）
   # 也可以复用已在跑的 dev server：E2E_PORT=5173 pnpm test:e2e:dev ...
   ```

   用 `-g` 再收窄到用例粒度。

### 第 2 层 — store / 持久化 / 路由 / 状态机

- `pnpm test`（vitest，19 文件约 20s），或只跑相关的：`pnpm exec vitest run src/tests/<file>`

### 第 3 层 — 演示前 / 发布前

- 全量跑一次：`pnpm build && pnpm test && pnpm test:e2e`
- **只有这一层需要 `pnpm build`。**

### e2e 两种模式（重要）

`playwright.config.ts` 的 webServer 由 `E2E_DEV` 切换：

- `pnpm test:e2e:dev`（即 `E2E_DEV=1`）：跑 `vite` dev server，直接服务源码。
  日常迭代用这个，省掉约 100s 的 build。
- `pnpm test:e2e`（默认）：跑 `pnpm preview`，**服务的是 `dist/` 静态产物**。
  跑之前必须先 `pnpm build`，否则测的是上一次构建的旧包（断言只能等到超时）。

其它已知点：

- `reuseExistingServer: true`：`E2E_PORT`（默认 4173）上已有服务会被直接复用，不会重启。
  注意别让 preview 端口撞上 dev server，否则测的不是你以为的那份。
- 已加 `use.actionTimeout: 10s`：定位不到元素 10s 就失败，不再空等到整个 test timeout。
- 全仓只有 2 个用例依赖角色切换、且本身就慢（180–240s 超时）：
  `e2e/mainline.spec.ts:43`、`e2e/daily-and-control.spec.ts:45`。

### 例外

用户明确要求全量，或影响面确实不确定时，跑全量并说明原因。

**背景**：本仓库 e2e 对选择器 / 文案漂移较敏感（见 `77dcaab test(e2e): 修 9 处选择器/文案漂移`）。
用 grep 消除「某条看似无关的 spec 恰好断言了被删元素」的不确定性，比用全量去撞更便宜。
