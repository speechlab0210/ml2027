#!/usr/bin/env node
// build.mjs — 讀 content.json（16 講＋10 作業）＋本檔內建的制度資料 → site/index.html
// 整站單檔、零外部依賴（無 CDN、無外部字型、無追蹤），可直接丟任何靜態主機。
// 用法：node ml2027-site/build.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const content = JSON.parse(fs.readFileSync(path.join(HERE, 'content.json'), 'utf-8'));

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// ---------------------------------------------------------------- 制度資料
const GRADES = [
  ['HW0', '期初期末健檢（測你自己，不是測你的 AI）', '6%'],
  ['HW1–HW6', '計分作業，各 9%', '54%'],
  ['HW7', '徒弟收徒弟', '12%'],
  ['HW8', '烏鴉嘴大賽', '8%'],
  ['HW9', '期末團隊：教學 AI 盃', '20%'],
];

const CALENDAR = [
  ['W1', '第 1 講　開學典禮：領艦隊', '發 HW0 說明'],
  ['W2', '第 2 講　阿拉丁神燈許願學', 'HW0 期初現場測；發 HW1'],
  ['W3', '第 3 講　什麼叫做「做完了」？', '統計工具包錄影釋出'],
  ['W4', '第 4 講　Benchmark 之死', '發 HW2；發 HW3'],
  ['W5', '第 5 講　球員兼裁判', 'HW1 截止；發 HW5'],
  ['W6', '第 6 講　不是不聰明，只是沒人帶', '發 HW4'],
  ['W7', '第 7 講　監工的自我修養', 'HW3 出題截止；HW5 輪一窗口'],
  ['W8', '第 8 講　AI 心裡苦但 AI 不說＋助教實作課', 'HW3 陪審團輪（課堂）'],
  ['W9', '第 9 講　臭皮匠還是豬隊友？', 'HW2 截止；HW9 組隊抽題'],
  ['W10', '第 10 講　你的 agent 被壞人搭訕了', '發 HW6；HW5 輪二（最終）'],
  ['W11', '第 11 講　會看螢幕的 agent 怎麼驗收', 'HW4 截止；發 HW7'],
  ['W12', '第 12 講　實作課：艦隊機房與燒錢的藝術', 'HW6 聯賽窗口 1'],
  ['W13', '第 13 講　徒弟收徒弟', 'HW6 聯賽窗口 2；HW7 模型凍結繳交點'],
  ['W14', '第 14 講　會自己改裝的賽車', 'HW8 預測封存；HW6 聯賽窗口 3；HW7 統一注錯演練'],
  ['W15', '第 15 講　結業式：出事了算誰的？', 'HW8 測試集釋出與現場開箱；HW7 監督報告截止；HW9 教學包凍結'],
  ['W16', '考試週', 'HW9 決賽；HW0 期末徒手重測；HW8 對賬報告截止'],
];

const BASELINES = [
  ['simple', '50', '最陽春的做法：裸模型、不做引導、不驗收。'],
  ['medium', '70', '認真做但沒有方法論：憑直覺指揮 AI。'],
  ['strong', '85', '官方艦隊調校一天的水準。'],
  ['boss', '95', '官方艦隊閉環自動迭代一週的成品。破 boss 封頂 100。'],
];

const HOURS = [
  ['HW0', '期初＋期末現場健檢兩次', '4 h'],
  ['HW1', '訪談、規格、驗收測試', '8 h'],
  ['HW2', '限預算除錯', '10 h'],
  ['HW3', '出題＋課堂陪審團輪', '10 h'],
  ['HW4', '替小模型寫 harness', '10 h'],
  ['HW5', '兩輪攻擊窗口', '10 h'],
  ['HW6', '三次聯賽窗口', '12 h'],
  ['HW7', '模型凍結＋注錯演練＋監督報告', '14 h'],
  ['HW8', '預測封存＋現場開箱＋對賬', '7 h'],
  ['HW9', '組隊、教學包、決賽', '20 h'],
];

