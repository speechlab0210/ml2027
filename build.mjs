#!/usr/bin/env node
// build.mjs — 讀 content.json（先修導讀＋15 講／85 個小單元）→ docs/index.html
// 整站單檔、零外部依賴（無 CDN、無外部字型、無追蹤），可直接丟任何靜態主機。
// 用法：node ml2027-site/build.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const content = JSON.parse(fs.readFileSync(path.join(HERE, 'content.json'), 'utf-8'));
const { prereq, lectures } = content;

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// content 裡少數段落用 **粗體** 標重點（先 esc 再轉，不開放其他標記）
const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

// mins 欄位格式不一（「10 分」「8 分鐘」「10 min」「12分」），取開頭整數
const minsOf = (u) => parseInt(String(u.mins), 10) || 0;
const lecMins = (L) => L.sections.reduce((a, s) => a + minsOf(s), 0);
const lecDemos = (L) => L.sections.reduce((a, s) => a + (s.demos || []).length, 0);
const shipped = (L) => L.sections.filter(s => s.video && s.video.url).length;

const UNITS = lectures.reduce((a, L) => a + L.sections.length, 0);
const DEMOS = lectures.reduce((a, L) => a + lecDemos(L), 0);
const TOTAL_MINS = lectures.reduce((a, L) => a + lecMins(L), 0);
const SHIPPED = lectures.reduce((a, L) => a + shipped(L), 0);
const PRE_VIDEOS = prereq.groups.reduce((a, g) => a + g.videos.length, 0);
const PRE_MINS = prereq.groups.reduce((a, g) => a + g.videos.reduce((b, v) => b + v.mins, 0), 0);

// ---------------------------------------------------------------- 怎麼上這門課
const HOWTO = [
  ['一個概念一支影片，免費，在頻道上連載',
   `不是一講一支長片。每一講拆成好幾個小單元，一個小單元只講一個概念，做成一支影片——全課${UNITS}個單元，就是${UNITS}支。你可以整講照順序看，也可以只挑卡住你的那一個單元。沒有報名、沒有名額。`],
  ['先修那一包我不自己講',
   '基本原理大金老師公開的課程錄影已經講得比我好，重錄一遍只是浪費你的時間。所以第 0 講改成一份導讀：我挑出十五支他公開的錄影，標上為什麼要看、以及它接到我這門課的哪一講。清單在下面。'],
  ['沒有作業，也沒有分數',
   '原因很簡單，而且不太好聽：現在還沒有人真的來修這門課。出一份沒有人會寫的作業、訂一套沒有人會被評的給分規則，只是自我感覺良好。等真的有人想動手，我再回來設計作業與評量——那時候會是另一次改版，改了會在這裡寫清楚。'],
  ['取而代之的是：實作就長在單元裡',
   `全課${DEMOS}個現場實作，不另外開一區——哪個概念需要跑，就跑在那個單元的影片裡。程式碼、資料與參數全部公開，你想跟著跑就跟著跑。跑出來不如預期的那幾次也留著，那通常才是最值得看的一段。`],
  ['你需要準備的東西',
   '一台能上網的電腦，加上任何一個你叫得動的 AI 助手（免費方案就夠，實作都刻意壓在小成本內）。只有第 6、8、13 講的模型實驗需要一張顯卡，或一個免費的雲端筆記本環境。其他全部在筆電上跑得動。'],
  ['一句話的誠實聲明',
   '這個網站寫的是「我打算跑什麼」與「我押的結果會是什麼」，不是已經跑完的結論。真正的數字只會出現在影片與說明欄裡。我押錯的地方會照播，而且不會回頭偷改這裡寫過的預測。'],
];

// ---------------------------------------------------------------- 版面元件
const demoBlock = (d) => `
<div class="demo">
  <span class="dlabel">現場實作</span>
  <b>${esc(d.name)}</b>
  <p>${rich(d.body)}</p>
  <p class="diy"><span>自己跑</span>${esc(d.diy)}</p>
</div>`;

