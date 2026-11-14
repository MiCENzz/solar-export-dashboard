# 光伏出口研究看板

保留原版蓝白配色，按“行业总览 → 环节与市场 → 数据与口径”组织。包含五环节规模、量价趋势、组件区域结构、分国家排名与明细、数据导出和来源定位。当前数据截至2026年9月。

## 发布到GitHub Pages

1. 新建或选择仓库，把本文件夹内的全部文件上传至仓库根目录。源文件采用平铺结构，构建时自动生成网页所需的assets和data目录。务必包括隐藏目录 `.github/workflows/deploy.yml`，不要只上传index.html或ZIP本身。
2. 默认分支使用 `main`。若使用其他分支，同步修改deploy.yml里的branches。
3. 在仓库的 `Settings → Pages → Source` 选择 `GitHub Actions`。
4. 在Actions查看“Publish solar export dashboard”。首次配置后如未自动运行，点击Run workflow。
5. 运行成功后，页面地址为 `https://你的用户名.github.io/仓库名/`。网页的GitHub按钮会指向部署仓库。

发布动作会公开展示网页里的数据。仓库中只放拟展示的数据文件。

GitHub官方部署说明：https://docs.github.com/en/get-started/start-your-journey/deploying-your-website-automatically

## 文件如何对应网页

| 文件 | 内容 | 网页用途 |
| --- | --- | --- |
| index.html | 页面结构 | 三个页面视图 |
| style.css | 蓝白主题、响应式布局 | 全站 |
| app.js | 筛选、计算、图表与导出 | 全站交互 |
| echarts.min.js | 原HTML内的图表库 | 本地加载，无外部CDN |
| monthly.csv | 五环节月度数量、金额、均价 | KPI、累计、同比环比、量价趋势 |
| countries.csv | 分国家月度数量 | 排名、市场占比、明细、历史走势 |
| regions.csv | 组件六区域月度数量 | 区域规模与占比 |
| silicon_suppliers.csv | 硅料累计来源地 | 固定区间进口来源地排名 |
| config.json | 报告月份、原始来源和说明 | 数据截至日期与口径 |
| build.py | CSV校验、生成JSON与静态文件 | GitHub Actions构建 |
| validate.cjs | 计算与数据关系校验 | 发布前验证 |

**真正的数据链路：仓库CSV → 构建脚本 → public/data/dashboard.json → 图表。** HTML没有写死业务数据，GitHub工作流会自动填入仓库地址。仅上传一个index.html不足以运行仓库版；另附的离线HTML已经内嵌所有资源，可直接打开。

## 每月更新

1. 用Excel打开对应CSV，保留列名和UTF-8编码，追加新月份。月份格式为YYYYMM。
2. 更新 `config.json` 中的 `report_month` 和 `prepared_date`。
3. 将修改提交到main分支，Actions自动校验并部署。校验失败时保留上一版线上页面，可在Actions查看具体原因。
4. 分国家或区域的新月份如果还没有数据，可以先不填；网页会显示缺失。不要用0代替未知值。
5. 硅料来源地为单独的累计数据表，更新时同时修改period_start和period_end。
6. config.json里的repository可留空，GitHub部署自动设置。自定义部署环境可以手动填入完整仓库URL。

源Excel未下载成功，本版未实现“直接替换原Excel自动解析”。现在可直接维护标准CSV；确认原Excel的准确sheet与列结构后，再增加Excel导入器即可，页面不需要重写。

## CSV字段

monthly.csv:
- series：guiliao（硅料进口）、guipian（硅片出口）、zujian（组件出口）、dianchi（电池出口）、boli（玻璃出口）。
- month：YYYYMM。
- volume：原始数量。硅料为吨，硅片/组件/电池为MW，玻璃为㎡。
- amount_usd_mn：百万美元；price：硅料美元/kg、组件/电池美元/W。
- unit必须与系列匹配；million_pieces和weight_kg保留原HTML辅助字段，未知留空。

countries.csv:
- series、month、country共同确定一条记录；volume和unit与月度表相同。
- record_type=history表示历史序列，report_supplement表示报告当月额外补充的国家。没有历史不计算同比环比。

regions.csv:
- month、region、volume_mw；每个已填月份须含六大区域。构建脚本检查重复、缺项及合计差异。

silicon_suppliers.csv:
- period_start、period_end、country、amount_usd_mn、volume_tonnes、price_usd_kg。此表固定显示自身统计区间。

空白表示缺失，0表示真实零值。所有数值字段必须非负，不接受百分号或千位逗号文本。

## 计算口径

- 当月同比与环比通过年月匹配计算，不依赖数组位置，也不使用原表同比环比列。
- 年内累计要求1月至观察月的全部记录；累计同比比较上一年同区间。
- 分母为0或缺失时，涨跌幅显示“—”。
- 月度均价保留报告值；累计均价使用累计金额除以累计数量。缺金额时不推算金额或价格。
- 国家占比的分母是同期行业总量，未覆盖国家不被隐含归入已展示国家。
- 所有趋势图展示月度数据，顶部当月/累计控制KPI、排名与明细。
- 原HTML没有分国家价格序列，页面不生成该数据。
- 硅料来源地仅有报告累计数据，固定显示其统计区间，不随观察月切换。

## 来源与已知差异

数据完整提取自用户提供的《【东吴电新】光伏出口数据分析202609.html》内嵌数据。该HTML注明来源为盖锡咨询《202609月产业链出口报告分析.xlsx》。本次未独立打开Excel复核，因此不把HTML页脚的“逐格校验零误差”作为本版核验结论。

原HTML明确注明的sheet有“组件国家历史”和“玻璃出口数据”；其他sheet名不猜测。

本次重新校验发现，2026年1/2/3月组件区域合计分别比组件总量少43.6726/22.2303/82.6555MW。页面保留六区域原值，把差额单独列为“未分配差额”；超过1%的差异或区域明显超额会阻止构建。该差额不是一个新增地理区域。

2025年7月组件金额缺失；2023年1月电池报告均价与金额/数量不一致，保留报告均价。玻璃年度TOP20块不使用，国家排名按历史数量动态计算。更多说明见网页“数据与口径”。

## 本地运行

需要Python3.10+与Node.js，无需安装第三方Python包或npm依赖。

```sh
python3 build.py
node validate.cjs
python3 -m http.server 8000 --directory public
```

访问 http://localhost:8000 。构建时还会在项目父目录生成《光伏出口研究看板.html》，供离线预览。离线版不会自动读取GitHub后续更新，需重新构建。