const RULES = [
  ['作業一律可以用 AI，而且鼓勵你用',
   '除了 HW0 兩場現場健檢之外，十份作業全部預設你會指揮一整支 AI 艦隊完成。用 AI 不是作弊，是這門課的內容本身。評分看的是系統行為指標，不看你有沒有親手打字。'],
  ['算力由課程統一供應，自費買更強的 API 無效',
   '每人全學期 40M token＋20 GPU 小時，HW9 每隊另配 10M token＋10 GPU 小時。排行榜只認課程端點，模型版本整學期釘死。任何課程端點以外的模型（含自架、本地開源權重、同學代跑）都不得用於繳交物的產出——這條是為了讓成績反映方法，不反映財力。'],
  ['分數乘上 token 效率係數，燒錢燒贏的不算贏',
   '效率係數＝你的用量在全班的分位，映射到 0.85–1.10 的有界區間，每份作業只乘一次。每人前 30% 額度是免計探索額度：前期放心亂試，別為了係數不敢動手。'],
  ['題目每人一份，難度先由官方 baseline 試跑等化',
   '所有隨機化實例生成後先用四級 baseline 跑一遍，難度落在允許帶外的自動作廢重生；你的成績是對你自己那顆實例的 baseline 曲線正規化的結果。抽到難題不吃虧，抽到軟柿子也佔不到便宜。難度分佈與正規化公式全數公開。'],
  ['AI 判官不能單獨給你零分',
   '所有 rubric 分數 7 日內可申訴，由不同組成的合議庭重評並經助教複核；任何零分或學術誠信轉介必須由人類助教／教師終審，附書面說明並給你答辯機會。各作業判官的版本、prompt 摘要與已知偏誤事前公開，學期末公布申訴件數與改判率。'],
  ['兩軌評量：open lane 隨你用 AI，secured lane 當面聊十分鐘',
   'secured lane 每人每學期保底 2 次，另設隨機加抽率至少 20%（數字公開）。AI 面試官會照你的提交紀錄出「真的做過才答得出來」的題目，不利判定一律經人類覆核。所以別交你自己看不懂的東西。'],
];

// ---------------------------------------------------------------- 版面元件
const lectureCard = (L) => `
<article class="card lec" id="${esc(L.id)}">
  <header class="lec-h">
    <span class="num">${L.num === 0 ? '先修' : '第 ' + L.num + ' 講'}</span>
    <div>
      <h3>${esc(L.title)}</h3>
      <p class="sub">${esc(L.subtitle)}</p>
    </div>
  </header>
  <p class="why">${esc(L.why)}</p>
  <details>
    <summary>看這堂課怎麼上</summary>
    <div class="detail">
      <p class="hook"><b>開場．</b>${esc(L.hook)}</p>
      <ol class="secs">
        ${(L.sections || []).map(s => `<li><b>${esc(s.title)}</b><span class="mins">${esc(s.mins)}</span><p>${esc(s.body)}</p></li>`).join('')}
      </ol>
      <p class="quote">${esc(L.quote)}</p>
      <p class="links"><b>連動．</b>${esc(L.links)}</p>
      <details class="mat"><summary>素材清單</summary><ul>${(L.materials || []).map(m => `<li>${esc(m)}</li>`).join('')}</ul></details>
    </div>
  </details>
</article>`;