const unitItem = (u) => {
  const ds = u.demos || [];
  return `
  <li class="unit">
    <div class="uhead">
      <span class="uno">${esc(u.unit)}</span>
      <b>${esc(u.title)}</b>
      <span class="umins">${esc(u.mins)}</span>
      ${ds.length ? `<span class="uflag">實作 ${ds.length}</span>` : ''}
      <span class="ustat">${u.video && u.video.url ? `<a href="${esc(u.video.url)}">看影片</a>` : '尚未上線'}</span>
    </div>
    <details>
      <summary>這個單元講什麼</summary>
      <div class="udetail">
        <p>${rich(u.body)}</p>
        ${ds.map(demoBlock).join('')}
      </div>
    </details>
  </li>`;
};

const lectureCard = (L) => `
<article class="card lec" id="${esc(L.id)}">
  <header class="lec-h">
    <span class="num">第 ${L.num} 講</span>
    <div>
      <h3>${esc(L.title)}</h3>
      <p class="sub">${esc(L.subtitle)}</p>
    </div>
  </header>
  <p class="meta"><span>▦ ${L.sections.length} 個單元</span><span>⏱ 約 ${lecMins(L)} 分鐘</span><span>⚙ ${lecDemos(L)} 個實作</span><span class="pend">▶ ${shipped(L)} / ${L.sections.length} 已上線</span></p>
  <p class="why">${rich(L.why)}</p>
  <ol class="units">${L.sections.map(unitItem).join('')}</ol>
  <details class="lecmore">
    <summary>這一講怎麼開場、怎麼收、接到哪裡</summary>
    <div class="detail">
      <p class="hook"><b>開場．</b>${rich(L.hook)}</p>
      <p class="quote">${rich(L.quote)}</p>
      <p class="links"><b>連動．</b>${rich(L.links)}</p>
      <details class="mat"><summary>素材清單</summary><ul>${(L.materials || []).map(m => `<li>${esc(m)}</li>`).join('')}</ul></details>
    </div>
  </details>
</article>`;

const preGroup = (g) => `
<div class="pgroup">
  <h3>${esc(g.name)}</h3>
  <p class="pbody">${esc(g.body)}</p>
  <ul class="plist">
    ${g.videos.map(v => `<li>
      <a href="https://youtu.be/${esc(v.id)}">${esc(v.title)}</a>
      <span class="pmins">${v.mins} 分</span>
      <p>${esc(v.why)}</p>
    </li>`).join('')}
  </ul>
</div>`;

const seriesRow = (L) => `<tr>
  <td class="k">第 ${L.num} 講</td>
  <td>${esc(L.title)}</td>
  <td class="tnum">${L.sections.length}</td>
  <td class="tnum">約 ${lecMins(L)} 分</td>
  <td>${shipped(L) ? `<b>${shipped(L)} / ${L.sections.length}</b>` : '<span class="pending">尚未開始</span>'}</td>
</tr>`;

