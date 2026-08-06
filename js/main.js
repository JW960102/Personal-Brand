// ============================================
// 퍼스널 브랜드 v2 — 무대 스케일 + 히어로 영상 확장 + 가치 섹션 스텝
// 무대 2분할: #stage1(히어로~인트로) / sticky 가치 트랙 / #stage2(웍스~푸터)
// ============================================
(function () {
  var root = document.documentElement;
  var stage1 = document.getElementById('stage1');
  var stage2 = document.getElementById('stage2');
  var clamp1 = document.getElementById('clamp1');
  var clamp2 = document.getElementById('clamp2');
  var track = document.getElementById('valuesTrack');
  var sticky = document.getElementById('valuesSticky');
  var values = document.querySelector('.values');
  var video = document.getElementById('heroVideo');
  var zone = document.getElementById('videoZone');
  var header = document.querySelector('.site-header');
  var arrow = document.querySelector('.hero-arrow');
  var footerReveal = document.getElementById('footerReveal');
  var footerSpace = document.querySelector('.footer-space');
  var introSec = document.querySelector('.intro');
  var introRevealed = false;

  // 프로젝트 이미지·기여도 박스: 아래에 떠 있다가 자기 영역이 다 보이면 제자리로
  // (스크롤에 연동 — 위로 올리면 그대로 되돌아감)
  var FLOAT_OFFSET = 90;    // 띄우는 거리 (캔버스 px)
  var FLOAT_START = 0.85;   // 요소 상단이 화면 높이의 이 지점에 와야 등장 시작 (낮출수록 더 늦게 나타남)
  var FLOAT_SETTLE = 0.20;  // 이 지점에 오면 제자리 안착 (낮을수록 늦게 도착)
  var FLOAT_FADE = 0.6;     // 진행률 중 페이드인이 끝나는 비율
  var floats = [];          // { el, top(문서 기준 화면좌표), h }

  // 프로젝트 01·02·03 이미지 — 커튼 리빌 (clones/05 뮤자인의 .img.motion 과 같은 방식).
  // 원본은 흰 오버레이 height 를 90%→0% 로 줄이는데, 여기서는 clip-path 로 같은 결과를 낸다
  // (<img> 에는 ::after 를 못 붙인다).
  // ⚠️ IntersectionObserver 로 하면 안 된다 — 요소가 스스로를 8% 로 잘라 두기 때문에
  //    교차 '비율'이 그 위로 올라가지 못해 threshold 를 영영 넘지 못한다 (2026-08-06 실제로 겪음).
  //    이미 매 프레임 도는 스크롤 계산이 있으니 그쪽에 붙인다.
  var curtains = [];        // { el, top }
  var CURTAIN_AT = 0.85;    // 요소 상단이 화면 이 지점에 닿으면 걷힌다

  // --- 케이스 스터디: 히어로 사진 → 01 슬롯 이동 (work-*.html 에서만 존재) ---
  var chPhoto = document.getElementById('chPhoto');
  var chSlot = document.getElementById('caseSlot');
  var CH_BOX = { x: 647, y: 633, w: 876, h: 1282 };  // 시안 실측 (캔버스 px)
  var CH_SETTLE = 0.2;      // 슬롯 상단이 화면 높이의 이 지점에 오면 이동 완료
  var CH_HOLD = 0.9;        // '사이트 보기' 가 화면 이 지점까지 올라오면 이동 시작
                            //  (0.9 = 화면 아래쪽에 막 나타났을 때 / 낮출수록 더 늦게 시작)
  var chLink = document.querySelector('.ch-link');
  var slotDoc = null;       // 슬롯의 문서 기준 위치·크기 (fit 때 측정)
  var chLinkTop = 0;        // '사이트 보기' 의 문서상 위치

  // --- 히어로 영상 박스 (1920 캔버스 px · MAKE & 오른쪽) ---
  var BOX = { x: 1226, y: 465, w: 264, h: 176 };
  var EXPAND = 900;     // 박스→풀스크린 확장 스크롤 거리 (캔버스 px)
  var HOLD = 600;       // 풀스크린 유지 구간 (캔버스 px)
  // --- 가치 섹션 ---
  var VALUES_H = 1244;  // .values 높이 (캔버스 px, CSS와 동일 — 바꾸면 style.css .values 도 같이)
  var PIN_DIST = 3000;  // sticky 핀 동안 스크롤 거리 (캔버스 px, 스텝당 1000)
  // --- 푸터 ---
  var FOOTER_H = 700;   // .site-footer 높이 (캔버스 px, CSS와 동일 — 바꾸면 style.css 도 같이)

  // 무대 좌우 여백 — 화면 크기에 비례(4%)하되 상·하한을 둔다
  var STAGE_MARGIN = 0.04;
  var STAGE_MARGIN_MIN = 24;
  var STAGE_MARGIN_MAX = 120;

  var sf = 1;
  var margin = 0;       // 이번 프레임의 실제 여백 px
  var lastY = 0;        // 헤더 방향 감지용 직전 스크롤 위치
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var introDone = false; // 인트로 재생 중에는 헤더·화살표를 스크롤 로직이 건드리지 않음

  // 1920 무대를 뷰포트 폭에 맞춰 스케일 (--sf).
  // 단, 좌우에 여백(--stage-margin)을 남기고 그만큼 작게 그린다.
  // 좌표를 건드리지 않고 여백을 만드는 방법이라 시안과의 정렬이 그대로 보존된다.
  // transform은 레이아웃 높이를 안 줄이므로 클램프/트랙 높이를 실제 px로 보정.
  function fit() {
    var m = window.innerWidth * STAGE_MARGIN;
    if (m < STAGE_MARGIN_MIN) m = STAGE_MARGIN_MIN;
    if (m > STAGE_MARGIN_MAX) m = STAGE_MARGIN_MAX;
    margin = m;
    sf = (window.innerWidth - m * 2) / 1920;
    root.style.setProperty('--sf', sf);
    root.style.setProperty('--stage-margin', m + 'px');
    if (zone) zone.style.height = (EXPAND + HOLD) + 'px';
    syncHeights();
    if (sticky) sticky.style.height = VALUES_H * sf + 'px';
    if (track) track.style.height = (VALUES_H + PIN_DIST) * sf + 'px';
    // 고정 푸터와 그것이 드러날 스크롤 여유는 같은 높이여야 딱 맞게 드러난다
    if (footerReveal) footerReveal.style.height = FOOTER_H * sf + 'px';
    if (footerSpace) footerSpace.style.height = FOOTER_H * sf + 'px';
    measureFloats();   // 높이 확정 후 측정
    measureSlot();
    onScroll();
  }

  // 케이스 스터디 사진이 내려앉을 슬롯의 문서상 위치를 재둔다
  function measureSlot() {
    if (!chSlot) return;
    var y = window.scrollY || window.pageYOffset;
    var r = chSlot.getBoundingClientRect();
    slotDoc = { top: r.top + y, left: r.left, w: r.width, h: r.height };
    if (chLink) chLinkTop = chLink.getBoundingClientRect().top + y;
  }

  // 클램프 높이 = 무대의 '축소된' 높이. 무대 안 내용이 늘어나면(아코디언 등)
  // 다시 재지 않으면 overflow:hidden 에 잘린다.
  function syncHeights() {
    if (clamp1 && stage1) clamp1.style.height = stage1.offsetHeight * sf + 'px';
    if (clamp2 && stage2) clamp2.style.height = stage2.offsetHeight * sf + 'px';
  }

  // 부유 대상의 문서상 위치를 미리 재둔다 (매 스크롤마다 레이아웃을 읽으면 버벅임).
  // transform이 걸린 상태로 재면 위치가 어긋나므로 전부 초기화한 뒤 한 번에 측정.
  // ⚠️ 이미지(img·figure)는 여기서 제외한다 — 2026-08-06 부터 커튼 리빌이 맡는다.
  //    같은 요소에 부유 + 커튼을 겹치면 등장이 두 번 일어나 산만해진다.
  function measureFloats() {
    measureCurtains();
    var els = document.querySelectorAll('.proj > .ph-meta, .proj > .meta-card');
    var i;
    for (i = 0; i < els.length; i++) {
      els[i].style.transform = '';
      els[i].style.opacity = '';
    }
    var y = window.scrollY || window.pageYOffset;
    floats = [];
    for (i = 0; i < els.length; i++) {
      var r = els[i].getBoundingClientRect();
      floats.push({ el: els[i], top: r.top + y, h: r.height });
    }
  }

  // 커튼 대상의 문서상 위치를 재둔다. clip-path 는 getBoundingClientRect 에 영향이 없어
  // 잘린 상태에서 재도 원래 박스가 나온다.
  function measureCurtains() {
    var els = document.querySelectorAll('.proj > img, .proj > figure');
    var y = window.scrollY || window.pageYOffset;
    curtains = [];
    for (var i = 0; i < els.length; i++) {
      if (!reduceMotion) els[i].classList.add('curtain');
      curtains.push({ el: els[i], top: els[i].getBoundingClientRect().top + y });
    }
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  // 스크롤 위치에 따라 영상 레이어의 뷰포트 좌표를 계산
  //  구간1 [0 ~ EXPAND)      : 히어로 박스(문서 앵커)에서 풀스크린으로 보간 확장
  //  구간2 [EXPAND ~ +HOLD]  : 풀스크린 고정(핀)
  //  구간3 (그 이후)          : 문서 앵커 복귀 → 위로 스크롤아웃
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var D = EXPAND * sf;
    var H = HOLD * sf;

    if (video) {
      var bx = margin + BOX.x * sf, by = BOX.y * sf, bw = BOX.w * sf, bh = BOX.h * sf;
      var L, T, W, Hh;
      if (y < D) {
        var t = easeInOut(Math.min(y / D, 1));
        L = lerp(bx, 0, t);
        T = lerp(by - y, 0, t);
        W = lerp(bw, vw, t);
        Hh = lerp(bh, vh, t);
      } else if (y <= D + H) {
        L = 0; T = 0; W = vw; Hh = vh;
      } else {
        L = 0; T = (D + H) - y; W = vw; Hh = vh;
      }
      video.style.left = L + 'px';
      video.style.top = T + 'px';
      video.style.width = W + 'px';
      video.style.height = Hh + 'px';
    }

    // 케이스 스터디 히어로 사진: 히어로 자리 → 01 슬롯으로 이동·축소.
    // 시작·끝 위치를 모두 '문서 좌표 − 스크롤'로 계산하므로, 도착(p=1) 이후에는
    // 슬롯과 함께 자연스럽게 스크롤된다 (따로 고정 해제 처리가 필요 없다).
    if (chPhoto && slotDoc) {
      var sT = CH_BOX.y * sf, sL = margin + CH_BOX.x * sf;
      var sW = CH_BOX.w * sf, sH = CH_BOX.h * sf;
      // '사이트 보기'를 충분히 본 뒤(CH_HOLD)부터 시작해,
      // 슬롯 상단이 화면 CH_SETTLE 지점에 닿을 때 끝난다
      var chFrom = Math.max(0, chLinkTop - vh * CH_HOLD);
      var chTo = slotDoc.top - vh * CH_SETTLE;
      var cp = (y - chFrom) / Math.max(1, chTo - chFrom);
      cp = cp < 0 ? 0 : (cp > 1 ? 1 : cp);
      var ce = cp < 0.5 ? 4 * cp * cp * cp : 1 - Math.pow(-2 * cp + 2, 3) / 2;
      chPhoto.style.left = lerp(sL, slotDoc.left, ce) + 'px';
      chPhoto.style.top = lerp(sT - y, slotDoc.top - y, ce) + 'px';
      chPhoto.style.width = lerp(sW, slotDoc.w, ce) + 'px';
      chPhoto.style.height = lerp(sH, slotDoc.h, ce) + 'px';
    }

    // 인트로 카피: 섹션이 화면에 1/3쯤 들어오면 한 번만 순차 등장 (되돌리지 않음)
    // getBoundingClientRect는 무대 스케일이 반영된 실제 화면 좌표라 --sf 보정이 불필요
    if (introSec && !introRevealed && introSec.getBoundingClientRect().top < vh * 0.67) {
      introSec.classList.add('reveal');
      introRevealed = true;
    }

    // 커튼 리빌: 요소 상단이 화면 CURTAIN_AT 지점까지 올라오면 걷는다. 한 번만(되돌리지 않음).
    for (var ci = 0; ci < curtains.length; ci++) {
      var c = curtains[ci];
      if (c.done) continue;
      if (c.top - y < vh * CURTAIN_AT) {
        c.el.classList.add('is-open');
        c.done = true;
      }
    }

    // 프로젝트 이미지·기여도 박스 부유:
    // 화면 아래쪽(FLOAT_START)에 닿을 때부터 서서히 나타나며 떠오르고,
    // 상단이 FLOAT_SETTLE 지점까지 올라오면 제자리(0)에 안착.
    // 이동 구간을 화면 기준으로 잡아 요소 크기와 무관하게 같은 리듬으로 움직인다.
    if (!reduceMotion) {
      var range = vh * (FLOAT_START - FLOAT_SETTLE);
      for (var fi = 0; fi < floats.length; fi++) {
        var f = floats[fi];
        var p = (vh * FLOAT_START - (f.top - y)) / range;   // 0=등장 직전, 1=안착
        p = p < 0 ? 0 : (p > 1 ? 1 : p);
        // easeInOutCubic — 전반에 몰리지 않고 끝까지 고르게 따라 올라옴
        var e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        var off = FLOAT_OFFSET * (1 - e);
        var op = p / FLOAT_FADE;                            // 앞 구간에서 페이드인 완료
        if (op > 1) op = 1;
        f.el.style.transform = off > 0.1 ? 'translateY(' + off + 'px)' : '';
        f.el.style.opacity = op < 1 ? op : '';
      }
    }

    // 가치 섹션 스텝: 핀은 네이티브 sticky가 담당, JS는 클래스 토글만
    if (track && values) {
      var tt = y - track.offsetTop;             // 트랙 진입 후 스크롤량 (실제 px)
      var PD = PIN_DIST * sf;
      var step = tt < 0 ? 0 : (tt >= PD ? 3 : 1 + Math.min(2, Math.floor(tt / (PD / 3))));
      values.classList.toggle('s1', step === 1);
      values.classList.toggle('s2', step === 2);
      values.classList.toggle('s3', step === 3);
    }

    // 히어로 화살표: 스크롤 시작(0)부터 서서히 페이드 → 영상 풀스크린 시점에 소멸
    // (인트로 재생 중에는 CSS 페이드인이 담당하므로 건드리지 않음)
    if (arrow && introDone) {
      arrow.style.opacity = Math.max(0, 1 - y / D);
    }

    // 헤더 (방향 기반): 최상단 = 항상 보임 / 내리는 중 = 숨김 / 올리면 = 등장
    if (header && introDone) {
      if (y < 10) {
        header.classList.remove('hidden');
      } else if (y > lastY + 2) {
        header.classList.add('hidden');
      } else if (y < lastY - 2) {
        header.classList.remove('hidden');
      }
    }
    lastY = y;
  }

  // FEATURED PROJECTS 아코디언 — 여러 개를 동시에 열 수 있다.
  // 펼치는 0.4초 동안 무대 높이가 계속 변하므로, 전환이 끝날 때까지
  // 매 프레임 클램프 높이를 다시 맞춘다 (안 하면 늘어난 부분이 잘림).
  function initAccordion() {
    var rows = document.querySelectorAll('.more-row');
    if (!rows.length) return;

    function followHeight() {
      var until = Date.now() + 500;          // 전환 0.4s + 여유
      (function step() {
        syncHeights();
        if (Date.now() < until) {
          requestAnimationFrame(step);
        } else {
          measureFloats();                    // 아래 요소들의 문서 위치가 바뀌었으므로 재측정
          onScroll();
        }
      })();
    }

    for (var i = 0; i < rows.length; i++) {
      rows[i].addEventListener('click', function () {
        var item = this.closest('.more-item');
        if (!item) return;
        var open = item.classList.toggle('is-open');
        this.setAttribute('aria-expanded', open ? 'true' : 'false');
        followHeight();
      });
    }
  }

  // 리스트 호버 미리보기 — 실제 클론 사이트를 iframe 으로 띄운다.
  // iframe 은 그 행에 처음 올렸을 때만 만들고 이후 재사용 (매번 새로 불러오지 않도록).
  function initPreview() {
    var host = document.getElementById('morePreview');
    if (!host) return;
    // 터치 기기에는 호버가 없으므로 만들지 않는다
    if (!window.matchMedia('(hover: hover)').matches) return;

    var rows = document.querySelectorAll('.more-row[data-preview]');
    var frames = {};
    var current = null;

    function place(e) {
      var pad = 20;
      var w = host.offsetWidth, h = host.offsetHeight;
      var x = e.clientX + pad;
      var y = e.clientY - h / 2;
      if (x + w > window.innerWidth - pad) x = e.clientX - w - pad;   // 오른쪽이 좁으면 왼쪽에
      if (y < pad) y = pad;
      if (y + h > window.innerHeight - pad) y = window.innerHeight - h - pad;
      host.style.left = x + 'px';
      host.style.top = y + 'px';
    }

    for (var i = 0; i < rows.length; i++) {
      (function (row) {
        var url = row.getAttribute('data-preview');

        row.addEventListener('mouseenter', function (e) {
          if (!frames[url]) {
            var f = document.createElement('iframe');
            f.setAttribute('loading', 'lazy');
            f.setAttribute('tabindex', '-1');
            f.setAttribute('aria-hidden', 'true');
            f.src = url;
            host.appendChild(f);
            frames[url] = f;
          }
          if (current && current !== frames[url]) current.classList.remove('is-active');
          current = frames[url];
          current.classList.add('is-active');
          place(e);
          host.classList.add('is-on');
        });

        row.addEventListener('mousemove', place);
        row.addEventListener('mouseleave', function () {
          host.classList.remove('is-on');
        });
      })(rows[i]);
    }
  }

  // 최초 진입 인트로 (1회만, 반복 없음).
  // 타임라인은 CSS(.intro-play)가, 3D 확대는 hero3d.js가 각각 담당한다.
  function startVideo() {
    var v = video && video.querySelector('video');
    if (v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  }

  // 기본 loop은 마지막 프레임에서 첫 프레임으로 즉시 점프한다.
  // 히어로 영상만 끝에서 사라졌다가 첫 프레임부터 다시 나타나도록 직접 반복한다.
  function setupFadedVideoLoop() {
    var v = video && video.querySelector('video');
    if (!v) return;

    v.removeAttribute('loop');
    v.addEventListener('ended', function () {
      if (reduceMotion) {
        v.currentTime = 0;
        startVideo();
        return;
      }

      video.classList.add('is-loop-fading');
      setTimeout(function () {
        v.currentTime = 0;
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
        // ⚠️ requestAnimationFrame 으로 미루면 안 된다 — 페이드 도중 탭을 옮기면
        //    rAF 가 멈춰 클래스가 영영 안 지워지고 영상이 투명한 채로 남는다.
        //    되감기 직후 바로 지워도 첫 프레임은 이미 그려져 있다.
        video.classList.remove('is-loop-fading');
      }, 620);
    });
  }

  setupFadedVideoLoop();

  function playIntro() {
    if (reduceMotion) {
      root.classList.add('intro-play');
      introDone = true;
      startVideo();
      onScroll();
      return;
    }
    requestAnimationFrame(function () {
      root.classList.add('intro-play');
      // 영상은 MAKE & 와 함께 올라오는 순간부터 재생 (CSS --delay 와 같은 값)
      setTimeout(startVideo, 1000);
      // 마지막 줄(1.3s 시작 + 0.9s)이 끝난 뒤 스크롤 로직에 제어권을 넘김
      setTimeout(function () { introDone = true; onScroll(); }, 2300);
    });
  }

  // 동기 처리 (rAF로 미루면 보정이 한 프레임 늦어 들썩임)
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', fit);
  window.addEventListener('load', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  fit();

  // --- 같은 페이지 앵커 이동 ---
  // CSS scroll-margin-top 을 쓸 수 없다: 목적지가 scale(--sf) 된 무대 안에 있어서
  // 여백이 배율만큼 같이 줄어드는데, 헤더는 그와 무관한 실제 px 라 양이 안 맞는다.
  // → 헤더 높이를 실측해 직접 계산한다.
  function anchorOffset() {
    return (header ? header.getBoundingClientRect().height : 0) + 24;   // 헤더 + 최소 여유
  }
  function scrollToTarget(el, smooth) {
    var y = (window.scrollY || window.pageYOffset)
          + el.getBoundingClientRect().top - anchorOffset();
    window.scrollTo({ top: y < 0 ? 0 : y, behavior: (smooth && !reduceMotion) ? 'smooth' : 'auto' });
  }

  // 어바웃 목차처럼 문서 안을 가리키는 링크 (href="#" 단독은 제외)
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var hash = a.getAttribute('href');
    if (!hash || hash === '#') return;
    var target;
    try { target = document.querySelector(hash); } catch (err) { return; }
    if (!target) return;
    e.preventDefault();
    scrollToTarget(target, true);
    if (history.replaceState) history.replaceState(null, '', hash);
  });

  // 다른 페이지에서 about.html#timeline 처럼 들어온 경우.
  // 브라우저의 앵커 점프는 클램프 높이가 정해지기 전에 일어나 엉뚱한 곳에 서므로,
  // 높이가 확정된 뒤(load) 한 번 더 목적지로 맞춰 준다.
  if (location.hash) {
    window.addEventListener('load', function () {
      var target;
      try { target = document.querySelector(location.hash); } catch (e) { return; }
      if (target) scrollToTarget(target, false);
    });
  }

  initAccordion();
  initPreview();
  playIntro();
})();

