# pre-release-database-cdb

MyCard 超先行卡仓库。

## 资源

### 表格

#### 先行卡认领、进度与 Bug 反馈表格

https://docs.qq.com/sheet/DWndsYXFjc3pkZmtM

#### 更新流程和操作

https://docs.qq.com/doc/DWmlPRmx4YVpyZXdk

### 资源下载

#### YPK

https://cdn02.moecube.com:444/ygopro-super-pre/archive/ygopro-super-pre.ypk

#### 直接下载特定资源

`https://cdn02.moecube.com:444/ygopro-super-pre/data/<filename>`

#### 版本检测文件

https://cdn02.moecube.com:444/ygopro-super-pre/versions/master/version.txt
https://cdn02.moecube.com:444/ygopro-super-pre/versions/master/test-release-v2.json

### 服务器

- 地址 `mygo.superpre.pro` `mygo2.superpre.pro`
- 超先行端口 `888`
  - 主程序，内核为 ygopro 正式版本
  - 脚本为正式版本 + `ygopro-scripts-888`
  - 有先行卡
- 内核测试端口 `8888`
  - 主程序，内核，脚本均为各库 `develop` 分支
  - 无先行卡

## CDB 合并器

为了方便 cdb 文件的合并，本仓库提供了 `.gitattributes` 和 `setup.bat` `setup.sh` 脚本。

只需要运行，即可启用 cdb 的 git 合并和变动的操作的功能。

## 测试类型

### 超先行测试

超先行脚本完成之后，在本仓库开 PR。

超先行提交可以提交轻度修改关联正式卡脚本，但是请不要提交过多的修改。因超先行新卡而提交的正式卡修改，请列入 `test-update.cdb` 内。

提交之后，系统会自动更新在 888 服务器。打 tag 则推送客户端发布。

**不允许提交 constant.lua utility.lua procedure.lua 等核心脚本的修改。** 如果需要测试这些内容，请以「脚本机制测试」的方式进行。

每次 YGOPro 正式更新，需要删除本仓库内已经正式更新的超先行卡以及正式卡修改。

本方法测试的 BUG 进度在表格的「群内先行写卡&自测」标签页追踪。

### 脚本机制测试

对于不影响 ocgcore 或者 ygopro 主程序的脚本机制测试，可以在本项目进行。步骤如下。

- （可选但建议）在 https://github.com/Fluorohydride/ygopro-scripts 提交相关的脚本 PR。
- 把 PR 的分支合并到 https://code.moenext.com/mycard/ygopro-scripts-888 内。
- 在本仓库创建 `script-fix-xxx.cdb` 列出正在测试的卡。
- 如果需要修改提示文本等，请在 `test-update-xxx.cdb` 列出正在测试的卡。

完成上述步骤后，`ygopro-scripts-888` 分支和正式脚本库的差异部分，会自动更新到 888 服务器。

每次 YGOPro 正式更新，需要把 `ygopro-scripts-888` 仓库 reset 到最新的正式脚本版本。

本方法测试的 BUG 进度在表格的「内核更新测试记录」标签页追踪。

### 内核测试

用于测试影响内核变动的内容。步骤如下。

- **（这一步不可省略）在 Fluorohydride 各库提交 PR。**
- 合并 PR 所在分支到下列仓库的 develop 和 server-develop 分支。
  - https://github.com/mycard/ygopro-core
  - https://github.com/mycard/ygopro-scripts
  - https://code.moenext.com/mycard/ygopro
- 通知相关人员进行整合到 8888 服务器。

本方法测试的 BUG 进度在表格的「内核更新测试记录」标签页追踪。

### 自动化测试

进行测试之后，请把相关的 yrp 录像文件放置在 `tests/yrp` 目录内。日后系统自动化测试将会运行这些 yrp 回放文件，避免后续重复脚本故障。

如果 yrp 是使用残局运行的，那么请把对应的残局文件放在 `tests/single` 目录内（请不要改残局名字）。

#### 环境准备

如果需要做 yrp 固化或者运行测试本身，那么需要在本目录内准备下列文件，并准备好 Node.js 环境，运行 `npm ci` 安装必要 js 依赖，确保测试框架正常运行。

- `ygopro/cards.cdb`
- `ygopro/script`

不需要额外放入超先行卡数据或者 ypk。超先行卡数据会从根目录读取。

#### yrp 固化

默认情况下，测试 yrp 只测试「YRP 是否能正常运行」，不会测试「能否复现特定的游戏状态」。如果需要测试特定的游戏状态，请使用 `freezeyrp` 脚本把 yrp 固化。

```bash
npm run freezeyrp <name1> <name2> ...
```

例如

```bash
npm run freezeyrp sample
```

这会读取 `tests/yrp/sample.yrp` 文件，在项目内创建 `tests/yrp-info/sample.yaml` 文件，记录 `sample.yrp` 的游戏状态。之后每次运行测试时，系统会把 `sample.yrp` 固化成 `sample.yaml` 记录的状态，进行更为严格的检查。

#### jstest api

对于使用 jstest api 创建的 `spec.ts` 测试文件，请放在 `tests/specs` 目录内。系统会自动运行这些测试文件。
