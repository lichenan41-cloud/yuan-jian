/* =========================================================
   回信 · 致岁念 — 交互
   无依赖，原生 JS。所有动效尊重 prefers-reduced-motion。
   ========================================================= */
(function () {
  'use strict';

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. 拆字：首屏标题 / 落款祝福 ---------- */
  function splitChars(el) {
    if (!el || el.dataset.split === '1') return;
    var text = el.textContent.replace(/\s+/g, '');
    if (!text) return;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    Array.prototype.forEach.call(text, function (ch, i) {
      var span = document.createElement('span');
      span.className = 'char';
      span.textContent = ch;
      span.style.setProperty('--i', i);
      span.setAttribute('aria-hidden', 'true');
      el.appendChild(span);
    });
    el.dataset.split = '1';
  }

  splitChars($('#heroTitle'));
  splitChars($('#endBless'));

  /* ---------- 2. 首屏浮尘 ---------- */
  (function motes() {
    var box = $('#motes');
    if (!box || reduceMotion) return;
    for (var i = 0; i < 14; i++) {
      var m = document.createElement('span');
      m.className = 'mote';
      var size = 2 + Math.random() * 3.4;
      m.style.width = size + 'px';
      m.style.height = size + 'px';
      m.style.left = (4 + Math.random() * 92) + '%';
      m.style.top = (18 + Math.random() * 74) + '%';
      m.style.opacity = 0.35 + Math.random() * 0.35;
      m.style.animationDuration = (20 + Math.random() * 22) + 's';
      m.style.animationDelay = (-Math.random() * 30) + 's';
      box.appendChild(m);
    }
  })();

  /* ---------- 3. 首屏墨晕跟随 ---------- */
  (function heroGlow() {
    var hero = $('#hero');
    var bg = $('#heroBg');
    if (!hero || !bg || reduceMotion) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    var raf = null, tx = 28, ty = 32;
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * 100;
      ty = ((e.clientY - r.top) / r.height) * 100;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        bg.style.setProperty('--mx', tx + '%');
        bg.style.setProperty('--my', ty + '%');
        raf = null;
      });
    });
  })();

  /* ---------- 4. 滚动进度 / 顶栏 / 章节高亮 ---------- */
  (function scrollUI() {
    var bar = $('#progressBar');
    var topbar = $('#topbar');
    var rail = $('#rail');
    var sections = $$('[data-section]');
    var railLinks = $$('#rail a');
    var ticking = false;

    function update() {
      ticking = false;
      var y = window.pageYOffset || document.documentElement.scrollTop;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var ratio = h > 0 ? Math.min(1, Math.max(0, y / h)) : 0;

      if (bar) bar.style.transform = 'scaleX(' + ratio + ')';
      if (topbar) topbar.classList.toggle('is-scrolled', y > 30);
      if (rail) rail.classList.toggle('is-visible', y > window.innerHeight * 0.55);

      var current = sections[0];
      var line = window.innerHeight * 0.36;
      sections.forEach(function (s) {
        if (s.getBoundingClientRect().top <= line) current = s;
      });
      if (!current) return;
      railLinks.forEach(function (a) {
        var on = a.getAttribute('data-nav') === current.id;
        if (on) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  })();

  /* ---------- 5. 滚动显现 ---------- */
  (function reveals() {
    var items = $$('.reveal');
    var end = $('#end');

    function showEnd() {
      if (end) end.classList.add('is-in');
    }

    if (!('IntersectionObserver' in window) || reduceMotion) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      showEnd();
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    items.forEach(function (el) { io.observe(el); });

    if (end) {
      var ioEnd = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          showEnd();
          ioEnd.disconnect();
        });
      }, { threshold: 0.25 });
      ioEnd.observe(end);
    }
  })();

  /* ---------- 6. 目录 ---------- */
  (function indexOverlay() {
    var dialog = $('#index');
    var openBtn = $('#menuBtn');
    var closeBtn = $('#indexClose');
    var main = $('#main');
    var topbar = $('#topbar');
    var footer = $('.footer');
    var lastFocus = null;
    var isOpen = false;

    function focusables() {
      return $$('a[href], button, [tabindex]:not([tabindex="-1"])', dialog);
    }

    function open() {
      if (isOpen) return;
      isOpen = true;
      lastFocus = document.activeElement;
      dialog.classList.add('is-open');
      dialog.setAttribute('aria-hidden', 'false');
      openBtn.setAttribute('aria-expanded', 'true');
      document.body.classList.add('is-locked');
      if (main) main.inert = true;
      if (topbar) topbar.inert = true;
      if (footer) footer.inert = true;
      var first = focusables()[0];
      if (first) first.focus();
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      dialog.classList.remove('is-open');
      dialog.setAttribute('aria-hidden', 'true');
      openBtn.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('is-locked');
      if (main) main.inert = false;
      if (topbar) topbar.inert = false;
      if (footer) footer.inert = false;
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    openBtn.addEventListener('click', open);
    closeBtn.addEventListener('click', close);

    dialog.addEventListener('click', function (e) {
      if (e.target === dialog) close();
    });

    dialog.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });

    $$('a[href^="#"]', dialog).forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var target = document.querySelector(a.getAttribute('href'));
        close();
        if (!target) return;
        setTimeout(function () {
          target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        }, 60);
      });
    });
  })();


  /* ---------- 愿笺 ---------- */
  (function wishCards() {
    var cards = $$('.wishcard');
    if (!cards.length) return;
    var grid = $('#wishGrid');
    var countEl = $('#wishCount');
    var dots = $('#wishDots');
    var flipAll = $('#flipAll');
    var reset = $('#flipReset');
    var done = $('#wishDone');
    var busy = false;

    if (dots) {
      for (var i = 0; i < cards.length; i++) {
        dots.appendChild(document.createElement('i'));
      }
    }

    function openedCount() {
      var n = 0;
      for (var i = 0; i < cards.length; i++) if (cards[i].classList.contains('is-flipped')) n++;
      return n;
    }

    function paint() {
      var opened = openedCount();
      if (countEl) countEl.textContent = '已翻开 ' + opened + ' / ' + cards.length;
      if (dots) {
        for (var i = 0; i < cards.length; i++) {
          if (dots.children[i]) dots.children[i].classList.toggle('is-on', cards[i].classList.contains('is-flipped'));
        }
      }
      if (done) done.classList.toggle('is-visible', opened === cards.length);
      if (reset) reset.disabled = opened === 0;
      if (flipAll) flipAll.disabled = opened === cards.length;
    }

    function toggle(card) {
      var on = !card.classList.contains('is-flipped');
      card.classList.toggle('is-flipped', on);
      card.setAttribute('aria-pressed', on ? 'true' : 'false');
      paint();
    }

    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        if (busy) return;
        toggle(card);
      });
    });

    if (flipAll) {
      flipAll.addEventListener('click', async function () {
        if (busy) return;
        busy = true;
        if (grid) grid.classList.add('is-busy');
        if (reset) reset.disabled = true;
        for (var i = 0; i < cards.length; i++) {
          if (!cards[i].classList.contains('is-flipped')) {
            toggle(cards[i]);
            await wait(70);
          }
        }
        busy = false;
        if (grid) grid.classList.remove('is-busy');
        paint();
      });
    }

    if (reset) {
      reset.addEventListener('click', function () {
        if (busy) return;
        cards.forEach(function (card) {
          card.classList.remove('is-flipped');
          card.setAttribute('aria-pressed', 'false');
        });
        paint();
      });
    }

    paint();
  })();

  /* ---------- 7. 信封 ---------- */
  (function envelopes() {
    $$('[data-env]').forEach(function (env) {
      var hit = $('.env__hit', env);
      var label = $('.sr-only', hit);
      var base = label ? label.textContent : '这封信';
      var open = false;

      function toggle() {
        open = !open;
        env.classList.toggle('is-open', open);
        hit.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (label) label.textContent = open ? base.replace('展开', '收起') : base;
      }

      hit.addEventListener('click', toggle);
    });
  })();

  /* ---------- 8. 校刊翻页 ---------- */
  (function journal() {
    var stage = $('#journalStage');
    if (!stage) return;
    var pages = $$('.jpage', stage);
    var prev = $('#jPrev');
    var next = $('#jNext');
    var count = $('#jCount');
    var current = 0;
    var total = pages.length;

    function render() {
      pages.forEach(function (p, i) {
        var d = i - current;
        p.style.setProperty('--d', d > 0 ? d : 0);
        if (i < current) {
          p.classList.add('is-past');
          p.setAttribute('aria-hidden', 'true');
        } else {
          p.classList.remove('is-past');
          p.setAttribute('aria-hidden', i === current ? 'false' : 'true');
          p.style.zIndex = i < current ? '4' : String(20 - d);
        }
      });
      if (prev) prev.disabled = current === 0;
      if (next) next.disabled = current === total - 1;
      if (count) count.textContent = ('0' + (current + 1)).slice(-2) + ' / ' + ('0' + total).slice(-2);
    }

    function go(step) {
      var target = Math.min(total - 1, Math.max(0, current + step));
      if (target === current) return;
      current = target;
      render();
    }

    if (prev) prev.addEventListener('click', function () { go(-1); });
    if (next) next.addEventListener('click', function () { go(1); });
    stage.addEventListener('click', function () { go(1); });
    stage.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault(); go(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault(); go(-1);
      }
    });

    render();
  })();

  /* ---------- 9. 抽签 ---------- */
  (function drawLots() {
    var WISHES = [
      '愿你抬头有星，低头有路',
      '愿你去过的地方，都有好天气',
      '愿你的名字，被写进好消息里',
      '愿你不慌不忙，什么都来得及',
      '愿你在冬天，有很暖的外套',
      '愿你的好运，刚好够用也长久',
      '愿你所求皆如愿，所行化坦途',
      '愿你有拒绝的勇气，也有欢喜',
      '愿你想去的地方，都买得到票',
      '愿你的日子，有惊无险，有甜',
      '愿文学社的灯，总有人替你留着',
      '祝你幸福而自在'
    ];
    var TOTAL = WISHES.length;
    var FINAL = TOTAL - 1;

    var btn = $('#drawBtn');
    var slip = $('#slip');
    var text = $('#slipText');
    var dots = $('#drawDots');
    var countEl = $('#drawCount');
    var doneEl = $('#drawDone');
    var live = $('#drawLive');
    var tube = $('#tube');
    if (!btn || !slip || !text || !tube) return;

    var pool = [];
    var drawn = 0;
    var busy = false;

    function shuffle(arr) {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    }

    function buildDots() {
      if (!dots) return;
      dots.innerHTML = '';
      for (var i = 0; i < TOTAL; i++) {
        var d = document.createElement('i');
        dots.appendChild(d);
      }
    }

    function paintDots() {
      if (!dots) return;
      Array.prototype.forEach.call(dots.children, function (d, i) {
        d.classList.toggle('is-on', i < drawn);
      });
    }

    function reset() {
      pool = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      drawn = 0;
      if (doneEl) doneEl.classList.remove('is-visible');
      if (countEl) countEl.textContent = '共十二支 · 已抽 0';
      slip.classList.remove('is-out', 'is-final');
      btn.textContent = '抽 一 支';
      paintDots();
    }

    async function pick() {
      if (busy) return;
      if (drawn >= TOTAL) reset();

      busy = true;
      btn.disabled = true;

      if (slip.classList.contains('is-out')) {
        slip.classList.remove('is-out');
        await wait(reduceMotion ? 30 : 620);
      }

      tube.classList.remove('is-shaking');
      void tube.offsetWidth;
      tube.classList.add('is-shaking');
      await wait(reduceMotion ? 30 : 520);
      tube.classList.remove('is-shaking');

      var idx = pool.length ? pool.pop() : FINAL;
      var wish = WISHES[idx];

      text.textContent = wish;
      slip.classList.toggle('is-final', idx === FINAL);
      drawn += 1;

      requestAnimationFrame(function () {
        slip.classList.add('is-out');
      });

      if (countEl) countEl.textContent = '共十二支 · 已抽 ' + drawn;
      if (live) live.textContent = '第 ' + drawn + ' 支：' + wish;
      paintDots();

      if (drawn >= TOTAL) {
        btn.textContent = '再 抽 一 轮';
        if (doneEl) doneEl.classList.add('is-visible');
      }

      busy = false;
      btn.disabled = false;
    }

    btn.addEventListener('click', pick);
    buildDots();
    reset();
  })();

  /* ---------- 10. 落款印章 ---------- */
  (function seal() {
    var btn = $('#sealBtn');
    var end = $('#end');
    if (!btn || !end) return;
    var stamped = false;

    btn.addEventListener('click', function () {
      if (stamped) return;
      stamped = true;
      btn.classList.add('is-stamped');
      end.classList.add('is-stamped');
      btn.setAttribute('aria-pressed', 'true');
      btn.setAttribute('aria-label', '已落款');
    });
  })();

  /* ---------- 11. 落雪 ---------- */
  (function snow() {
    var canvas = $('#snow');
    var section = $('#end');
    if (!canvas || !section || reduceMotion) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var flakes = [];
    var w = 0, h = 0, dpr = 1, raf = 0, running = false;

    function resize() {
      var r = section.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      make();
    }

    function make() {
      var n = Math.min(80, Math.max(28, Math.round(w / 14)));
      flakes = [];
      for (var i = 0; i < n; i++) {
        flakes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.7 + Math.random() * 1.7,
          s: 0.18 + Math.random() * 0.42,
          p: Math.random() * Math.PI * 2,
          a: 0.18 + Math.random() * 0.4
        });
      }
    }

    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < flakes.length; i++) {
        var f = flakes[i];
        f.y += f.s;
        f.p += 0.008;
        f.x += Math.sin(f.p) * 0.24;
        if (f.y > h + 6) {
          f.y = -6;
          f.x = Math.random() * w;
        }
        if (f.x < -8) f.x = w + 8;
        if (f.x > w + 8) f.x = -8;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,' + f.a + ')';
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (running) return;
      running = true;
      resize();
      frame();
    }

    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) start();
          else stop();
        });
      }, { threshold: 0.05 });
      io.observe(section);
    } else {
      start();
    }

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (running) resize();
      }, 180);
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else if (section.getBoundingClientRect().top < window.innerHeight) start();
    });
  })();

  /* ---------- 分享 ---------- */
  (function shareSite() {
    var btn = $('#shareBtn');
    if (!btn) return;
    var toast = $('#toast');
    var guide = $('#shareGuide');
    var guideClose = $('#shareGuideClose');
    var siteUrl = 'https://yuan-jian.netlify.app/';
    var title = '愿笺 · 致岁念';
    var text = '十二个祝愿，四封短笺，一本特刊。都给你。';
    var toastTimer = null;
    var lastFocus = null;

    function isWeChat() {
      return /MicroMessenger/i.test(navigator.userAgent || '');
    }

    function isMobile() {
      return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
    }

    function showToast(msg) {
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add('is-visible');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toast.classList.remove('is-visible'); }, 2800);
    }

    function fallbackCopy(done) {
      var ta = document.createElement('textarea');
      ta.value = siteUrl;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      done();
    }

    function copyLink() {
      var done = function () { showToast('链接已复制，打开微信粘贴发送'); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(siteUrl).then(done).catch(function () { fallbackCopy(done); });
      } else {
        fallbackCopy(done);
      }
    }

    function openGuide() {
      if (!guide) return;
      lastFocus = document.activeElement;
      guide.classList.add('is-open');
      guide.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-locked');
      if (guideClose) guideClose.focus();
    }

    function closeGuide() {
      if (!guide) return;
      guide.classList.remove('is-open');
      guide.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-locked');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    btn.addEventListener('click', function () {
      if (isWeChat()) { openGuide(); return; }
      if (isMobile() && navigator.share) {
        try {
          navigator.share({ title: title, text: text, url: siteUrl }).catch(function (err) {
            if (err && err.name === 'AbortError') return;
            copyLink();
          });
        } catch (e) {
          copyLink();
        }
        return;
      }
      copyLink();
    });

    if (guideClose) guideClose.addEventListener('click', closeGuide);
    if (guide) {
      guide.addEventListener('click', function (e) {
        if (e.target === guide) closeGuide();
      });
      guide.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeGuide();
      });
    }
  })();

  /* ---------- 12. 打印这封信 ---------- */
  (function printLetter() {
    var btn = $('#printBtn');
    if (!btn) return;
    btn.addEventListener('click', function () { window.print(); });
  })();

  /* ---------- 13. 外部链接兜底：平滑锚点 ---------- */
  $$('a[href^="#"]:not(.rail a):not(.index a)').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', id);
    });
  });
})();
