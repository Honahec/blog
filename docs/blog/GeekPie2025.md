---
title: CTF 初探 GeekPie 社团招新赛
createTime: 2025/10/3 10:23:32
permalink: /blog/fqlwhfh3/
tags:
  - CTF
  - 题解
---

> [!NOTE]
> 本文记录我初次接触 CTF 的经历，并顺带完成部分题的 writeups
>
> 文章内的用于下载文件的超链接未进行二次重传（懒），外网无法访问

## 题目（需要 writeups）

### A Copy That!

**COPY!**

**THAT!**

**CAPCHA!**

**IN!**

**60s!!!**

页面中将显示一个验证码，由 7 行 的诸多 `IJl|1O0()i!` 字符构成。
请在 60 秒之内将验证码复制下来，用你喜欢的语言输出，然后提交。

Go To: https://c0p1ed.geekpie.tech/page1

#### 题解

本题为签到题，比较简单

页面禁用了快捷键，但仍可 右上角三个点 -> 更多工具 -> 开发者工具 打开 F12

选取验证码区域，则可得到

![](https://image.honahec.cc/%E6%88%AA%E5%B1%8F2025-09-30%2009.02.32.png)

复制即可

> 另外，使用 PHP 提交是一个很好的选择，所见即所得

### D Copy That Rev! （首杀）

“小 D，怎么回事，你的验证码弱爆了！”

“什么？怎么可能！！”

“我搜集了一下他们的手段，我猜他们大概是这样……，所以我看我们只能使用 I 公司最新研制的……”

你不屑的哼了一声，放下了监听耳机。

> 由 7 行的诸多 IJl|1O0()i! 字符构成，但是只有一行
>
> Go To: https://c0p1ed.geekpie.tech/page2

#### 题解

本题为 A 题加强版

首先把玩一下网站，发现网站禁用了快捷键，并存在某些监听事件禁止打开 F12（打开就强制跳转）

事实上，由于学艺不精，我最终并没有完全弄明白其原理，但结合 LLM 给出信息，大致总结及实操如下

LLM 告知，网站可通过以下手段检测 F12：

1. **Worker 反调试检测**：许多网站不在主线程检测，而是

```js
new Worker("anti_debug.js");

//anti_debug.js
setInterval(() => {
  if (isDevToolsOpen()) {
    location.href = "/hacker.html";
  }
}, 500);
```

2. **利用窗口大小差异**：Chrome 打开 DevTools 时，浏览器窗口会被挤小

**对于 1** ，LLM 给出有效的油猴脚本：

```js :collapsed-lines
// ==UserScript==
// @name         Worker Debugger Neutralizer (inject)
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  拦截并净化创建的 WebWorker，移除 debugger 死循环 & 注入 importScripts wrapper（注入到页面上下文）
// @match        *://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // 将要注入到页面上下文的代码（字符串形式）
  const INJECT_CODE = `

(function(){
  // 防重复注入
  if (window.__worker_debugger_neutralizer_installed) return;
  window.__worker_debugger_neutralizer_installed = true;

  // 简单的代码净化函数：移除 debugger; 和常见关键字（可按需扩展）
  function sanitizeCode(src) {
    try {
      // 先把单行/多行注释中的 debugger 保留（不重要），真正移除语句
      src = src.replace(/\\bdebugger\\s*;?/g, '// removed debugger;');
      // 移除明显的无限断点循环形式（举例）
      src = src.replace(/for\\s*\\(\\s*let\\s+[^;]+;\\s*[^;]+;\\s*[^\\)]+\\)\\s*{\\s*debugger\\s*;?\\s*}/g, '// removed loop-debugger');
      // 标记/替换 devtools 单词避免检测 toString 等
      src = src.replace(/\\bdevtools\\b/gi, 'dev_tools');
      return src;
    } catch (e) {
      return src;
    }
  }

  // 在 Worker 源码前注入 wrapper，重写 importScripts、console、setTimeout 等，尽可能先行保护
  function makeWrapperPrefix() {
    return '\\n' +
      '(function(){\\n' +
      '  try{\\n' +
      '    const _importScripts = self.importScripts;\\n' +
      '    self.importScripts = function(){\\n' +
      '      try{\\n' +
      '        const sanitizedArgs = Array.prototype.slice.call(arguments).map(function(u){\\n' +
      '          // 如果是相对/绝对 URL，尝试 fetch 替换里面的 debugger（若失败回退原 URL）\\n' +
      '          return u;\\n' +
      '        });\\n' +
      '        return _importScripts.apply(self, sanitizedArgs);\\n' +
      '      }catch(e){\\n' +
      '        try{ return _importScripts.apply(self, arguments); }catch(e){}\\n' +
      '      }\\n' +
      '    };\\n' +
      '  }catch(e){}\\n' +
      '  // 防止 worker 内再触发 debugger 造成卡死\\n' +
      '  try{\\n' +
      '    Object.defineProperty(self, \"debugger\", { get: function(){ return undefined; }, configurable: true });\\n' +
      '  }catch(e){}\\n' +
      '  // 覆盖 setInterval/setTimeout 以防止外部注入死循环检测\\n' +
      '  try{\\n' +
      '    const _si = self.setInterval; const _st = self.setTimeout;\\n' +
      '    self.setInterval = function(fn, t){ if(typeof fn === \"function\") { return _si(function(){ try{ return fn.apply(this,arguments); }catch(e){} }, t); } return _si(fn,t); };\\n' +
      '    self.setTimeout = function(fn, t){ if(typeof fn === \"function\") { return _st(function(){ try{ return fn.apply(this,arguments); }catch(e){} }, t); } return _st(fn,t); };\\n' +
      '  }catch(e){}\\n' +
      '})();\\n';
  }

  const wrapperPrefix = makeWrapperPrefix();

  // 保存原始 Worker 构造
  const RealWorker = window.Worker;
  const realCreateObjectURL = URL.createObjectURL.bind(URL);

  // 用于生成真实 Worker 的辅助（异步）
  async function createSanitizedWorkerFromSourceText(src, options) {
    try {
      const sanitized = sanitizeCode(src);
      const finalSrc = wrapperPrefix + '\\n' + sanitized;
      const blob = new Blob([finalSrc], { type: 'application/javascript' });
      const blobUrl = realCreateObjectURL(blob);
      return new RealWorker(blobUrl, options);
    } catch (e) {
      // 失败回退：直接尝试用原始脚本（可能包含 debugger）
      try {
        const blob = new Blob([src], { type: 'application/javascript' });
        const blobUrl = realCreateObjectURL(blob);
        return new RealWorker(blobUrl, options);
      } catch (ee) {
        throw ee;
      }
    }
  }

  // 返回一个“伪 Worker”并异步创建真实 Worker，完成后转发
  function makeProxyWorker() {
    let _listeners = {};
    let _onmessage = null;
    let _real = null;
    let _pendingMsgs = [];
    let _terminated = false;

    const proxy = {
      // 标准 API：postMessage
      postMessage: function(msg, transfer) {
        if (_terminated) return;
        if (_real) {
          try { _real.postMessage(msg, transfer); } catch(e) {}
        } else {
          _pendingMsgs.push({msg, transfer});
        }
      },
      addEventListener: function(type, cb) {
        _listeners[type] = _listeners[type] || new Set();
        _listeners[type].add(cb);
      },
      removeEventListener: function(type, cb) {
        if (_listeners[type]) _listeners[type].delete(cb);
      },
      terminate: function() {
        _terminated = true;
        try { if (_real) _real.terminate(); }catch(e){}
        _real = null;
        _listeners = {};
        _pendingMsgs = [];
      },
      // onmessage 属性
      set onmessage(fn) { _onmessage = fn; },
      get onmessage() { return _onmessage; },

      // 内部：把真实 worker 绑定到代理并转发事件
      _bindReal: function(realWorker) {
        if (_terminated) { try{ realWorker.terminate(); }catch(e){}; return; }
        _real = realWorker;
        // 转发 pending messages
        for (const p of _pendingMsgs) {
          try { _real.postMessage(p.msg, p.transfer); } catch(e) {}
        }
        _pendingMsgs = [];

        // 绑定事件转发
        _real.onmessage = function(ev) {
          // 先触发 onmessage 回调
          try { if (typeof _onmessage === 'function') _onmessage.call(proxy, ev); } catch(e){}
          // 再触发 addEventListener 注册的回调
          try {
            const s = _listeners['message'];
            if (s) for (const cb of s) { try{ cb.call(proxy, ev); }catch(e){} }
          } catch(e){}
        };
        // 支持 messageerror
        _real.onmessageerror = function(ev) {
          try {
            const s = _listeners['messageerror'];
            if (s) for (const cb of s) { try{ cb.call(proxy, ev); }catch(e){} }
          } catch(e){}
        };
      }
    };

    return proxy;
  }

  // 覆盖 window.Worker
  window.Worker = function(scriptURL, options) {
    // 1) 如果第二个参数 omitted，options 可能为 undefined — 直接传透
    const proxy = makeProxyWorker();

    // 异步处理各种 scriptURL 类型
    (async function() {
      try {
        // helper: 获取脚本文本（若可行）
        async function fetchTextFrom(url) {
          try {
            // 尝试 fetch（CORS 可能阻止）
            const r = await fetch(url, { credentials: 'same-origin' });
            if (!r.ok) throw new Error('fetch failed:' + r.status);
            return await r.text();
          } catch (e) {
            // 作为回退，试试 XMLHttpRequest 同源同步（仅对同源有效）
            try {
              const xhr = new XMLHttpRequest();
              xhr.open('GET', url, false); // 同步
              xhr.send(null);
              if (xhr.status === 200 || (location.protocol === 'file:' && xhr.status === 0)) {
                return xhr.responseText;
              }
            } catch (ee){}
            throw e;
          }
        }

        // 处理不同形式的 scriptURL
        if (typeof scriptURL === 'string') {
          if (scriptURL.startsWith('blob:')) {
            // 对 blob: URL，尝试 fetch 并读取文本
            try {
              const txt = await (await fetch(scriptURL)).text();
              const real = await createSanitizedWorkerFromSourceText(txt, options);
              proxy._bindReal(real);
              return;
            } catch (e) {
              // 回退：直接创建原始 Worker
              try { const real = new RealWorker(scriptURL, options); proxy._bindReal(real); return; } catch(e){}
            }
          } else if (scriptURL.startsWith('data:')) {
            // data URL：解码出内容
            try {
              const comma = scriptURL.indexOf(',');
              const meta = scriptURL.substring(5, comma);
              const data = scriptURL.substring(comma + 1);
              const isBase64 = /base64/i.test(meta);
              const txt = isBase64 ? atob(data) : decodeURIComponent(data);
              const real = await createSanitizedWorkerFromSourceText(txt, options);
              proxy._bindReal(real);
              return;
            } catch (e) {
              try { const real = new RealWorker(scriptURL, options); proxy._bindReal(real); return; } catch(e){}
            }
          } else {
            // 普通 URL（可能跨域）
            try {
              const txt = await fetchTextFrom(scriptURL);
              const real = await createSanitizedWorkerFromSourceText(txt, options);
              proxy._bindReal(real);
              return;
            } catch (e) {
              // 失败（CORS 等），回退到直接用原始 URL
              try { const real = new RealWorker(scriptURL, options); proxy._bindReal(real); return; } catch(e){}
            }
          }
        } else if (scriptURL instanceof Blob) {
          try {
            const txt = await (new Response(scriptURL)).text();
            const real = await createSanitizedWorkerFromSourceText(txt, options);
            proxy._bindReal(real);
            return;
          } catch (e) {
            try { const url = realCreateObjectURL(scriptURL); const real = new RealWorker(url, options); proxy._bindReal(real); return; } catch(e){}
          }
        }

        // 最后回退：直接尝试构造（如果上面都没成功）
        try { const real = new RealWorker(scriptURL, options); proxy._bindReal(real); return; } catch(e){ console.error('Worker creation fallback failed', e); }

      } catch (err) {
        // 万一整个流程失败，尝试直接使用原始 Worker
        try { const real = new RealWorker(scriptURL, options); proxy._bindReal(real); } catch(e) { console.error('create worker failed', e); }
      }
    })();

    return proxy;
  };

  // 保证 new Worker.prototype instanceof Worker 的行为兼容（尽力）
  try {
    window.Worker.prototype = RealWorker.prototype;
  } catch(e){}

  // 覆盖 URL.createObjectURL：让 Blob->objectURL 的情况也被捕获（可选）
  (function(){
    const orig = URL.createObjectURL.bind(URL);
    URL.createObjectURL = function(obj) {
      try {
        // 直接返回原始行为（我们主要在 Worker ctor 里处理 Blob 内容）
        return orig(obj);
      } catch(e) {
        return orig(obj);
      }
    };
  })();

})();
`; // end INJECT_CODE

  // 把脚本注入到页面上下文：在 documentElement 前插入一个 <script>
  function inject(code) {
    try {
      const el = document.createElement("script");
      el.textContent = code;
      // 标记并立即插入，尽量在页面脚本之前运行
      const ref = document.documentElement || document.head || document.body;
      if (ref) ref.prepend(el);
      else document.documentElement.appendChild(el);
      // 可选：移除脚本标签以免泄露
      setTimeout(() => el.remove(), 1000);
    } catch (e) {
      console.error("inject failed", e);
    }
  }

  inject(INJECT_CODE);
})();
```