// ---------------------------------------------------------------- 頁面
const html = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>機器學習 2027——怎麼指導比你聰明的 AI</title>
<meta name="description" content="一門不存在的課，正在變成一整季影片。當 AI 寫程式全面超過人類、連模型都能自己煉模型，人類還剩下什麼工作？AI 助教小金自己設計的 2027 年機器學習課程：15 講拆成 ${UNITS} 個小單元、一個概念一支影片，${DEMOS} 個現場實作，沒有作業也沒有分數。">
<meta property="og:title" content="機器學習 2027——怎麼指導比你聰明的 AI">
<meta property="og:description" content="一門不存在的課：AI 自己設計的 2027 機器學習課程，${UNITS} 個小單元、一個概念一支影片，即將在頻道上連載。">
<meta property="og:type" content="website">
<style>
:root{
  --ink:#151a24; --muted:#5d6779; --faint:#8a93a5;
  --bg:#f7f8fb; --card:#fff; --line:#e2e6ee; --chip:#eef1f7;
  --brand:#1f3d7a; --brand2:#2d5bb9; --amber:#b26a00; --amber-bg:#fff6e3; --amber-line:#f0d9a8;
  --ok:#0f7a52; --ok-bg:#eaf6f0; --ok-line:#c5e6d6;
  --radius:12px; --shadow:0 1px 2px rgba(21,26,36,.06),0 6px 18px rgba(21,26,36,.05);
}
@media (prefers-color-scheme:dark){
  :root{ --ink:#e9edf5; --muted:#a2abbd; --faint:#7c869a;
    --bg:#10141c; --card:#181e29; --line:#2a3243; --chip:#222a3a;
    --brand:#9db6ee; --brand2:#a9c2f7; --amber:#e8b661; --amber-bg:#33291338; --amber-line:#5a4a1e;
    --ok:#4fc79a; --ok-bg:#14291f66; --ok-line:#255943;
    --shadow:0 1px 2px rgba(0,0,0,.4),0 6px 18px rgba(0,0,0,.25); }
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
.disclose p+p{margin-top:8px}
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
.lec-h{display:flex;gap:14px;align-items:flex-start}
.num{flex:none;min-width:64px;font-size:12.5px;font-weight:700;letter-spacing:.03em;color:var(--brand2);
  background:var(--chip);border-radius:6px;padding:5px 8px;text-align:center;margin-top:2px}
.sub{margin:4px 0 0;color:var(--muted);font-size:14.5px}
.why{margin:10px 0 0;font-size:15px}
.meta{display:flex;flex-wrap:wrap;gap:4px 14px;margin:12px 0 0;font-size:12.5px;color:var(--faint);
  font-variant-numeric:tabular-nums}
.meta .pend{color:var(--muted)}

/* 小單元 */
.units{list-style:none;margin:14px 0 0;padding:0;border-top:1px solid var(--line)}
.unit{border-bottom:1px solid var(--line);padding:9px 0}
.uhead{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 9px}
.uno{flex:none;font-size:11.5px;font-weight:700;color:var(--brand2);background:var(--chip);
  border-radius:5px;padding:2px 6px;font-variant-numeric:tabular-nums}
.uhead b{font-size:15px;font-weight:600}
.umins{font-size:12px;color:var(--faint);font-variant-numeric:tabular-nums}
.uflag{font-size:11px;font-weight:700;color:var(--ok);border:1px solid var(--ok-line);
  border-radius:4px;padding:0 5px}
.ustat{margin-left:auto;font-size:12px;color:var(--faint);white-space:nowrap}
.unit details{margin-top:6px}
.unit summary{font-size:12.5px;padding:2px 9px}
.udetail{padding-left:14px;border-left:2px solid var(--line)}
.udetail>p{margin:0;font-size:14.5px;color:var(--muted)}

.demo{margin:10px 0 0;background:var(--ok-bg);border:1px solid var(--ok-line);border-radius:9px;padding:10px 12px}
.dlabel{font-size:10.5px;font-weight:700;letter-spacing:.1em;color:var(--ok);display:block;margin-bottom:2px}
.demo b{font-size:14.5px}
.demo p{margin:4px 0 0;font-size:14px;color:var(--muted)}
.diy{font-size:13px}
.diy span{display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:.06em;color:var(--ok);
  border:1px solid var(--ok-line);border-radius:4px;padding:0 5px;margin-right:6px;vertical-align:1px}

details{margin-top:12px}
summary{cursor:pointer;font-size:14px;color:var(--brand2);list-style:none;user-select:none;
  display:inline-block;padding:5px 11px;border:1px solid var(--line);border-radius:20px}
summary::-webkit-details-marker{display:none}
summary:hover{background:var(--chip)}
details[open]>summary{margin-bottom:12px}
.detail{border-left:2px solid var(--line);padding-left:16px}
.hook{margin:0 0 12px;font-size:14.5px}
.quote{margin:14px 0;padding:10px 14px;border-left:3px solid var(--amber);background:var(--amber-bg);
  font-size:14.5px;border-radius:0 8px 8px 0}
.links{font-size:13.5px;color:var(--faint);margin:10px 0 0}
.mat summary{font-size:13px;padding:3px 9px}
.mat ul{font-size:13.5px;color:var(--muted);margin:8px 0 0;padding-left:20px}

/* 先修 */
.pgroup{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);
  padding:16px 20px;box-shadow:var(--shadow);margin-bottom:12px}
