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
  var introSec = document.querySelector('.intro');
  var introRevealed = false;

  // 프로젝트 이미지·기여도 박스: 아래에 떠 있다가 자기 영역이 다 보이면 제자리로
  // (스크롤에 연동 — 위로 올리면 그대로 되돌아감)
  var FLOAT_OFFSET = 90;    // 띄우는 거리 (캔버스 px)
  var FLOAT_SETTLE = 0.30;  // 요소 상단이 화면 높이의 이 지점에 오면 제자리 (낮을수록 늦게 도착)
  var floats = [];          // { el, top(문서 기준 화면좌표), h }

  // --- 히어로 영상 박스 (1920 캔버스 px · MAKE & 오른쪽) ---
  var BOX = { x: 1226, y: 465, w: 264, h: 176 };
  var EXPAND = 900;     // 박스→풀스크린 확장 스크롤 거리 (캔버스 px)
  var HOLD = 600;       // 풀스크린 유지 구간 (캔버스 px)
  // --- 가치 섹션 ---
  var VALUES_H = 1094;  // .values 높이 (캔버스 px, CSS와 동일)
  var PIN_DIST = 3000;  // sticky 핀 동안 스크롤 거리 (캔버스 px, 스텝당 1000)

  var sf = 1;
  var lastY = 0;        // 헤더 방향 감지용 직전 스크롤 위치
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var introDone = false; // 인트로 재생 중에는 헤더·화살표를 스크롤 로직이 건드리지 않음

  // 1920 무대를 뷰포트 폭에 맞춰 스케일 (--sf).
  // transform은 레이아웃 높이를 안 줄이므로 클램프/트랙 높이를 실제 px로 보정.
  function fit() {
    sf = window.innerWidth / 1920;
    root.style.setProperty('--sf', sf);
    if (zone) zone.style.height = (EXPAND + HOLD) + 'px';
    if (clamp1 && stage1) clamp1.style.height = stage1.offsetHeight * sf + 'px';
    if (clamp2 && stage2) clamp2.style.height = stage2.offsetHeight * sf + 'px';
    if (sticky) sticky.style.height = VALUES_H * sf + 'px';
    if (track) track.style.height = (VALUES_H + PIN_DIST) * sf + 'px';
    measureFloats();   // 높이 확정 후 측정
    onScroll();
  }

  // 부유 대상의 문서상 위치를 미리 재둔다 (매 스크롤마다 레이아웃을 읽으면 버벅임).
  // transform이 걸린 상태로 재면 위치가 어긋나므로 전부 초기화한 뒤 한 번에 측정.
  function measureFloats() {
    var els = document.querySelectorAll('.proj > img, .proj > figure, .proj > .ph-meta');
    var i;
    for (i = 0; i < els.length; i++) els[i].style.transform = '';
    var y = window.scrollY || window.pageYOffset;
    floats = [];
    for (i = 0; i < els.length; i++) {
      var r = els[i].getBoundingClientRect();
      floats.push({ el: els[i], top: r.top + y, h: r.height });
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
      var bx = BOX.x * sf, by = BOX.y * sf, bw = BOX.w * sf, bh = BOX.h * sf;
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

    // 인트로 카피: 섹션이 화면에 1/3쯤 들어오면 한 번만 순차 등장 (되돌리지 않음)
    // getBoundingClientRect는 무대 스케일이 반영된 실제 화면 좌표라 --sf 보정이 불필요
    if (introSec && !introRevealed && introSec.getBoundingClientRect().top < vh * 0.67) {
      introSec.classList.add('reveal');
      introRevealed = true;
    }

    // 프로젝트 이미지·기여도 박스 부유:
    // 화면 아래에서 진입할 때 밀려 있다가, 상단이 화면 높이의 FLOAT_SETTLE 지점까지
    // 올라오면 제자리(0)에 안착. 이동 구간을 화면 기준으로 잡아 요소 크기와 무관하게
    // 같은 리듬으로 움직인다.
    if (!reduceMotion) {
      var range = vh * (1 - FLOAT_SETTLE);
      for (var fi = 0; fi < floats.length; fi++) {
        var f = floats[fi];
        var p = (vh - (f.top - y)) / range;          // 0=막 진입, 1=안착
        p = p < 0 ? 0 : (p > 1 ? 1 : p);
        // easeInOutCubic — 전반에 몰리지 않고 끝까지 고르게 따라 올라옴
        var e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        var off = FLOAT_OFFSET * (1 - e);
        f.el.style.transform = off > 0.1 ? 'translateY(' + off + 'px)' : '';
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

  // 최초 진입 인트로 (1회만, 반복 없음).
  // 타임라인은 CSS(.intro-play)가, 3D 확대는 hero3d.js가 각각 담당한다.
  function startVideo() {
    var v = video && video.querySelector('video');
    if (v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  }

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
      // 영상은 MAKE & 와 함께 올라오는 순간부터 재생
      setTimeout(startVideo, 2300);
      // 마지막 줄(2.6s 시작 + 0.9s)이 끝난 뒤 스크롤 로직에 제어권을 넘김
      setTimeout(function () { introDone = true; onScroll(); }, 3600);
    });
  }

  // 동기 처리 (rAF로 미루면 보정이 한 프레임 늦어 들썩임)
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', fit);
  window.addEventListener('load', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  fit();
  playIntro();
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
var chatFab = document.getElementById('chatFab');
if (chatFab) {
  chatFab.addEventListener('click', function () {
    // TODO: 챗봇 패널 토글
  });
}