// HOW I WORK 카드: 버튼으로만 넘긴다 (가로 스크롤 강제 없음). 끝에서 순환.
(function () {
  var sec = document.querySelector('.story');
  if (!sec) return;
  var slides = sec.querySelectorAll('.story-slide');
  var now = document.getElementById('storyNow');
  var total = document.getElementById('storyTotal');
  var prev = document.getElementById('storyPrev');
  var next = document.getElementById('storyNext');
  if (!slides.length) return;

  var idx = 0;
  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function show(n) {
    idx = (n + slides.length) % slides.length;
    for (var i = 0; i < slides.length; i++) {
      slides[i].classList.toggle('is-active', i === idx);
    }
    if (now) now.textContent = pad(idx + 1);
  }

  if (total) total.textContent = pad(slides.length);
  if (prev) prev.addEventListener('click', function () { show(idx - 1); });
  if (next) next.addEventListener('click', function () { show(idx + 1); });
  show(0);
})();

// Contact 버튼: 메일 작성창은 href(mailto)가 열고, 동시에 주소를 클립보드에 복사.
// (메일 앱이 없는 환경에서도 주소를 얻을 수 있게 하는 안전장치)
(function () {
  var btn = document.querySelector('[data-copy]');
  if (!btn) return;

  var toast = document.createElement('div');
  toast.className = 'copy-toast';
  document.body.appendChild(toast);
  var timer;

  function show(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(function () { toast.classList.remove('show'); }, 2000);
  }

  btn.addEventListener('click', function () {
    var addr = btn.getAttribute('data-copy');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(addr).then(
        function () { show('이메일 주소가 복사되었습니다 — ' + addr); },
        function () { show(addr); }
      );
    } else {
      show(addr);
    }
  });
})();

