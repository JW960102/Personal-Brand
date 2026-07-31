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

  // --- 히어로 영상 박스 (1920 캔버스 px · MAKE & 오른쪽) ---
  var BOX = { x: 1226, y: 465, w: 264, h: 176 };
  var EXPAND = 900;     // 박스→풀스크린 확장 스크롤 거리 (캔버스 px)
  var HOLD = 600;       // 풀스크린 유지 구간 (캔버스 px)
  // --- 가치 섹션 ---
  var VALUES_H = 1094;  // .values 높이 (캔버스 px, CSS와 동일)
  var PIN_DIST = 3000;  // sticky 핀 동안 스크롤 거리 (캔버스 px, 스텝당 1000)

  var sf = 1;
  var lastY = 0;        // 헤더 방향 감지용 직전 스크롤 위치

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
    onScroll();
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

    // 가치 섹션 스텝: 핀은 네이티브 sticky가 담당, JS는 클래스 토글만
    if (track && values) {
      var tt = y - track.offsetTop;             // 트랙 진입 후 스크롤량 (실제 px)
      var PD = PIN_DIST * sf;
      var step = tt < 0 ? 0 : (tt >= PD ? 3 : 1 + Math.min(2, Math.floor(tt / (PD / 3))));
      values.classList.toggle('s1', step === 1);
      values.classList.toggle('s2', step === 2);
      values.classList.toggle('s3', step === 3);
    }

    // 헤더 (방향 기반):
    //  · 최상단 = 항상 보임 · 영상 풀스크린 = 무조건 숨김
    //  · 그 외 = 내리는 중 숨김 유지, 올리면 등장
    if (header) {
      var full = y >= D * 0.95 && y <= D + H;
      if (y < 10) {
        header.classList.remove('hidden');
      } else if (full) {
        header.classList.add('hidden');
      } else if (y > lastY + 2) {
        header.classList.add('hidden');
      } else if (y < lastY - 2) {
        header.classList.remove('hidden');
      }
      lastY = y;
    }
  }

  // 동기 처리 (rAF로 미루면 보정이 한 프레임 늦어 들썩임)
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', fit);
  window.addEventListener('load', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  fit();
})();

// AI 챗봇 위젯: 자리만 (API 연동은 이후 단계)
var chatFab = document.getElementById('chatFab');
if (chatFab) {
  chatFab.addEventListener('click', function () {
    // TODO: 챗봇 패널 토글
  });
}
