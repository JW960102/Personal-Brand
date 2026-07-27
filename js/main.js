/* ============================================
   퍼스널 브랜드 v2 — 인터랙션 (GSAP 기반)
   outpost가 쓴 GSAP + ScrollTrigger 계열 채택. WebGL은 미채택.
   ============================================ */

// JS 활성 표시 (CSS가 초기 은닉 상태를 잡도록)
document.documentElement.classList.add('js');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function initHero() {
  const hasGSAP = typeof window.gsap !== 'undefined';

  // GSAP 없거나 모션 최소화면: 은닉 해제만 하고 종료 (그대로 정지 표시)
  if (!hasGSAP || reduceMotion) {
    document.querySelectorAll('.hero-title .line-inner, .hero-scroll')
      .forEach((el) => { el.style.visibility = 'visible'; });
    return;
  }

  gsap.registerPlugin(...[window.ScrollTrigger].filter(Boolean));

  const lines = gsap.utils.toArray('.hero-title .line-inner');
  const header = document.querySelector('.site-header');
  const scroll = document.querySelector('.hero-scroll');

  // 초기 상태
  gsap.set(lines, { yPercent: 115, visibility: 'visible' });
  gsap.set(scroll, { autoAlpha: 0, y: 12 });
  gsap.set(header, { yPercent: -100, autoAlpha: 0 });

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  // 1) 헤더 드롭
  tl.to(header, { yPercent: 0, autoAlpha: 1, duration: 0.7 }, 0.1);

  // 2) 타이틀 3줄이 마스크 안에서 아래→위로 밀려 올라옴 (stagger)
  tl.to(lines, {
    yPercent: 0,
    duration: 1.0,
    stagger: 0.12,
    ease: 'power4.out',
  }, 0.2);

  // 3) 스크롤 인디케이터 페이드업
  tl.to(scroll, { autoAlpha: 1, y: 0, duration: 0.6 }, '-=0.4');

  // 스크롤 시 타이틀이 살짝 위로 밀리며 사라지는 패럴랙스 (outpost식 스크롤 반응)
  gsap.to('.hero-title', {
    yPercent: -18,
    autoAlpha: 0.35,
    ease: 'none',
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true,
    },
  });

  // 안전장치: 어떤 이유로든(rAF 정지 등) 등장이 시작 안 되면 4초 뒤 강제로 보이게
  // → 면접관 앞에서 빈 히어로가 뜨는 최악의 상황 방지
  setTimeout(() => {
    if (tl.progress() === 0) {
      gsap.set(lines, { yPercent: 0, visibility: 'visible', clearProps: 'transform' });
      gsap.set([scroll], { autoAlpha: 1, y: 0 });
      gsap.set(header, { yPercent: 0, autoAlpha: 1 });
    }
  }, 4000);
}

// GSAP 스크립트가 defer라 로드 완료 후 초기화
window.addEventListener('load', initHero);

// AI 챗봇 위젯: 자리만 (API 연동은 이후 단계)
const chatFab = document.getElementById('chatFab');
if (chatFab) {
  chatFab.addEventListener('click', () => {
    // TODO: 챗봇 패널 토글
  });
}