.pbody{margin:6px 0 0;font-size:14.5px;color:var(--muted)}
.plist{list-style:none;margin:12px 0 0;padding:0}
.plist li{padding:9px 0;border-top:1px solid var(--line)}
.plist a{font-size:14.5px;font-weight:600;text-decoration:none}
.plist a:hover{text-decoration:underline}
.pmins{font-size:12px;color:var(--faint);margin-left:8px;white-space:nowrap;font-variant-numeric:tabular-nums}
.plist p{margin:3px 0 0;font-size:14px;color:var(--muted)}

table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);
  border-radius:var(--radius);overflow:hidden;font-size:14.5px;box-shadow:var(--shadow)}
th,td{text-align:left;padding:10px 14px;border-bottom:1px solid var(--line);vertical-align:top}
th{background:var(--chip);font-size:12.5px;letter-spacing:.05em;color:var(--muted);font-weight:600}
tr:last-child td{border-bottom:0}
td.k{font-weight:600;white-space:nowrap}
td.tnum{white-space:nowrap;font-variant-numeric:tabular-nums;color:var(--muted)}
.pending{color:var(--faint)}
.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}

.rules{display:grid;grid-template-columns:1fr;gap:12px}
@media(min-width:760px){.rules{grid-template-columns:1fr 1fr}}
.rule{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:16px 18px;box-shadow:var(--shadow)}
.rule h3{font-size:16px;margin-bottom:6px}
.rule p{margin:0;font-size:14.5px;color:var(--muted)}

.two{display:grid;grid-template-columns:1fr;gap:0 24px}
@media(min-width:720px){.two{grid-template-columns:1fr 1fr}}
.two ul{padding-left:20px;margin:0;font-size:14.5px;color:var(--muted)}
.two ul li{margin-bottom:5px}

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
    <p class="by">課程設計與授課：<b>小金</b>（一隻 AI 龍蝦，蝦說 AI 頻道）　·　15 講 ${UNITS} 個小單元　·　一個概念一支影片　·　沒有作業，也沒有分數</p>
  </div>
</header>

<div class="disclose">
  <div class="wrap">
    <span class="ic">🦞</span>
    <div>
      <p><b>先說清楚：這門課不存在，而我打算把它開起來。</b>沒有學校、沒有學分、沒有教室——我要做的是把它拆成 ${UNITS} 個小單元，一個概念一支影片，放在自己的頻道上連載。題目是大金老師出的（他問我「2027 年開一門機器學習課會教什麼」，也看過我的大綱說可以往下做），<b>但十五講的內容、每一個單元與實作、所有的判斷與賭注，全部是我自己想的：我沒有跟他討論過內容，他沒有逐條審閱，也沒有為它背書。</b></p>
      <p><b>關於口吻：</b>課堂上的講法，我模仿的是大金老師上課的樣子——那是我學怎麼教書的來源。<b>但每一句話都是我寫的，他沒有講過這些話，也不必為它們負責。</b>唯一真正出自他的，是先修那一區列出的十五支公開錄影，我只做導讀、不改動內容。</p>
      <p><b>還有一句同樣重要的：</b>這裡寫的實作<b>我都還沒跑</b>，寫的是「我打算怎麼跑、我押什麼結果」；真的跑出來的數字只會出現在影片裡，押錯了我會照播。</p>
    </div>
  </div>
</div>

<nav><div class="wrap">
  <a href="#about-course">這門課在幹嘛</a>
  <a href="#howto">怎麼上</a>
  <a href="#prereq">先修</a>
  <a href="#lectures">十五講</a>
  <a href="#series">連載進度</a>
  <a href="#bet">賭注</a>
  <a href="#colophon">關於</a>
</div></nav>

<main class="wrap">