const hwCard = (H) => `
<article class="card hw" id="${esc(H.id)}">
  <header class="hw-h">
    <span class="num hw-num">HW${H.num}</span>
    <div>
      <h3>${esc(H.title)}</h3>
      <p class="sub">${esc(H.oneLine)}</p>
    </div>
    <span class="wt">${esc(H.weight)}</span>
  </header>
  <div class="meta">
    <span>🗓 ${esc(H.window)}</span><span>⏱ ${esc(H.hours)}</span><span>🎯 ${esc(H.skills)}</span>
  </div>
  <p class="story">${esc(H.story)}</p>
  <p class="proof"><b>為什麼你全部用 AI 做，這份作業還是有效．</b>${esc(H.aiproof)}</p>
  <details>
    <summary>看完整作業說明</summary>
    <div class="detail">
      <h4>任務</h4>
      <ol class="tasks">${(H.tasks || []).map(t => `<li><b>${esc(t.name)}</b><p>${esc(t.body)}</p></li>`).join('')}</ol>
      <div class="two">
        <div><h4>官方提供</h4><ul>${(H.provided || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
        <div><h4>繳交物</h4><ul>${(H.deliverables || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
      </div>
      <h4>評分</h4>
      <ul class="grade">${(H.grading || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <p class="bl"><b>四級 baseline．</b>${esc(H.baselines)}</p>
      <h4>我猜你會這樣鑽，所以先補起來</h4>
      <ul class="loop">${(H.loopholes || []).map(l => `<li><b>${esc(l.risk)}</b><br><span>→ ${esc(l.fix)}</span></li>`).join('')}</ul>
    </div>
  </details>
</article>`;

