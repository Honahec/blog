---
title: CTF First Exploration - GeekPie Club Recruitment Competition
createTime: 2025/10/3 10:23:32
permalink: /en/blog/fqlwhfh3/
tags:
  - CTF
  - Writeup
---

> [!NOTE]
> This article documents my first experience with CTF and includes writeups for some of the challenges
>
> The hyperlinks for downloading files in this article have not been re-uploaded (lazy), so they cannot be accessed from external networks

## Challenges (Requiring Writeups)

### A Copy That!

**COPY!**

**THAT!**

**CAPCHA!**

**IN!**

**60s!!!**

The page will display a CAPTCHA consisting of 7 lines of many `IJl|1O0()i!` characters.
Please copy the CAPTCHA within 60 seconds, output it in your preferred language, and then submit.

Go To: https://c0p1ed.geekpie.tech/page1

#### Writeup

This is a check-in challenge, relatively simple.

The page has disabled shortcuts, but you can still open F12 via: three dots in the upper right corner -> More tools -> Developer tools

Select the CAPTCHA area to get:

![](https://image.honahec.cc/%E6%88%AA%E5%B1%8F2025-09-30%2009.02.32.png)

Just copy it.

> Additionally, using PHP for submission is a good choice - what you see is what you get

### D Copy That Rev! (First Blood)

"Little D, what's going on? Your CAPTCHA is so weak!"

"What? Impossible!!"

"I've collected their methods. I guess they probably did this..., so I think we can only use the latest... developed by Company I"

You snorted disdainfully and put down the listening headphones.

> Consists of 7 lines of many IJl|1O0()i! characters, but only one line
>
> Go To: https://c0p1ed.geekpie.tech/page2

#### Writeup

This is an enhanced version of Challenge A.

First, play around with the website and discover that it has disabled shortcuts and has certain monitoring events that prevent opening F12 (forced redirect when opened).

In fact, due to my limited skills, I didn't fully understand the principle in the end, but combining information from LLM, here's a rough summary and practical approach:

LLM informed that websites can detect F12 through the following methods:

1. **Worker Anti-Debug Detection**: Many websites don't detect in the main thread, but instead:

```js
new Worker("anti_debug.js");

//anti_debug.js
setInterval(() => {
  if (isDevToolsOpen()) {
    location.href = "/hacker.html";
  }
}, 500);
```

2. **Using Window Size Differences**: When Chrome opens DevTools, the browser window gets squeezed smaller

**For 1**, LLM provided an effective Tampermonkey script:

```js :collapsed-lines
// ==UserScript==
// @name         Worker Debugger Neutralizer (inject)
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Intercept and sanitize created WebWorkers, remove debugger infinite loops & inject importScripts wrapper (inject into page context)
// @match        *://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // Code to be injected into page context (string form)
  const INJECT_CODE = `

(function(){
  // Prevent duplicate injection
  if (window.__worker_debugger_neutralizer_installed) return;
  window.__worker_debugger_neutralizer_installed = true;

  // Simple code sanitization function: remove debugger; and common keywords (can be extended as needed)
  function sanitizeCode(src) {
    try {
      // Keep debugger in single/multi-line comments (not important), actually remove statements
      src = src.replace(/\\bdebugger\\s*;?/g, '// removed debugger;');
      // Remove obvious infinite breakpoint loop forms (example)
      src = src.replace(/for\\s*\\(\\s*let\\s+[^;]+;\\s*[^;]+;\\s*[^\\)]+\\)\\s*{\\s*debugger\\s*;?\\s*}/g, '// removed loop-debugger');
      // Mark/replace devtools word to avoid toString detection etc.
      src = src.replace(/\\bdevtools\\b/gi, 'dev_tools');
      return src;
    } catch (e) {
      return src;
    }
  }

  // Inject wrapper before Worker source code, rewrite importScripts, console, setTimeout etc., protect as much as possible in advance
  function makeWrapperPrefix() {
    return '\\n' +
      '(function(){\\n' +
      '  try{\\n' +
      '    const _importScripts = self.importScripts;\\n' +
      '    self.importScripts = function(){\\n' +
      '      try{\\n' +
      '        const sanitizedArgs = Array.prototype.slice.call(arguments).map(function(u){\\n' +
      '          // If it\'s a relative/absolute URL, try to fetch and replace debugger inside (fallback to original URL if failed)\\n' +
      '          return u;\\n' +
      '        });\\n' +
      '        return _importScripts.apply(self, sanitizedArgs);\\n' +
      '      }catch(e){\\n' +
      '        try{ return _importScripts.apply(self, arguments); }catch(e){}\\n' +
      '      }\\n' +
      '    };\\n' +
      '  }catch(e){}\\n' +
      '  // Prevent debugger from being triggered again inside worker causing freeze\\n' +
      '  try{\\n' +
      '    Object.defineProperty(self, \"debugger\", { get: function(){ return undefined; }, configurable: true });\\n' +
      '  }catch(e){}\\n' +
      '  // Override setInterval/setTimeout to prevent external injection of infinite loop detection\\n' +
      '  try{\\n' +
      '    const _si = self.setInterval; const _st = self.setTimeout;\\n' +
      '    self.setInterval = function(fn, t){ if(typeof fn === \"function\") { return _si(function(){ try{ return fn.apply(this,arguments); }catch(e){} }, t); } return _si(fn,t); };\\n' +
      '    self.setTimeout = function(fn, t){ if(typeof fn === \"function\") { return _st(function(){ try{ return fn.apply(this,arguments); }catch(e){} }, t); } return _st(fn,t); };\\n' +
      '  }catch(e){}\\n' +
      '})();\\n';
  }

  const wrapperPrefix = makeWrapperPrefix();

  // Save original Worker constructor
  const RealWorker = window.Worker;
  const realCreateObjectURL = URL.createObjectURL.bind(URL);

  // Helper for generating real Worker (async)
  async function createSanitizedWorkerFromSourceText(src, options) {
    try {
      const sanitized = sanitizeCode(src);
      const finalSrc = wrapperPrefix + '\\n' + sanitized;
      const blob = new Blob([finalSrc], { type: 'application/javascript' });
      const blobUrl = realCreateObjectURL(blob);
      return new RealWorker(blobUrl, options);
    } catch (e) {
      // Fallback on failure: try directly with original script (may contain debugger)
      try {
        const blob = new Blob([src], { type: 'application/javascript' });
        const blobUrl = realCreateObjectURL(blob);
        return new RealWorker(blobUrl, options);
      } catch (ee) {
        throw ee;
      }
    }
  }

  // Return a "fake Worker" and asynchronously create real Worker, forward after completion
  function makeProxyWorker() {
    let _listeners = {};
    let _onmessage = null;
    let _real = null;
    let _pendingMsgs = [];
    let _terminated = false;

    const proxy = {
      // Standard API: postMessage
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
      // onmessage property
      set onmessage(fn) { _onmessage = fn; },
      get onmessage() { return _onmessage; },

      // Internal: bind real worker to proxy and forward events
      _bindReal: function(realWorker) {
        if (_terminated) { try{ realWorker.terminate(); }catch(e){}; return; }
        _real = realWorker;
        // Forward pending messages
        for (const p of _pendingMsgs) {
          try { _real.postMessage(p.msg, p.transfer); } catch(e) {}
        }
        _pendingMsgs = [];

        // Bind event forwarding
        _real.onmessage = function(ev) {
          // First trigger onmessage callback
          try { if (typeof _onmessage === 'function') _onmessage.call(proxy, ev); } catch(e){}
          // Then trigger addEventListener registered callbacks
          try {
            const s = _listeners['message'];
            if (s) for (const cb of s) { try{ cb.call(proxy, ev); }catch(e){} }
          } catch(e){}
        };
        // Support messageerror
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

  // Override window.Worker
  window.Worker = function(scriptURL, options) {
    // 1) If second parameter omitted, options might be undefined — pass through directly
    const proxy = makeProxyWorker();

    // Asynchronously handle various scriptURL types
    (async function() {
      try {
        // helper: get script text (if feasible)
        async function fetchTextFrom(url) {
          try {
            // Try fetch (CORS may block)
            const r = await fetch(url, { credentials: 'same-origin' });
            if (!r.ok) throw new Error('fetch failed:' + r.status);
            return await r.text();
          } catch (e) {
            // As fallback, try XMLHttpRequest same-origin sync (only works for same-origin)
            try {
              const xhr = new XMLHttpRequest();
              xhr.open('GET', url, false); // sync
              xhr.send(null);
              if (xhr.status === 200 || (location.protocol === 'file:' && xhr.status === 0)) {
                return xhr.responseText;
              }
            } catch (ee){}
            throw e;
          }
        }

        // Handle different forms of scriptURL
        if (typeof scriptURL === 'string') {
          if (scriptURL.startsWith('blob:')) {
            // For blob: URL, try fetch and read text
            try {
              const txt = await (await fetch(scriptURL)).text();
              const real = await createSanitizedWorkerFromSourceText(txt, options);
              proxy._bindReal(real);
              return;
            } catch (e) {
              // Fallback: directly create original Worker
              try { const real = new RealWorker(scriptURL, options); proxy._bindReal(real); return; } catch(e){}
            }
          } else if (scriptURL.startsWith('data:')) {
            // data URL: decode content
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
            // Regular URL (possibly cross-origin)
            try {
              const txt = await fetchTextFrom(scriptURL);
              const real = await createSanitizedWorkerFromSourceText(txt, options);
              proxy._bindReal(real);
              return;
            } catch (e) {
              // Failed (CORS etc.), fallback to directly using original URL
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

        // Final fallback: try to construct directly (if none of the above succeeded)
        try { const real = new RealWorker(scriptURL, options); proxy._bindReal(real); return; } catch(e){ console.error('Worker creation fallback failed', e); }

      } catch (err) {
        // If entire process fails, try to use original Worker directly
        try { const real = new RealWorker(scriptURL, options); proxy._bindReal(real); } catch(e) { console.error('create worker failed', e); }
      }
    })();

    return proxy;
  };

  // Ensure new Worker.prototype instanceof Worker behavior compatibility (best effort)
  try {
    window.Worker.prototype = RealWorker.prototype;
  } catch(e){}

  // Override URL.createObjectURL: also capture Blob->objectURL cases (optional)
  (function(){
    const orig = URL.createObjectURL.bind(URL);
    URL.createObjectURL = function(obj) {
      try {
        // Directly return original behavior (we mainly handle Blob content in Worker ctor)
        return orig(obj);
      } catch(e) {
        return orig(obj);
      }
    };
  })();

})();
`; // end INJECT_CODE

  // Inject script into page context: insert a <script> before documentElement
  function inject(code) {
    try {
      const el = document.createElement("script");
      el.textContent = code;
      // Mark and insert immediately, try to run before page scripts
      const ref = document.documentElement || document.head || document.body;
      if (ref) ref.prepend(el);
      else document.documentElement.appendChild(el);
      // Optional: remove script tag to avoid leakage
      setTimeout(() => el.remove(), 1000);
    } catch (e) {
      console.error("inject failed", e);
    }
  }

  inject(INJECT_CODE);
})();
```

This script does the following:

- All `debugger` statements are replaced by regex
- `devtools` keyword is rewritten
- Anti-debugging loading in `importScripts()` is neutralized

Worker-level detection has no chance to trigger redirect

**For 2**, I originally wanted LLM to also provide a script, but failed. So I had a flash of inspiration and opened Devtools' mobile device mode (you can open F12 after jumping to the hacker page, then return after opening).

- When mobile mode is enabled, Chrome renders the page in a "simulated device viewport"
- At this time, the difference between `innerWidth` / `outerWidth` is almost constant and **does not reflect whether DevTools is open**

Therefore, this type of detection logic fails.

At this point, F12 can be opened smoothly, completing the **first part** of this challenge.

Things are not that simple.

![](https://image.honahec.cc/20251001154523039.png)

The complete characters are split into four chunks, and within each chunk, characters are further divided into several data pieces and assigned IDs. I initially thought I just needed to be fast enough to copy all characters within 60s and submit, but after failing twice, I calmed down and continued researching. The order of characters displayed on the page is inconsistent with the order in Elements: (you can verify yourself, the images above and below are from the same request)

![](https://image.honahec.cc/20251001154501771.png)

With simple observation, we can easily reach the first conclusion: **the four chunks appear in order**

The difficulty lies in: how are characters sorted within chunks?

After simple exploration of the div's style, I found the following code:

![](https://image.honahec.cc/Snipaste_2025-10-01_15-51-49.png)

This provides the sorting rule for elements within chunks: **before first, then after, sorted internally in order**

At this point, the fastest method is to use an appropriate prompt, give LLM the style and four chunks, and let it **without any nonsense** provide the final complete characters.

### G Git

Flag was hidden in Git repositories. Find them.

[Download repos](https://acm.shanghaitech.edu.cn/d/G3eKP1E_2025/p/10/file/Git.zip?type=additional_file)

#### Writeup

This challenge provides four Git repositories and tests knowledge of Git objects. You can check related content on my blog: [Git Objects](./GitObject.md) (for external access, visit [Git Objects](https://blog.honahec.cc/blog/9msarmy4/))

It covers the content tested in this challenge.

### H Unknown Tourist Spot

You obtained a [mysterious file (?)](https://acm.shanghaitech.edu.cn/d/G3eKP1E_2025/p/10/file/12345678?type=additional_file) from ???

If it's you, you'll surely be able to chase after your own ■■■■

#### Writeup

~~Perhaps this is the real check-in challenge (?~~

This challenge provides an image and a readme.txt

```
//readme.txt
VkdobElHNWxZWEpsYzNRZ2RISmhhVzRnYzNSaGRHbHZiam9nWDE5ZlgxOGdVM1JoZEdsdmJpQW9SVzVuYkdsemFDQnZibXg1SVNrPQ==
```

It ends with two equal signs (base64 padding characters), so it's easy to determine this is base64 encoded content.

After decoding once:

```
//From base64 1
VGhlIG5lYXJlc3QgdHJhaW4gc3RhdGlvbjogX19fX18gU3RhdGlvbiAoRW5nbGlzaCBvbmx5ISk=
```

Still has one equal sign, should be able to continue decoding:

```
//From base64 2
The nearest train station: _____ Station (English only!)
```

So this challenge is clear: identify the image location and find the nearest station.

<img src="https://image.honahec.cc/congratulations.png" style="zoom:20%;" />

The problem setter was very friendly - the image can be directly searched on Google, and with the built-in Gemini, it was solved instantly.

![](https://image.honahec.cc/20251001162009352.png)

### I ❖ 𝐊𝐀𝐋𝐄𝐈𝐃×𝐒𝐂𝐎𝐏𝐄 ❖
> "Six posters, six echoes. When light is split into fragments, the world whispers through the cracks—those who hear it will piece the fragments back together."

You are summoned in the dim light. In the backstage of an abandoned theater, behind the stage curtains, six posters have been torn apart, scattered across walls, stage wings, and the bottom of prop boxes. Each one is like a beat, an echo, a refraction of light—they are independent of each other, yet connected by the same hidden thread.

When you pick up the six keys in order, the spectrum will reassemble, and the flag will rise.

![](https://image.honahec.cc/20251001162242780.png)

#### Solution

This is one of the two offline challenges in this competition. First, you need to find posters around the school (6 posters with QR codes).

> The posters are not shown here

These six QR codes provide the following links:

https://2025.geekpie.club/Arch

https://2025.geekpie.club/Web

https://2025.geekpie.club/CTF

https://2025.geekpie.club/HardCore

https://2025.geekpie.club/HPC

https://2025.geekpie.club/DevOps

Compared to https://2025.geekpie.club, after simple observation of the website, it's not hard to find that the Terminal at the bottom of these websites has two additional sections (Arch has one section, no next_hash): (using /Web as an example)

![](https://image.honahec.cc/20251001163840474.png)

After organizing, we get:

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

The approach is clear at a glance:

| Module   | fragment       | SHA256(fragment) | next_hash points to |
| -------- | -------------- | ---------------- | ------------------- |
| CTF      | GEEK           | b90172fa...      | HardCore            |
| HardCore | PIE{           | 37dd2c2e...b95   | Web                 |
| Web      | if(scan==6)\_  | 75dd84ad...156   | DevOps              |
| DevOps   | print("GeekPi` | ac0f6862...e731  | HPC                 |
| HPC      | --\_-----      | 1f649cdf...a41d  | Arch                |
| Arch     | _-_-\__-_")}   | debd8c9a...b6be  |                     |

So the flag is `GEEKPIE{if(scan==6)_print("GeekPie--_------_-_-__-_")}`

### L Can u tell me how much the shirt is?

> How can CTF have listening comprehension questions 😭👊

**Story**

The problem setter didn't do listening comprehension seriously as a child and got points deducted.

**Description**

This is a Unity-based listening playback software.

You need to download the attachment according to your platform first. [Windows](https://acm.shanghaitech.edu.cn/d/G3eKP1E_2025/p/10/file/Windows.zip?type=additional_file) and [MacOS](https://acm.shanghaitech.edu.cn/d/G3eKP1E_2025/p/10/file/MacOS.zip?type=additional_file) versions are provided.

> Note: Not guaranteed to run on all system versions. If you don't have a compatible system, you can try running a virtual machine or cloud computer. But if you're using Windows or MacOS and can't run it directly, please provide feedback meow!

**Note**

1. You should **only** submit flags in the form GEEKPIE{...}, with no extra brackets inside {...}, **no need to use code output**
2. Given the special nature of this flag format, case-insensitive content is accepted
3. Submissions should not contain any whitespace characters, such as `ㅤ` or tabs, newlines

#### Solution

A networking question, no need to say more. As soon as I saw the audio, I didn't hesitate to throw it to my good buddy [@Modenc](https://github.com/modenicheng)

Living up to expectations ~~(maybe not many)~~, solved in two and a half hours ((

<img src="https://image.honahec.cc/e1dbcf0eb71f763af3d6056f8b336c97.jpg" style="zoom:50%;" />

Attached is his [blog solution](https://modenc.top/blog/noeu6vz4/) (link valid after 20251004)

### M Electronic Engineering

**Instructions**

The second component from the left in **TSSOP-16** package is **TMUX1108**. Please look up relevant information yourself, as well as actual circuit connection methods, and answer the following questions.

When I need to read data from the network named **ADCL3**, which pins of this component need to be pulled high/low besides the power pins? Please fill in the relevant pins and leave the remaining pins blank. Please enter [this link](http://139.196.14.200:11456/) to check specific information and submit the output flag.

![](https://image.honahec.cc/20251001165603879.png)

#### Solution

This is a completely blind area for me.

I felt LLM would have difficulty solving this type of question (mainly I don't know how to write prompts and explain how circuits are connected), so I first asked it to briefly introduce TMUX1108 and what this question asks us to do, and got a surprisingly good response:

**Chip Working Principle: TMUX1108 is a 1-to-8 analog multiplexer**

That is to say, one common terminal D can be connected to one of the input terminals S1–S8 through control signals A2, A1, A0.

Its core control logic is a **3-bit binary address**:

> A2A1A0 → selects Sx

And it also has an **EN (enable)** pin:

- When EN = 1 (high level), the chip works normally,
- When EN = 0 (low level), all channels are disconnected (high impedance state).

**Address Truth Table (from TI official datasheet)**

| A2  | A1  | A0  | Selected Channel |
| --- | --- | --- | ---------------- |
| 0   | 0   | 0   | S1               |
| 0   | 0   | 1   | S2               |
| 0   | 1   | 0   | S3               |
| 0   | 1   | 1   | S4               |
| 1   | 0   | 0   | S5               |
| 1   | 0   | 1   | S6               |
| 1   | 1   | 0   | S7               |
| 1   | 1   | 1   | S8               |

**Convert to Pin Numbers (TSSOP-16 package)**

| Pin Number | Name | Description           |
| ---------- | ---- | --------------------- |
| 1          | A0   | Address lowest bit    |
| 2          | EN   | Enable, active high   |
| 15         | A2   | Address highest bit   |
| 16         | A1   | Address middle bit    |

That is to say, by controlling the levels of **pins 1, 2, 15, 16**, you can select different S channels.

This is very good news (enumerable).

So I asked LLM to give all possibilities:

| Channel | A2  | A1  | A0  | EN  | Corresponding Pin Settings (1,2,15,16) |
| ------- | --- | --- | --- | --- | -------------------------------------- |
| S1      | 0   | 0   | 0   | 1   | 1=low, 2=high, 15=low, 16=low          |
| S2      | 0   | 0   | 1   | 1   | 1=high, 2=high, 15=low, 16=low         |
| S3      | 0   | 1   | 0   | 1   | 1=low, 2=high, 15=low, 16=high         |
| S4      | 0   | 1   | 1   | 1   | 1=high, 2=high, 15=low, 16=high        |
| S5      | 1   | 0   | 0   | 1   | 1=low, 2=high, 15=high, 16=low         |
| S6      | 1   | 0   | 1   | 1   | 1=high, 2=high, 15=high, 16=low        |
| S7      | 1   | 1   | 0   | 1   | 1=low, 2=high, 15=high, 16=high        |
| S8      | 1   | 1   | 1   | 1   | 1=high, 2=high, 15=high, 16=high       |

Enumeration completes the task.

### Q Hello SHTechCraft

**Problem Description**

This is a **DevOps direction problem**. You need to refer to [shtechcraft-tutorial](https://github.com/HenryZ16/shtechcraft-tutorial) and complete the following tasks.

---

**Task Requirements**

1. Write Dockerfile

Your Dockerfile should be able to build a directly runnable **Minecraft vanilla 1.21.8 server**.

Specific requirements:

- Base image: Use hello-shtechcraft-base:v1
  - It contains an RCON_PASSWORD environment variable
- Configure RCON connection:
  - RCON password needs to be obtained from the RCON_PASSWORD environment variable
  - The grader will test RCON through port 30075 on the host machine

After building, the image name should be:

```
hello-shtechcraft:v1
```

2. Run the server

You need to provide complete parameters for docker run to ensure the server starts normally.

Requirements:

- Mount the provided save file world.tar.gz (needs to be decompressed first)
- Open RCON port
- Run image hello-shtechcraft:v1

After the server starts successfully, you need to run the local grader provided by the problem for testing.

---

**Scoring Method**

This problem uses **local run + dynamic flag submission** grading method.

You need to submit code in the following form:

```python
print("<your flag>")
```

Where `<your flag>` is the result output by the local grader, for example:

```
flag{XXXead3f}
```

Local Grader Workflow

1. Requires input:
   - Parameters used to start the image (no need for -d and --name)
2. Detection content:
   - MC version: Through /version command, verify if version 1.21.8 is running
   - Save content: Check blocks at certain coordinates, verify if save directory is correctly mounted
3. After verification passes:
   - The grader will ask for usercert input
   - After correct input, the grader outputs the flag

Only after passing all checks can you get points for this problem.

This scoring method aims to simulate real scenarios where network services are packaged with docker. They must first be able to respond to user interactions; secondly, they need to ensure they can persist their own data.

**Note**, if you test on Windows platform, the local checker cannot automatically timeout and exit. If your waiting time is too long, please manually end the local checker and check your configured image or the docker run parameters you entered, etc.

(The problem is too long, the rest is omitted)

#### Solution

> Environment: Windows11 + wsl2(debian)

First import the base image:

```powershell
docker load -i .\hello-shtechcraft-base-v1.tar
```

Create a new folder for necessary files and extract world to the same directory:

- Dockerfile
- start.sh
- server.properties.tmpl
- server-1.21.8.jar
- java21.deb
- world

**Configure Dockerfile**

```dockerfile
# Base image
FROM hello-shtechcraft-base:v1

WORKDIR /mc

# Install Java 21
COPY java21.deb /tmp/java21.deb
RUN apt-get update && \
    dpkg -i /tmp/java21.deb || (apt-get -f install -y && dpkg -i /tmp/java21.deb) && \
    rm -f /tmp/java21.deb && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Place vanilla 1.21.8 server
COPY server-1.21.8.jar /mc/server.jar

# Startup script & configuration template
COPY start.sh /usr/local/bin/start.sh
COPY server.properties.tmpl /mc/server.properties.tmpl
RUN chmod +x /usr/local/bin/start.sh

# JVM default parameters
ENV JVM_OPTS="-Xms512m -Xmx2g"

# Expose ports
EXPOSE 25565 25575

# Mount points
VOLUME ["/mc/world", "/mc/logs"]

ENTRYPOINT ["/usr/local/bin/start.sh"]
```
**Configure start.sh**

```sh
#!/usr/local/bin bash
set -euo pipefail

cd /mc

# EULA
echo "eula=true" > /mc/eula.txt

# Prevent missing server.properties
if [ ! -f /mc/server.properties ]; then
  cp /mc/server.properties.tmpl /mc/server.properties
fi

# Get RCON_PASSWORD from environment variable to prevent accidentally leaving -changeme (not actually used)
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

# Start vanilla MC
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

**Build Image**

```powershell
docker build -t hello-shtechcraft:v1 .
```

Then write a your-args.txt (too lazy to think of a name, let's just use this)

```
-p 30075:25575 -v /mnt/c/path/to/world:/mc/world hello-shtechcraft:v1
<usercert>
```

Run it in wsl2 (actually Windows works too, but I ran it in Debian when debugging)

```bash
./local_checker < your-args.txt
```

At this point, got the flag

## Problems (no writeups needed)
> I did not complete the problems in this section during the first three parts. Theoretically, I don't need to write writeups, but I want to

### N is Not NetEase Cloud Music

**Background**

**Note: This problem is for learning purposes only**

Yanami Anna wants to create a web scraper (?), and the most commonly used music platforms are nothing more than NetEase Cloud Music or QQ Music. Without a doubt, NetEase Cloud Music's interface with no encryption at all (though now *some parts* have it) was instantly cracked by her. Her evil eyes turned to QQ Music, only to discover "extremely difficult" encrypted interfaces!

Since the requirements are not high, you only need to consider a simple case (of course, other cases are similar), try to call QQ Music's API, and obtain detailed album information (including album name, cover image, information for each song, etc.) based on the album's MID.

**Description**

As everyone knows (?) [QQ Music web version](https://music.qq.com/) POSTs to interfaces like this when requesting various data: https://u6.y.qq.com/cgi-bin/musics.fcg?_=1757578164322&encoding=ag-1&sign=zzc1094ddshenmishuzidesignootkfvnthisisfake

Among these, sign is a string starting with "zzc" calculated by a certain function after passing in a payload (most likely JSON) (note it's zzc, not the old version's zzb). You need to extract the relevant code (hint: no need to crack the specific algorithm).

[Click here to download the attachment](https://acm.shanghaitech.edu.cn/d/G3eKP1E_2025/p/10/file/qqmusic.zip?type=additional_file) The attachment provides template code. You need to complete the getSign function and use this Node.js script to obtain detailed information for any album you like.

You can run the code using the following command (Node.js environment must be installed first)

```bash
node qqmusic_album.js
```

**Note**: Do not arbitrarily modify the simulated browser environment provided in the attachment (unless you understand why you need to do so), otherwise it will affect the final sign value.

#### Solution

Still a networking problem, I threw this problem to another good friend of mine [@yxzlwz](https://github.com/yxzlwz)

```js
// submit_template.js
// Template updated: you only need to complete this function, no need to include the simulation environment
// You cannot use keywords like require, global, etc. in this file
function getSign(dataStr) {
  // TODO
}
```

It looks like you just need to pass in a dataStr and return the sign

First, play around with the QQ Music website and do a global search for places where sign is assigned:

![](https://image.honahec.cc/20251001180101332.png)

Then set breakpoints at suspicious places to find the value of sign

![image-20251001180304841](https://image.honahec.cc/image-20251001180304841.png)

It's obvious that this P returns the sign. Let's jump over and see what kind of monster it is

![](https://image.honahec.cc/20251001180515549.png)

After entering, we can see this is a webpack bundled format

In this function, we look for where P is exported

![image-20251001212937916](https://image.honahec.cc/image-20251001212937916.png)

This \_getSecuritySign should be its signing algorithm

For regular Webpack, we need to find its loader and modules, and use the loader to call the modules

```js
!(function (e) {
  // loader
})([
  // modules
]);
```

At the end of that function we just looked at, we can find

![image-20251001213509882](https://image.honahec.cc/image-20251001213509882.png)

This n is used to call modules. Let's set a breakpoint here and take a look

![image-20251001213725867](https://image.honahec.cc/image-20251001213725867.png)

This m is the modules that this loader can call

At this point, we can use DevTools to enter the loader's location

![image-20251001213906496](https://image.honahec.cc/image-20251001213906496.png)

![image-20251001214012224](https://image.honahec.cc/image-20251001214012224.png)

The loader uses the call method to invoke modules

Now we can write in what we found earlier

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

Next, let's find module 81. We can call it directly in the console

![image-20251001214759134](https://image.honahec.cc/image-20251001214759134.png)

![image-20251001214822300](https://image.honahec.cc/image-20251001214822300.png)

Pull the loader into our code as well

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
        t.default = P; // export P
    }.call(this, windows.aaa(1)); // call module 1
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

That's pretty much it. Just wrap it in a function to receive dataStr

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
            t.default = P; // export P
        }.call(this, windows.aaa(1)); // call module 1
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
## Summary

<img src="https://image.honahec.cc/0e721a81d1b034d1561833be97d42ff0.jpg" style="zoom:33%;" />

> Although later additional problems got completely destroyed by U's cryptography solutions (really couldn't figure out the crypto)
>
> But it was very fun, another (or maybe multiple) first time(s) in life