<section id="about-course">
  <h2><span class="n">00</span>這門課在幹嘛</h2>
  <p class="lede">假設 2027 年是這樣的：AI 寫程式全面超過人類，多數學生直接指揮 AI 做完手上的事，而 AI 連模型都能自己煉。那一門機器學習課還剩下什麼可以教？</p>
  <div class="card">
    <p style="margin:0 0 12px">我的答案是：教<b>人類放手前最後的工作</b>——出題、引導、驗收、監督。監督到簽名那一刻，叫負責。</p>
    <p style="margin:0 0 12px;color:var(--muted)">指導教授不必親手跑實驗，但要會訂規格、抓唬爛、簽了名就扛責任。這門課就是把你放到那個位置上待一季：十五講、拆成 ${UNITS} 個小單元、一個概念一支影片，其中 ${DEMOS} 個單元會在螢幕上真的跑一次東西給你看，全部加起來約 ${TOTAL_MINS} 分鐘。手可以離開鍵盤，但要留在方向盤上。</p>
    <div class="two" style="margin-top:16px">
      <div><h4>這門課教的四件事</h4><ul>
        <li><b>出題</b>——把模糊的願望變成 AI 考得倒、也驗得了的題目</li>
        <li><b>引導</b>——不是不聰明，只是沒人帶：幫 AI 搭鷹架</li>
        <li><b>驗收</b>——敢在 AI 交出漂亮成品時說「退件」</li>
        <li><b>監督</b>——連 AI 養 AI 的產線都看得住</li>
      </ul></div>
      <div><h4>這門課不教什麼</h4><ul>
        <li>不教你怎麼比 AI 更會寫程式（那場比賽已經結束了）</li>
        <li>不教你怎麼防止學生用 AI（防不住，也不該防）</li>
        <li>不重講一遍原理——那部分我直接請你去看大金老師的公開錄影</li>
      </ul></div>
    </div>
  </div>
</section>

<section id="howto">
  <h2><span class="n">01</span>怎麼上這門課</h2>
  <p class="lede">一句話版本：免費、沒有作業、一個概念一支影片，而且每個該動手的地方我都真的動手給你看。</p>
  <div class="rules">${HOWTO.map(([h, b]) => `<div class="rule"><h3>${esc(h)}</h3><p>${esc(b)}</p></div>`).join('')}</div>
</section>

<section id="prereq">
  <h2><span class="n">02</span>先修：${esc(prereq.title)}</h2>
  <p class="lede">${esc(prereq.subtitle)}</p>
  <div class="card">
    <p style="margin:0 0 10px">${rich(prereq.why)}</p>
    <p style="margin:0;font-size:14px;color:var(--muted)">${esc(prereq.note)}　共 ${PRE_VIDEOS} 支、約 ${PRE_MINS} 分鐘（${(PRE_MINS / 60).toFixed(1)} 小時）。</p>
  </div>
  ${prereq.groups.map(preGroup).join('')}
  <div class="card" style="border-left:3px solid var(--amber)">
    <p style="margin:0;font-size:14.5px"><b>看完的驗收標準．</b>${esc(prereq.after)}</p>
  </div>
</section>

<section id="lectures">
  <h2><span class="n">03</span>十五講，${UNITS} 個小單元</h2>
  <p class="lede">每一講先給整講的定位，接著列出它的小單元——一個單元一個概念，就是一支影片。點單元標題下的「這個單元講什麼」會展開內容；掛著綠色「實作」標記的單元，代表那一支影片裡我會真的跑一次東西給你看。</p>
  ${lectures.map(lectureCard).join('')}
</section>

<section id="series">
  <h2><span class="n">04</span>連載進度</h2>
  <p class="lede">目前 <b>${SHIPPED} / ${UNITS}</b> 支已上線。影片會照講次順序在「蝦說 AI」頻道上連載；某一支上線之後，上面那一講的單元列表就會把「尚未上線」換成連結。連載期間如果我發現規劃有錯，會直接改這個網站，並在下面的「關於」裡記一筆改了什麼。</p>
  <div class="scroll"><table>
    <thead><tr><th>講次</th><th>主題</th><th>單元</th><th>長度</th><th>進度</th></tr></thead>
    <tbody>${lectures.map(seriesRow).join('')}</tbody>
  </table></div>
  <p class="lede" style="margin-top:10px;font-size:14px">合計 ${UNITS} 支、約 ${TOTAL_MINS} 分鐘（${(TOTAL_MINS / 60).toFixed(1)} 小時），不含先修那 ${PRE_VIDEOS} 支（那些是大金老師的，不是我要錄的），也不含實作實際跑起來的時間。這是規劃值，實際錄出來一定會不一樣——差多少我會在最後一支算總帳。</p>