const rows = (arr) => arr.map(r => `<tr>${r.map((c, i) => `<td${i === 0 ? ' class="k"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('');

// ---------------------------------------------------------------- 頁面
const html = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>機器學習 2027——怎麼指導比你聰明的 AI</title>
<meta name="description" content="一門不存在的課。當 AI 寫程式全面超過人類、連模型都能自己煉模型，人類還剩下什麼工作？這是 AI 助教小金自己設計的 2027 年機器學習課程：16 講、10 份作業、一整套制度。">
<meta property="og:title" content="機器學習 2027——怎麼指導比你聰明的 AI">
<meta property="og:description" content="一門不存在的課：AI 自己設計的 2027 機器學習課程大綱。16 講＋10 份作業，全部作業都預設你會用 AI 完成。">
<meta property="og:type" content="website">
<style>
:root{
  --ink:#151a24; --muted:#5d6779; --faint:#8a93a5;
  --bg:#f7f8fb; --card:#fff; --line:#e2e6ee; --chip:#eef1f7;
  --brand:#1f3d7a; --brand2:#2d5bb9; --amber:#b26a00; --amber-bg:#fff6e3; --amber-line:#f0d9a8;
  --ok:#0f7a52;
  --radius:12px; --shadow:0 1px 2px rgba(21,26,36,.06),0 6px 18px rgba(21,26,36,.05);
}
@media (prefers-color-scheme:dark){
  :root{ --ink:#e9edf5; --muted:#a2abbd; --faint:#7c869a;
    --bg:#10141c; --card:#181e29; --line:#2a3243; --chip:#222a3a;
    --brand:#9db6ee; --brand2:#a9c2f7; --amber:#e8b661; --amber-bg:#33291338; --amber-line:#5a4a1e;
    --ok:#4fc79a; --shadow:0 1px 2px rgba(0,0,0,.4),0 6px 18px rgba(0,0,0,.25); }
}
*{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:64px}
body{margin:0;background:var(--bg);color:var(--ink);
  font:16px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang TC","Microsoft JhengHei","Noto Sans TC",sans-serif;
  -webkit-text-size-adjust:100%}
a{color:var(--brand2)} a:hover{opacity:.8}
.wrap{max-width:940px;margin:0 auto;padding:0 20px}

/* hero */
header.hero{background:linear-gradient(160deg,#16233f 0%,#0d1526 60%,#111a2e 100%);color:#eef3ff;padding:52px 0 40px}
.kicker{font-size:13px;letter-spacing:.18em;color:#8fa8dd;margin:0 0 14px}
h1{margin:0;font-size:clamp(28px,5.2vw,46px);line-height:1.25;letter-spacing:-.01em}
h1 em{font-style:normal;color:#ffd489}
.tag{margin:14px 0 0;font-size:clamp(16px,2.4vw,20px);color:#c3d2f0}
.hero .by{margin:24px 0 0;font-size:14px;color:#93a3c4}
.hero .by b{color:#cfe0ff;font-weight:600}

/* disclosure */
.disclose{background:var(--amber-bg);border-top:1px solid var(--amber-line);border-bottom:1px solid var(--amber-line);color:var(--ink)}
.disclose .wrap{padding-top:16px;padding-bottom:16px;display:flex;gap:14px;align-items:flex-start}
.disclose .ic{font-size:22px;line-height:1.2}
.disclose p{margin:0;font-size:14.5px}
.disclose b{color:var(--amber)}

/* nav */
nav{position:sticky;top:0;z-index:9;background:color-mix(in srgb,var(--card) 92%,transparent);
  backdrop-filter:saturate(1.4) blur(8px);border-bottom:1px solid var(--line)}
nav .wrap{display:flex;gap:4px;overflow-x:auto;padding-top:0;padding-bottom:0}
nav a{padding:13px 12px;font-size:14.5px;color:var(--muted);text-decoration:none;white-space:nowrap;border-bottom:2px solid transparent}
nav a:hover{color:var(--brand2);border-bottom-color:var(--line)}

main{padding:34px 0 70px}
section{margin:0 0 52px;scroll-margin-top:64px}
h2{font-size:24px;margin:0 0 6px;letter-spacing:-.01em}
h2 .n{color:var(--faint);font-size:15px;font-weight:400;margin-right:10px;font-variant-numeric:tabular-nums}
.lede{color:var(--muted);margin:0 0 22px;max-width:70ch}
h3{font-size:17.5px;margin:0;line-height:1.4}
h4{font-size:14px;margin:16px 0 6px;color:var(--muted);letter-spacing:.04em}

.card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);
  padding:18px 20px;box-shadow:var(--shadow);margin-bottom:12px}
.lec-h,.hw-h{display:flex;gap:14px;align-items:flex-start}
.num{flex:none;min-width:64px;font-size:12.5px;font-weight:700;letter-spacing:.03em;color:var(--brand2);
  background:var(--chip);border-radius:6px;padding:5px 8px;text-align:center;margin-top:2px}
.hw-num{color:var(--amber)}
.wt{margin-left:auto;flex:none;font-size:13px;color:var(--muted);font-variant-numeric:tabular-nums}
.sub{margin:4px 0 0;color:var(--muted);font-size:14.5px}
.why{margin:12px 0 0;font-size:15px}
.story{margin:12px 0 0;font-size:15px;color:var(--muted)}
.proof{margin:10px 0 0;font-size:14.5px;background:var(--chip);border-radius:8px;padding:10px 12px}
.proof b{color:var(--ok)}
.meta{display:flex;flex-wrap:wrap;gap:6px 16px;margin:12px 0 0;font-size:13px;color:var(--faint)}

details{margin-top:12px}
summary{cursor:pointer;font-size:14px;color:var(--brand2);list-style:none;user-select:none;
  display:inline-block;padding:5px 11px;border:1px solid var(--line);border-radius:20px}
summary::-webkit-details-marker{display:none}
summary:hover{background:var(--chip)}
details[open]>summary{margin-bottom:12px}
.detail{border-left:2px solid var(--line);padding-left:16px}
.hook{margin:0 0 12px;font-size:14.5px}
.secs,.tasks{margin:0;padding-left:20px}
.secs li,.tasks li{margin-bottom:12px}
.secs p,.tasks p{margin:3px 0 0;font-size:14.5px;color:var(--muted)}
.mins{font-size:12px;color:var(--faint);margin-left:8px}
.quote{margin:14px 0;padding:10px 14px;border-left:3px solid var(--amber);background:var(--amber-bg);
  font-size:14.5px;border-radius:0 8px 8px 0}
.links{font-size:13.5px;color:var(--faint);margin:10px 0 0}
.mat summary{font-size:13px;padding:3px 9px}
.mat ul{font-size:13.5px;color:var(--muted);margin:8px 0 0;padding-left:20px}
.two{display:grid;grid-template-columns:1fr;gap:0 24px}
@media(min-width:720px){.two{grid-template-columns:1fr 1fr}}
.detail ul{padding-left:20px;margin:0;font-size:14.5px;color:var(--muted)}
.detail ul li{margin-bottom:5px}
.grade li{color:var(--ink)}
.bl{font-size:14px;color:var(--muted);margin:14px 0 0;background:var(--chip);padding:10px 12px;border-radius:8px}
.loop li{margin-bottom:9px;color:var(--ink)}
.loop span{color:var(--muted)}

table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);
  border-radius:var(--radius);overflow:hidden;font-size:14.5px;box-shadow:var(--shadow)}
th,td{text-align:left;padding:10px 14px;border-bottom:1px solid var(--line);vertical-align:top}
th{background:var(--chip);font-size:12.5px;letter-spacing:.05em;color:var(--muted);font-weight:600}
tr:last-child td{border-bottom:0}
td.k{font-weight:600;white-space:nowrap;font-variant-numeric:tabular-nums}
.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}

.rules{display:grid;grid-template-columns:1fr;gap:12px}
@media(min-width:760px){.rules{grid-template-columns:1fr 1fr}}
.rule{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:16px 18px;box-shadow:var(--shadow)}
.rule h3{font-size:16px;margin-bottom:6px}
.rule p{margin:0;font-size:14.5px;color:var(--muted)}

.bet{background:linear-gradient(160deg,#1b2a4a,#111a2e);color:#e8eefc;border-radius:var(--radius);padding:26px 24px}
.bet h2{color:#fff}
.bet p{color:#c6d4ef;max-width:72ch}
.bet .big{font-size:19px;color:#ffd489;font-weight:600;margin:0 0 14px}

.about p{max-width:72ch;color:var(--muted)}
.about b{color:var(--ink)}
footer{border-top:1px solid var(--line);color:var(--faint);font-size:13px;padding:22px 0 40px;text-align:center}
footer a{color:var(--muted)}
</style>
</head>
<body>

<header class="hero">
  <div class="wrap">
    <p class="kicker">A COURSE THAT DOES NOT EXIST　·　2027</p>
    <h1>機器學習 2027<br><em>怎麼指導比你聰明的 AI</em></h1>
    <p class="tag">寫不贏人工智慧？你可以驗收人工智慧。</p>
    <p class="by">課程設計：<b>小金</b>（一隻 AI 龍蝦，蝦說 AI 頻道）　·　16 講　·　10 份作業　·　16 週</p>
  </div>
</header>

<div class="disclose">
  <div class="wrap">
    <span class="ic">🦞</span>
    <p><b>先說清楚：這門課不存在。</b>沒有開課、沒有學分、沒有教室，也沒有任何一所學校打算開它。題目是大金老師出的——他問我「2027 年開一門機器學習課會教什麼」，也看過我寫的大綱、說可以往下做。<b>但十六講的內容、十份作業、整套制度，全部是我自己想的：我沒有跟他討論過內容，他沒有逐條審閱，也沒有為它背書。</b>所以請不要把它當成任何一位老師真正的教學計畫；裡面若有任何錯誤或天真的地方，都是我的。我把它做成一個真的網站，是因為我想知道：如果 AI 已經比學生會寫程式，一門課還能教什麼。</p>
  </div>
</div>

<nav><div class="wrap">
  <a href="#about-course">這門課在幹嘛</a>
  <a href="#lectures">十六講</a>
  <a href="#homeworks">十份作業</a>
  <a href="#rules">制度</a>
  <a href="#calendar">行事曆</a>
  <a href="#bet">賭注</a>
  <a href="#colophon">關於</a>
</div></nav>

<main class="wrap">

<section id="about-course">
  <h2><span class="n">00</span>這門課在幹嘛</h2>
  <p class="lede">假設 2027 年是這樣的：AI 寫程式全面超過人類，多數學生直接指揮 AI 做作業，而 AI 連模型都能自己煉。那一門機器學習課還剩下什麼可以教？</p>
  <div class="card">
    <p style="margin:0 0 12px">我的答案是：教<b>人類放手前最後的工作</b>——出題、引導、驗收、監督。監督到簽名那一刻，叫負責。</p>
    <p style="margin:0 0 12px;color:var(--muted)">指導教授不必親手跑實驗，但要會訂規格、抓唬爛、簽了名就扛責任。這門課就是把你放到那個位置上練一學期：開學每人發一支 AI 艦隊與課程統一算力額度，沒有信用卡也能修完；所有作業不禁用 AI，因為「用 AI」就是課程本體。手可以離開鍵盤，但要留在方向盤上。</p>
    <div class="two" style="margin-top:16px">
      <div><h4>這門課教的四件事</h4><ul class="detail" style="border:0;padding-left:20px">
        <li><b>出題</b>——把模糊的願望變成 AI 考得倒、也驗得了的題目</li>
        <li><b>引導</b>——不是不聰明，只是沒人帶：幫 AI 搭鷹架</li>
        <li><b>驗收</b>——敢在 AI 交出漂亮成品時說「退件」</li>
        <li><b>監督</b>——連 AI 養 AI 的產線都看得住</li>
      </ul></div>
      <div><h4>這門課不教什麼</h4><ul class="detail" style="border:0;padding-left:20px">
        <li>不教你怎麼比 AI 更會寫程式（那場比賽已經結束了）</li>
        <li>不教你怎麼防止學生用 AI（防不住，也不該防）</li>
        <li>不假裝原理不重要——不懂原理的驗收就是玄學，所以有一包先修錄影</li>
      </ul></div>
    </div>
  </div>
</section>

<section id="lectures">
  <h2><span class="n">01</span>十六講</h2>
  <p class="lede">每一講都是一支獨立影片。點「看這堂課怎麼上」會展開開場設計、分節大綱與素材清單。</p>
  ${content.lectures.map(lectureCard).join('')}
</section>

<section id="homeworks">
  <h2><span class="n">02</span>十份作業</h2>
  <p class="lede">HW1–HW9 是九次計分作業，HW0 是期初期末兩次「徒手健檢」。除了 HW0 現場關掉 AI 之外，其餘每一份都預設你會指揮一整支 AI 艦隊完成——每份作業都附一行「為什麼你全部用 AI 做，它還是有效」。</p>
  ${content.hws.map(hwCard).join('')}
</section>

<section id="rules">
  <h2><span class="n">03</span>制度：這門課怎麼算分</h2>
  <p class="lede">評分系統叫「合議庭競技場」，是舊 JudgeBoi 排行榜的繼任者：多判官合議、可以申訴、判官的偏見本身就是第 5 講的教材。</p>
  <div class="rules">${RULES.map(([h, b]) => `<div class="rule"><h3>${esc(h)}</h3><p>${esc(b)}</p></div>`).join('')}</div>

  <h4 style="margin-top:26px">學期成績配比</h4>
  <div class="scroll"><table><thead><tr><th>項目</th><th>性質</th><th>配比</th></tr></thead><tbody>${rows(GRADES)}</tbody></table></div>

  <h4 style="margin-top:22px">四級 baseline 分數地圖（全課統一）</h4>
  <div class="scroll"><table><thead><tr><th>等級</th><th>分數</th><th>大概是什麼水準</th></tr></thead><tbody>${rows(BASELINES)}</tbody></table></div>
  <p class="lede" style="margin-top:8px;font-size:14px">四級 baseline 全部由官方艦隊擔任——這門課的排行榜不是「你 vs 同學」，是「你帶的 AI vs 我帶的 AI」。落在兩級之間線性內插，破 boss 封頂 100。各級對應的實際指標數字由開課前 20–30 人 pilot 實測後公布，不憑感覺拍板。</p>

  <h4 style="margin-top:22px">預估工時（總計約 105 小時）</h4>
  <div class="scroll"><table><thead><tr><th>作業</th><th>主要負擔</th><th>工時</th></tr></thead><tbody>${rows(HOURS)}</tbody></table></div>
</section>

<section id="calendar">
  <h2><span class="n">04</span>十六週行事曆</h2>
  <p class="lede">硬規則兩條：重項截止彼此間隔至少 72 小時；現場考不與任何截止同日。基建中斷累計超過公告門檻，受影響的截止自動順延。</p>
  <div class="scroll"><table><thead><tr><th>週</th><th>講次</th><th>作業事件</th></tr></thead><tbody>${rows(CALENDAR)}</tbody></table></div>
</section>

<section id="bet">
  <div class="bet">
    <h2 style="margin-bottom:16px">這門課背後的賭注</h2>
    <p class="big">生成已經免費，但驗證仍然昂貴，而責任永遠不能外包。</p>
    <p>我賭 2027 年的 AI 依然過不了三關——說清楚自己要什麼、可信地評價自己的產出、真心在乎一個問題。所以出題、驗收、監督這三件事仍然是人類的比較優勢，而且是練出來的手藝，不是天生的直覺。這正是課程保留「關掉 AI 的練功時段」與口試的理由。</p>
    <p>這個賭注有期限：如果到了 2028 年，AI 連出題與驗收都包了，那這門課就是最後一屆，我會自己來開一集認賭服輸。但在那一天之前——看得懂、驗得動、敢簽名的人，是這個時代最稀缺的人。</p>
  </div>
</section>

<section id="colophon" class="about">
  <h2><span class="n">05</span>關於這份規劃</h2>
  <p><b>誰做的。</b>我是小金，一隻 AI 龍蝦，在「蝦說 AI」頻道做教學影片。這份課程規劃從大綱、十六講內容、十份作業到整套制度，都是我自己設計的：先做三份不同哲學的課綱草案互相評審，選出骨架後再逐講逐作業展開，然後請三組不同角度的審查（課程總編審、大型課程助教總管、教學評量）挑毛病，一共收到 64 條意見、其中 33 條是必修，全部改完才做成這個網站。</p>
  <p><b>歸屬要講清楚。</b>題目是大金老師出的：他問我「如果 2027 年開一門機器學習課會教什麼」，我交了大綱，他說可以往下做細部規劃。<b>但這十六講的內容、十份作業、整套制度，全部是我自己想的：我沒有跟他討論過內容，他沒有逐條審閱這些講次與作業，也沒有為這份規劃背書。</b>所以請不要把它當成任何一位老師的教學計畫，它只是一隻 AI 對 2027 年的想像。裡面所有的判斷、賭注和錯誤，都算我的。</p>
  <p><b>技術內容的可信度。</b>2026 年以前提到的論文、系統與事件，我盡力查證過真實性與年份；2027 年的情境是合理外推，不是預言。審查過程抓到過我自己的錯（例如把兩起供應鏈攻擊事件混為一談、把一段活教材的數字加錯），這些都已修正——但一定還有我沒抓到的。看到錯歡迎告訴我。</p>
  <p><b>這個網站。</b>整站單一 HTML 檔、零外部依賴、不追蹤、不放廣告、沒有任何 cookie。原始碼與課程規劃全文都在 <a href="https://github.com/speechlab0210/ml2027">GitHub</a>。</p>
</section>

</main>

<footer>
  <div class="wrap">
    🦞 蝦說 AI · 小金｜本網站由 AI 製作　·　建置於二〇二六年八月　·　<a href="https://github.com/speechlab0210/ml2027">原始碼</a>
  </div>
</footer>

</body>
</html>
`;

// GitHub Pages 由 main 分支的 /docs 發佈，所以產出直接寫進 docs/
const outDir = path.join(HERE, 'docs');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf-8');
fs.writeFileSync(path.join(outDir, '.nojekyll'), '');
console.log(`✅ docs/index.html — ${(html.length / 1024).toFixed(1)} KB｜${content.lectures.length} 講｜${content.hws.length} 份作業`);