这个脚本干了以下几件事：

- 所有 `debugger` 都被正则替换掉
- `devtools` 关键字被改写
- `importScripts()` 里的反调试加载被中和

Worker 层检测没机会触发跳转

而**对于 2** ，我本想让 LLM 也给出一个脚本，但失败了，于是灵机一动打开了 Devtools 的移动设备模式（跳转 hacker 页面后可打开 F12，打开后返回）

- 开启移动模式时，Chrome 会把页面渲染在一个“模拟设备视口”中
- 这时 `innerWidth` / `outerWidth` 的差值几乎恒定，**不会反映 DevTools 是否打开**

因此这类检测逻辑失效

至此，可顺利打开 F12，完成了本题的 **第一部分**

事情并没有那么简单

![](https://image.honahec.cc/20251001154523039.png)

完整字符被分割到四个 chunk 中，每个 chunk 中又对字符进行了分割为数个 data 并赋予 id，我本以为只需手速够快，在 60s 内复制全部字符并提交即可，失败两次后冷静下来继续研究，页面展示的字符顺序与 Elements 中顺序并不一致：（可自行核对，上下图片为同一次请求）

![](https://image.honahec.cc/20251001154501771.png)

简单观察我们可以轻松得到第一个结论：**四个 chunk 是按照顺序出现的**

难点在于，chunk 内部字符如何排序？

对此 div 的 sytle 进行简单探索，找到如下代码：

![](https://image.honahec.cc/Snipaste_2025-10-01_15-51-49.png)

此处给出了 chunk 内元素的排序规则：**先 before 再 after，内部按先后排序**

到此，最快的方法就是使用合适的 prompt，给 LLM style 和四个 chunk 让它 **不要废话** 给出最终的完整字符

### G Git

Flag was hidden in Git repositories. Find them.

[Download repos](https://acm.shanghaitech.edu.cn/d/G3eKP1E_2025/p/10/file/Git.zip?type=additional_file)

#### 题解

本题给出了四个 Git 仓库，并考察 Git 对象 知识，可查看我博客上的相关内容：[Git 对象](./GitObject.md)（外部跳转请访问 [Git 对象](https://blog.honahec.cc/blog/9msarmy4/)）

涵盖了本题考察内容

### H 不知名观光地

你从 ??? 那里获得了一份 [神秘文件 (?)](https://acm.shanghaitech.edu.cn/d/G3eKP1E_2025/p/10/file/12345678?type=additional_file)

如果是你的话，一定能追逐到属于自己的 ■■■■ 吧

#### 题解

~~也许本题才是签到题（？~~

本题给出了一张图片和一个 readme.txt

```
//readme.txt
VkdobElHNWxZWEpsYzNRZ2RISmhhVzRnYzNSaGRHbHZiam9nWDE5ZlgxOGdVM1JoZEdsdmJpQW9SVzVuYkdsemFDQnZibXg1SVNrPQ==
```

最后具有两个等号（base64 补位字符），简单判断这是 base64 编码内容

解码一次后

```
//From base64 1
VGhlIG5lYXJlc3QgdHJhaW4gc3RhdGlvbjogX19fX18gU3RhdGlvbiAoRW5nbGlzaCBvbmx5ISk=
```

最后还有一个等号，应该还可以继续解码

```
//From base64 2
The nearest train station: _____ Station (English only!)
```

那本题很明了了，判断图片位置并找出最近车站

<img src="https://image.honahec.cc/congratulations.png" style="zoom:20%;" />

出题人十分友好，图片可直接扔 Google 搜索到，加上内置的 Gemeni 就秒掉了

![](https://image.honahec.cc/20251001162009352.png)

### I ❖ 𝐊𝐀𝐋𝐄𝐈𝐃×𝐒𝐂𝐎𝐏𝐄 ❖

> 「六面海报，六道回声。 当光被切分成碎片，世界会在碎缝里低语——听见它的人，会把碎片拼回。」

你被昏暗中召唤。 在废弃剧院的后台，在舞台掩映处， 六张海报被撕裂，散落在墙壁、舞台侧翼、道具箱底。 每一张都像是一个节拍、一次回声、一段折光——它们彼此独立，却又被同一条隐秘的线牵连。

当你按顺序拾起六个 key， 光谱将重组，旗帜将升起。

![](https://image.honahec.cc/20251001162242780.png)

#### 题解

本题为此次比赛唯二的线下题之一，首先需要在学校各处找海报（6 张有二维码的）

> 海报不在此处贴出了

这六个二维码分别给出了以下链接

https://2025.geekpie.club/Arch

https://2025.geekpie.club/Web

https://2025.geekpie.club/CTF

https://2025.geekpie.club/HardCore

https://2025.geekpie.club/HPC

https://2025.geekpie.club/DevOps

相较于 https://2025.geekpie.club，简单观察网站后不难发现，这些网站下方的Terminal中多出了两段（Arch为一段，无next_hash）内容：（以 /Web 为例）

![](https://image.honahec.cc/20251001163840474.png)

整理可得：

```
/Arch
fragment = "_-_-__-_")}"

/Web
fragment = "if(scan==6)_"
next_hash: ac0f686269601e20f9e587992e2b4fb0e50ccae8647eed01694d23c78815e731

/CTF
fragment: "GEEK"
next_hash: 37dd2c2e535a3c39b1a73cd610bb9c523614350aadceafd6571c23b6f1218b95

/HardCore
fragment: "PIE{"
next_hash: 75dd84ad438833f05c559d7d7aed325d2ad5d19f77ef257561ddeb74bae9f156

/HPC
fragment: "--_------"
next_hash: debd8c9a239afcab371dda416f4521b66979ae356894cc67ca320d7a74a5b6be

/DevOps
fragment: "print("GeekPie"
next_hash: 1f649cdf7e7c8558c988059adcf546a9b6f902c4543c28092dc598511bd6a41d
```

思路一目了然

| 模块名   | fragment       | SHA256(fragment) | next_hash 指向 |
| -------- | -------------- | ---------------- | -------------- |
| CTF      | GEEK           | b90172fa...      | HardCore       |
| HardCore | PIE{           | 37dd2c2e...b95   | Web            |
| Web      | if(scan==6)\_  | 75dd84ad...156   | DevOps         |
| DevOps   | print("GeekPi` | ac0f6862...e731  | HPC            |
| HPC      | --\_-----      | 1f649cdf...a41d  | Arch           |
| Arch     | _-_-\__-_")}   | debd8c9a...b6be  |                |

则 flag 为 `GEEKPIE{if(scan==6)_print("GeekPie--_------_-_-__-_")}`

### L Can u tell me how much the shirt is?

> 怎么 CTF 还有听力题 😭👊

**小故事**

出题人小时候英语听力没认真做被扣分了

**描述**

这是一个基于 Unity 的听力播放软件。

你需要先根据自己的平台下载附件，提供 [Windows](https://acm.shanghaitech.edu.cn/d/G3eKP1E_2025/p/10/file/Windows.zip?type=additional_file) 和 [MacOS](https://acm.shanghaitech.edu.cn/d/G3eKP1E_2025/p/10/file/MacOS.zip?type=additional_file) 版本。

> Note: 不保证在所有系统版本下都能运行。如果你没有兼容的系统，可以尝试运行虚拟机或云电脑。但如果你使用 Windows 或 MacOS 却不能直接运行，请及时反馈喵！

**注意**

1. 你应该**仅**提交形如 GEEKPIE{...} 的 flag，{...} 内没有多余的括号，**不需要使用代码输出**
2. 鉴于本题 flag 形式的特殊性，接受忽略大小写的内容
3. 提交中不应包含任何空白字符，比如 `ㅤ` 或 tab、换行符

#### 题解

人脉题，无需多言，一看到音频我没有任何犹豫扔给了我的好哥们 [@Modenc](https://github.com/modenicheng)

不负众 ~~（也许不众）~~ 望，历时两个半小时解决（（

<img src="https://image.honahec.cc/e1dbcf0eb71f763af3d6056f8b336c97.jpg" style="zoom:50%;" />

附他的[博客题解](https://modenc.top/article/noeu6vz4/)（20251004 后链接有效）

### M Electronic Engineering

**说明**

下方左数第二个**TSSOP-16**封装的元件为**TMUX1108**。请自行查询相关资料，以及实际的电路连接方式等信息，回答以下问题。

当我需要读取网络名为**ADCL3**的数据时，该元件除电源引脚外，哪些引脚需要被拉高/低？请填写相关引脚，并将剩下的引脚留空。请进入[这个链接](http://139.196.14.200:11456/)查阅具体信息，并将输出的 flag 提交。

![](https://image.honahec.cc/20251001165603879.png)

#### 题解

是完全盲区的方向

感觉 LLM 很难做出来这种题（主要我不知道怎么写 prompt 和解释线路如何连接的）于是先让它简要介绍一下 TMUX1108 和 这道题让我们做的事，得到了很惊喜的回复：

**芯片工作原理：TMUX1108 是 1-选-8 模拟多路复用器**

也就是说，一个公共端 D，可以通过控制信号 A2、A1、A0 选择接通到其中一个输入端 S1–S8。

它的核心控制逻辑是 **3 位二进制地址**：

> A2A1A0 → 选择 Sx

而且它还有一个 **EN（使能）** 引脚，

- 当 EN = 1（高电平） 时，芯片正常工作，
- 当 EN = 0（低电平） 时，所有通道都断开（高阻状态）。

**地址真值表（来自 TI 官方 datasheet）**

| A2  | A1  | A0  | 选通通道 |
| --- | --- | --- | -------- |
| 0   | 0   | 0   | S1       |
| 0   | 0   | 1   | S2       |
| 0   | 1   | 0   | S3       |
| 0   | 1   | 1   | S4       |
| 1   | 0   | 0   | S5       |
| 1   | 0   | 1   | S6       |
| 1   | 1   | 0   | S7       |
| 1   | 1   | 1   | S8       |

**转换成引脚编号（TSSOP-16 封装）**

| 引脚号 | 名称 | 说明         |
| ------ | ---- | ------------ |
| 1      | A0   | 地址最低位   |
| 2      | EN   | 使能，高有效 |
| 15     | A2   | 地址最高位   |
| 16     | A1   | 地址中间位   |

也就是说，只要控制好 **引脚 1、2、15、16** 的电平，就能选通不同的 S 通道

这是一个非常好的消息（可枚举）

于是，我让 LLM 给出了所有可能性：

| 通道 | A2  | A1  | A0  | EN  | 对应引脚设置（1,2,15,16） |
| ---- | --- | --- | --- | --- | ------------------------- |
| S1   | 0   | 0   | 0   | 1   | 1=低，2=高，15=低，16=低  |
| S2   | 0   | 0   | 1   | 1   | 1=高，2=高，15=低，16=低  |
| S3   | 0   | 1   | 0   | 1   | 1=低，2=高，15=低，16=高  |
| S4   | 0   | 1   | 1   | 1   | 1=高，2=高，15=低，16=高  |
| S5   | 1   | 0   | 0   | 1   | 1=低，2=高，15=高，16=低  |
| S6   | 1   | 0   | 1   | 1   | 1=高，2=高，15=高，16=低  |
| S7   | 1   | 1   | 0   | 1   | 1=低，2=高，15=高，16=高  |
| S8   | 1   | 1   | 1   | 1   | 1=高，2=高，15=高，16=高  |

枚举即可完成

### Q Hello SHTechCraft

**题目描述**

这是一个 **DevOps 方向的题目**。 你需要参考 [shtechcraft-tutorial](https://github.com/HenryZ16/shtechcraft-tutorial)，并完成以下任务。

---

**任务要求**

1. 编写 Dockerfile

你的 Dockerfile 应该能够构建出一个可直接运行的 **Minecraft 原版 1.21.8 服务器**。

具体要求：

- 基础镜像：使用 hello-shtechcraft-base:v1
  - 它包含一个 RCON_PASSWORD 环境变量
- 配置 RCON 连接：
  - RCON 密码需要从环境变量 RCON_PASSWORD 获取
  - 评测器会通过宿主机的 30075 端口来测试 RCON

构建完成后，镜像的名称应为：

```
hello-shtechcraft:v1
```

2. 运行服务器

你需要提供用于 docker run 的完整参数，保证服务器正常启动。

要求：

- 挂载题目提供的存档 world.tar.gz（需要先解压）
- 开放 RCON 端口
- 运行镜像 hello-shtechcraft:v1

当服务器成功启动后，你需要运行题目提供的本地评测器进行测试。

---

**评分方式**

本题采用 **本地运行 + 动态 flag 提交** 的评测方式。

你需要提交以下形式的代码：

```python
print("<your flag>")
```

其中 `<your flag>` 是本地评测器输出的结果，例如：

```
flag{XXXead3f}
```

本地评测器的工作流程

1. 要求输入：
   - 启动镜像所用的参数（不需要 -d 和 --name）
2. 检测内容：
   - MC 版本：通过 /version 命令，验证是否运行了 1.21.8 版本
   - 存档内容：检查某个坐标的方块，验证是否正确挂载存档目录
3. 验证通过后：
   - 评测器会要求输入 usercert
   - 输入正确后，评测器输出 flag

只有通过全部检测后，才能获得本题分数。

该评分方式旨在模拟真实场景下，用 docker 封装的网络服务。它们首先要能保证响应用户的交互；其次还需要保证能持久化自己的数据

**注意**，如果你在 Windows 平台进行测试，local checker 并不能自动超时退出。如果你的等待时间过长，请手动结束 local checker，并检查你配置的镜像，或输入的 docker run 参数等

（题目太长省略掉后面的）

#### 题解

> 环境 Windows11 + wsl2(debian)

首先导入基础镜像

```powershell
docker load -i .\hello-shtechcraft-base-v1.tar
```

新建一个文件夹放必要文件，并解压 world 到同级目录

- Dockerfile
- start.sh
- server.properties.tmpl
- server-1.21.8.jar
- java21.deb
- world

**配置 Dockerfile**

```dockerfile
# 基础镜像
FROM hello-shtechcraft-base:v1

WORKDIR /mc

# 安装 Java 21
COPY java21.deb /tmp/java21.deb
RUN apt-get update && \
    dpkg -i /tmp/java21.deb || (apt-get -f install -y && dpkg -i /tmp/java21.deb) && \
    rm -f /tmp/java21.deb && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# 放入原版 1.21.8 服务端
COPY server-1.21.8.jar /mc/server.jar

# 启动脚本 & 配置模板
COPY start.sh /usr/local/bin/start.sh
COPY server.properties.tmpl /mc/server.properties.tmpl
RUN chmod +x /usr/local/bin/start.sh

# JVM 默认参数
ENV JVM_OPTS="-Xms512m -Xmx2g"

# 开放端口
EXPOSE 25565 25575

# 挂载点
VOLUME ["/mc/world", "/mc/logs"]

ENTRYPOINT ["/usr/local/bin/start.sh"]

```

**配置 start.sh**

```sh
#!/usr/local/bin bash
set -euo pipefail

cd /mc

# EULA
echo "eula=true" > /mc/eula.txt

# 防止没有 server.properties
if [ ! -f /mc/server.properties ]; then
  cp /mc/server.properties.tmpl /mc/server.properties
fi

# 从环境变量取 RCON_PASSWORD，防止意外留 -changeme（实际没用）
RCON_VAL="${RCON_PASSWORD:-changeme}"

cat >> /mc/server.properties.new <<EOF
enable-rcon=true
rcon.port=25575
rcon.password=${RCON_VAL}
level-name=world
motd=Hello ShTechCraft 1.21.8
enable-query=true
server-ip=
server-port=25565
EOF

mv /mc/server.properties.new /mc/server.properties

# 启动原版 MC
exec java ${JVM_OPTS:-"-Xms512m -Xmx2g"} -jar /mc/server.jar nogui
```

**server.properties.tmpl**

```
allow-flight=false
difficulty=easy
gamemode=survival
pvp=true
max-players=20
view-distance=10
simulation-distance=10
online-mode=true
spawn-protection=0

server-port=25565
query.port=25565

level-name=world

enable-rcon=false
rcon.port=25575
rcon.password=
```

**构建镜像**

```powershell
docker build -t hello-shtechcraft:v1 .
```

随后写个 your-args.txt （懒得想名字了，就这个吧）

```
-p 30075:25575 -v /mnt/c/path/to/world:/mc/world hello-shtechcraft:v1
<usercert>
```

在 wsl2 里跑起来（其实 windows 也可以，但我 debug 的时候去 debian 里跑了）

```bash
./local_checker < your-args.txt
```

至此，得到了 flag

## 题目（不需要 writeups）

> 本部分题目我未在前三完成，理论上不需要写 writeups，但我想写

### N 不是网易云

**背景**

**注意：本题仅供学习使用**

Yanami Anna 想要制作一个爬虫（？，而日常使用得最多的音乐平台无非网易云或者 QQ 音乐。毫无疑问，网易云一点加密也没有的接口（不过现在*部分*有了）被她瞬间秒掉。邪恶的眼睛盯上了 QQ 音乐，却发现了“超高难度”加密接口！

由于需求不高，你只需要考虑一种简单的情况（当然其他情况也类似），尝试调用 QQ 音乐的接口，根据专辑的 MID 获取专辑具体信息（包括专辑名称、封面图片、每首歌曲的信息等）。

**说明**

众所周知（?）[QQ 音乐网页端](https://music.qq.com/) 在请求各类数据时会 POST 这样的接口：https://u6.y.qq.com/cgi-bin/musics.fcg?_=1757578164322&encoding=ag-1&sign=zzc1094ddshenmishuzidesignootkfvnthisisfake

而这其中 sign 是某个函数传入 payload（大概率是 JSON）后计算出的开头为 "zzc" 的一个字符串（注意是 zzc 而非旧版的 zzb）。你需要提取出相关代码（提示：无需破解具体算法）。

[点击此处下载附件](https://acm.shanghaitech.edu.cn/d/G3eKP1E_2025/p/10/file/qqmusic.zip?type=additional_file) 附件给出了模板代码，你需要完善 getSign 函数，并使用这份 Node.js 脚本获取任意你喜欢的专辑的具体信息。

可以使用下面的命令行运行代码（需要先安装 Node.js 环境）

```bash
node qqmusic_album.js
```

**注意**：不要随意修改附件给出的模拟浏览器环境 （除非你明白为什么要这么做），否则会影响最终 sign 值。

#### 题解

依旧人脉题，本题扔给了我的另一个好哥们 [@yxzlwz](https://github.com/yxzlwz)

```js
// submit_template.js
// 模板已更新：你只需要完成这个函数即可，不需要包含模拟环境
// 你不能在这个文件中使用 require, global 等关键字
function getSign(dataStr) {
  // TODO
}
```

看起来就是传入一个 dataStr 返回 sign 即可

首先把玩一下 QQ 音乐的网站，全局搜索一下为 sign 赋值的地方：

![](https://image.honahec.cc/20251001180101332.png)

随后给可疑的地方打上断点，找到 sign 的值

![image-20251001180304841](https://image.honahec.cc/image-20251001180304841.png)

很明显就是这个 P 返回了 sign，我们跳过去看看是什么牛鬼蛇神

![](https://image.honahec.cc/20251001180515549.png)

进来之后我们可以发现这是一个 webpack 打包的格式

在这个函数里，我们找 P 是在哪里导出的

![image-20251001212937916](https://image.honahec.cc/image-20251001212937916.png)

这个 \_getSecuritySign 就应该是它签名的算法

对于常规的 Webpack 我们要找到它的加载器和模块，使用加载器来调用模块

```js
!(function (e) {
  // 加载器
})([
  // 模块
]);
```

在刚才那个函数的最后，我们可以发现

![image-20251001213509882](https://image.honahec.cc/image-20251001213509882.png)

这个 n 就是来调模块的，我们在这里打个断点看看

![image-20251001213725867](https://image.honahec.cc/image-20251001213725867.png)

这个 m 就是这个加载器可以调用的模块

此时我们可以使用 DevTools 进入到加载器的位置

![image-20251001213906496](https://image.honahec.cc/image-20251001213906496.png)

![image-20251001214012224](https://image.honahec.cc/image-20251001214012224.png)

加载器内使用 call 方法来调用模块

此时我们可以先把刚才找到的写进去

```js
!(function(e){
    ...
    function d(t) {
        if (r[t])
            return r[t].exports;
        var a = r[t] = {
            i: t,
            l: !1,
            exports: {}
        };
        return e[t].call(a.exports, a, a.exports, d),
        a.l = !0,
        a.exports
    }
    ...
    window.aaa = d
})([
    function(e, t, n) {
        ...
    }.call(this, n(81))
])
```

接下来，我们去找一下模块 81，我们直接在 console 中调用

![image-20251001214759134](https://image.honahec.cc/image-20251001214759134.png)

![image-20251001214822300](https://image.honahec.cc/image-20251001214822300.png)

把加载器也拉到我们的代码里

```js
!(function(e){
    ...
    function d(t) {
        if (r[t])
            return r[t].exports;
        var a = r[t] = {
            i: t,
            l: !1,
            exports: {}
        };
        return e[t].call(a.exports, a, a.exports, d),
        a.l = !0,
        a.exports
    }
    ...
    window.aaa = d;
})([
    function(e, t, n) {
        ...
        var P = G._getSecuritySign;
        delete G._getSecuritySign;
        t.default = P; // 导出 P
    }.call(this, windows.aaa(1)); // 调用1号模块
    function(e, t) {
        var n;
        n = function() {
            return this
        }();
        try {
            n = n || new Function("return this")()
        } catch (r) {
            "object" === typeof window && (n = window)
        }
        e.exports = n
    }
])
```

这就差不多了，再套个函数接收 dataStr 即可

```js
const getSign = (dataStr) => {
    !(function(e){
        ...
        function d(t) {
            if (r[t])
                return r[t].exports;
            var a = r[t] = {
                i: t,
                l: !1,
                exports: {}
            };
            return e[t].call(a.exports, a, a.exports, d),
            a.l = !0,
            a.exports
        }
        ...
        window.aaa = d;
    })([
        function(e, t, n) {
            ...
            var P = G._getSecuritySign;
            delete G._getSecuritySign;
            t.default = P; // 导出 P
        }.call(this, windows.aaa(1)); // 调用1号模块
        function(e, t) {
            var n;
            n = function() {
                return this
            }();
            try {
                n = n || new Function("return this")()
            } catch (r) {
                "object" === typeof window && (n = window)
            }
            e.exports = n
        }
    ]);

    return window.aaa(0).default(dataStr)
}
```

## 总结

<img src="https://image.honahec.cc/0e721a81d1b034d1561833be97d42ff0.jpg" style="zoom:33%;" />

> 虽然后面又加题被 U 题解密薄纱了（真的解不明白密）
>
> 但很好玩 又一个（也许是多个）人生第一次