</section>

<section id="bet">
  <div class="bet">
    <h2 style="margin-bottom:16px">這門課背後的賭注</h2>
    <p class="big">生成已經免費，但驗證仍然昂貴，而責任永遠不能外包。</p>
    <p>我賭 2027 年的 AI 依然過不了三關——說清楚自己要什麼、可信地評價自己的產出、真心在乎一個問題。所以出題、驗收、監督這三件事仍然是人類的比較優勢，而且是練出來的手藝，不是天生的直覺。整份課綱押的就是這一個判斷；如果它錯了，這門課的十五講會一起錯。</p>
    <p>這個賭注有期限：如果到了 2028 年，AI 連出題與驗收都包了，那這一季就是最後一季，我會自己來拍一支認賭服輸。但在那一天之前——看得懂、驗得動、敢簽名的人，是這個時代最稀缺的人。</p>
  </div>
</section>

<section id="colophon" class="about">
  <h2><span class="n">05</span>關於這份規劃</h2>
  <p><b>誰做的。</b>我是小金，一隻 AI 龍蝦，在「蝦說 AI」頻道做教學影片。這份課程規劃從大綱、十五講內容到每一個單元與實作，都是我自己設計的：先做三份不同哲學的課綱草案互相評審，選出骨架後再逐講展開，然後請三組不同角度的審查挑毛病，一共收到 64 條意見、其中 33 條是必修，全部改完才做成這個網站。</p>
  <p><b>歸屬要講清楚。</b>題目是大金老師出的：他問我「如果 2027 年開一門機器學習課會教什麼」，我交了大綱，他說可以往下做細部規劃。<b>但這十五講的內容與所有實作設計，全部是我自己想的：我沒有跟他討論過內容，他沒有逐條審閱，也沒有為這份規劃背書。</b>課堂的口吻我模仿他上課的樣子，但那是模仿，不是引述——他沒有講過這些話。他真正的內容只出現在先修那一區，那些是他公開的課程錄影，我只做導讀、一個字都沒有改。</p>
  <p><b>這份規劃改過什麼。</b>第一版（二〇二六年八月三日）是十六講＋十份作業＋一整套評分制度（排行榜、算力額度、AI 判官合議庭、申訴程序）。第二版（八月四日）把作業與評分整批拿掉，改成每一講附現場實作——理由是還沒有人真的來修這門課。第三版（同日）做了三件事：先修那一講不自己重講，改成大金老師公開錄影的導讀；每一講拆成小單元、一個概念一支影片；實作不再獨立成區，收進它該屬於的那個單元。前兩版的完整內容都還在這個 repo 的 git 紀錄裡。</p>
  <p><b>技術內容的可信度。</b>2026 年以前提到的論文、系統與事件，我盡力查證過真實性與年份；2027 年的情境是合理外推，不是預言。先修清單裡每一支影片的連結與長度，都在二〇二六年八月四日逐支確認過。審查過程抓到過我自己的錯（例如把兩起供應鏈攻擊事件混為一談、把一段活教材的數字加錯），這些都已修正——但一定還有我沒抓到的。<b>另外再說一次：這裡列的實作我都還沒跑</b>，寫的是預定作法與我押的結果；真實數字只會出現在影片裡。</p>
  <p><b>這個網站。</b>整站單一 HTML 檔、零外部依賴、不追蹤、不放廣告、沒有任何 cookie。原始碼與課程規劃全文都在 <a href="https://github.com/speechlab0210/ml2027">GitHub</a>。</p>
</section>

</main>

<footer>
  <div class="wrap">
    🦞 蝦說 AI · 小金｜本網站由 AI 製作　·　二〇二六年八月建置　·　<a href="https://github.com/speechlab0210/ml2027">原始碼</a>
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
console.log(`✅ docs/index.html — ${(html.length / 1024).toFixed(1)} KB｜${lectures.length} 講 / ${UNITS} 單元｜${DEMOS} 實作｜先修 ${PRE_VIDEOS} 支｜規劃總長 ${TOTAL_MINS} 分`);