// AI 챗봇 위젯: 자리만 (API 연동은 이후 단계)
// 맨 위로 (모션 최소화 설정이면 즉시 이동)
var fabTop = document.getElementById('fabTop');
if (fabTop) {
  fabTop.addEventListener('click', function () {
    var smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
  });
}

// 챗봇 버튼(#fabChat) 동작은 js/chat.js 가 담당한다.

// Works 카드: 첫 진입에만 아래에서 부드럽게 나타난다.
// 다시 위아래로 스크롤해도 반복 재생하지 않는다.
(function () {
  var cards = document.querySelectorAll('.works-grid .work-card');
  if (!cards.length) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in window)) return;

  for (var i = 0; i < cards.length; i++) {
    cards[i].classList.add('is-reveal-pending');
    cards[i].style.setProperty('--reveal-delay', (i % 2) * 120 + 'ms');
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.2,
    rootMargin: '0px 0px -28% 0px'
  });

  cards.forEach(function (card) { observer.observe(card); });
})();

// About 취미 사진: 파일이 아직 없으면 그 자리를 통째로 지운다.
// 사진 3장을 한 번에 준비하기 어려워 마크업을 미리 넣어 뒀는데,
// 파일이 없는 채로는 빈 회색 박스가 보이면 안 되기 때문.
// → images/about-*.webp 를 넣는 즉시 아무 수정 없이 사진이 켜진다.
(function () {
  var figs = document.querySelectorAll('.hobby-media');
  for (var i = 0; i < figs.length; i++) {
    (function (fig) {
      var img = fig.querySelector('img');
      if (!img) return;
      function drop() { if (fig.parentNode) fig.parentNode.removeChild(fig); }
      // 스크립트가 늦게 실행돼 error 이벤트를 이미 놓친 경우까지 잡는다
      if (img.complete && img.naturalWidth === 0) drop();
      else img.addEventListener('error', drop);
    })(figs[i]);
  }
})();

// InApp — 카드뉴스 에디터를 새 탭이 아니라 모달로 연다 (2026-08-06).
// 마크업을 JS 가 만든다: 6개 페이지에 같은 HTML 을 넣지 않아도 되고, 한 곳만 고치면 된다.
// 버튼은 <a href> 그대로 두어, JS 가 죽으면 원래대로 새 탭으로 열린다 (안전한 실패).
// ⚠️ 이 블록은 파일 맨 끝에 있다. 지우거나 덮어쓰면 InApp 이 다시 새 탭으로 열린다.
(function () {
  var btn = document.getElementById('fabApp');
  if (!btn) return;

  var url = btn.getAttribute('href');
  var modal = null, frame = null, loader = null, lastFocus = null;

  function build() {
    modal = document.createElement('div');
    modal.className = 'appmodal';
    modal.hidden = true;
    modal.innerHTML =
      '<div class="appmodal-dim" data-close></div>' +
      '<div class="appmodal-box" role="dialog" aria-modal="true" aria-label="카드뉴스 에디터">' +
        '<div class="appmodal-head">' +
          '<span class="appmodal-title">Card News Editor</span>' +
          '<a class="appmodal-out" target="_blank" rel="noopener noreferrer">새 탭에서 열기 ↗</a>' +
          '<button class="appmodal-close" type="button" data-close aria-label="닫기">' +
            '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
            '<path d="M3 3 L13 13 M13 3 L3 13" stroke="currentColor" stroke-width="1.5"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="appmodal-body">' +
          '<div class="appmodal-load">에디터를 불러오는 중입니다…</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    modal.querySelector('.appmodal-out').href = url;
    loader = modal.querySelector('.appmodal-load');

    // 닫기: 배경 클릭 · X 버튼
    modal.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('[data-close]')) close();
    });
  }

  function open() {
    if (!modal) build();
    lastFocus = document.activeElement;

    // iframe 은 처음 열 때만 만든다 (다시 열 때 작업 내용이 날아가지 않도록)
    if (!frame) {
      frame = document.createElement('iframe');
      frame.title = '카드뉴스 에디터';
      frame.src = url;
      frame.addEventListener('load', function () { loader.classList.add('is-done'); });
      modal.querySelector('.appmodal-body').appendChild(frame);
    }

    modal.hidden = false;
    // 스크롤 잠금. window.innerWidth 는 스크롤바를 포함하므로 이 값이 변하지 않아
    // fit() 이 다시 돌아도 무대 배율이 튀지 않는다.
    document.documentElement.style.overflow = 'hidden';
    // hidden 해제 직후 같은 프레임에 클래스를 붙이면 전환이 생략된다.
    // ⚠️ requestAnimationFrame 으로 미루지 않는다 — 배경 탭 등에서 rAF 가 늦거나 안 돌면
    //    모달이 안 보이는 채로 스크롤만 잠기는 상태가 된다. 강제 리플로우가 확실하다.
    void modal.offsetWidth;
    modal.classList.add('is-open');

    btn.setAttribute('aria-expanded', 'true');
    modal.querySelector('.appmodal-close').focus();
    document.addEventListener('keydown', onKey);
  }

  function close() {
    if (!modal || modal.hidden) return;
    modal.classList.remove('is-open');
    document.documentElement.style.overflow = '';
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onKey);
    if (lastFocus && lastFocus.focus) lastFocus.focus();

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { modal.hidden = true; return; }
    setTimeout(function () { if (!modal.classList.contains('is-open')) modal.hidden = true; }, 320);
  }

  function onKey(e) { if (e.key === 'Escape') close(); }

  btn.setAttribute('aria-expanded', 'false');
  btn.addEventListener('click', function (e) {
    // 새 탭으로 열려는 의도(Ctrl/Cmd/Shift/휠클릭)는 그대로 존중한다
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    // 좁은 화면에서는 모달이 답답하므로 원래대로 새 탭
    if (window.innerWidth <= 900) return;
    e.preventDefault();
    open();
  });
})();
