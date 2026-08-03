/* ============================================
   Hero 배경 3D 오브제 — "JW" 이니셜 (three.js)
   STEP 3 (B안): 유리 조형물 — 투과(transmission) 재질 + 색수차 후처리
   ─ 레퍼런스(outpost) 분석 결과 반영:
     · outpost는 GLB 유리 모델 + transmission/volume/ior + ChromaticAberration
     · 우리는 GLB 모델링 없이 three.js 표준으로 같은 원리를 구현
   ─ 부드러운 조형물 느낌: 글자를 두툼하게 + 큰 베벨로 획을 둥글려 sculptural화
   ─ 배경 흰색 불투명(=페이지색 #fff) → 유리가 흰 배경을 굴절, 후처리 깔끔
   ============================================ */

import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';

const canvas = document.getElementById('hero3d');

function initHero3D() {
  if (!canvas) return;

  let renderer;
  try {
    // alpha:false → 흰색 불투명 렌더. 유리가 굴절할 '흰 배경'을 만들고,
    // EffectComposer(후처리)가 알파 없이 깔끔히 동작하도록.
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  } catch (e) {
    console.warn('[hero3d] WebGL 사용 불가 — 3D 오브제 생략', e);
    return;
  }

  // 뷰포트 고정 레이어 — 화면 크기 기준으로 그린다 (스크롤과 무관하게 중앙 유지)
  const getSize = () => ({ w: window.innerWidth, h: window.innerHeight });
  let { w, h } = getSize();

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h, false);
  renderer.setClearColor(0xffffff, 1);          // 페이지색(#fff)과 동일 → 배경에 녹아듦
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
  camera.position.set(0, 0, 320);

  // 환경맵: 스튜디오 HDRI → 유리가 이 빛(창문 하이라이트)을 반사/굴절.
  // 흰 배경 위에서도 가장자리·굴곡에 하이라이트가 맺혀 은은하게 형태가 드러남.
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  new RGBELoader().load(
    'images/studio.hdr',
    (hdr) => {
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      const envMap = pmrem.fromEquirectangular(hdr).texture;
      scene.environment = envMap;
      hdr.dispose();
      pmrem.dispose();
    },
    undefined,
    (err) => console.warn('[hero3d] HDRI 로드 실패', err)
  );

  // 후처리 컴포저: 씬 렌더 → RGBShift(색수차, 유리 가장자리에만 무지개빛)
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  composer.setSize(w, h);
  composer.addPass(new RenderPass(scene, camera));
  const rgbShift = new ShaderPass(RGBShiftShader);
  rgbShift.uniforms.amount.value = 0.0016; // 아주 약하게 — 가장자리에만 살짝
  rgbShift.uniforms.angle.value = 0.6;
  composer.addPass(rgbShift);

  let mesh = null;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const fontUrl =
    'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json';
  new FontLoader().load(
    fontUrl,
    (font) => {
      // 두툼한 볼륨 + 큰 베벨 → 획 모서리가 둥글려져 '유리 조형물'처럼 부드러워짐
      const geo = new TextGeometry('JW', {
        font,
        size: 78,
        height: 4,         // 8 → 4 (2배 더 얇게). 굴절은 재질 thickness(24)가 담당
        depth: 4,
        curveSegments: 20,
        bevelEnabled: true,
        bevelThickness: 1,   // 얇은 두께에 맞춰 베벨도 절반으로
        bevelSize: 1,
        bevelSegments: 10,   // 곡면 매끄럽게
      });
      geo.center();

      // 유리(투과) 재질 — 뒤가 비치고 굴절/반사로 형태가 드러남 (저대비, 비거슬림)
      const mat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: 0.06,        // 매끈한 유리
        transmission: 1.0,      // 완전 투과 (유리)
        thickness: 10,          // 24 → 10: 굴절 왜곡 줄여 더 맑고 투명하게
        ior: 1.3,               // 1.5 → 1.3: 물에 가깝게, 왜곡 완화
        envMapIntensity: 0.8,   // 1.4 → 0.8: 반사 하이라이트 줄여 존재감 낮춤
        clearcoat: 1.0,         // 표면 코팅 광택
        clearcoatRoughness: 0.1,
        transparent: true,
      });

      mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);

      // 디버그 훅 (검증용)
      window.__hero3d = {
        meshCreated: true,
        geoBounds: (geo.computeBoundingBox(), geo.boundingBox),
        get rotationY() { return mesh.rotation.y; },
        matInfo: () => ({
          type: mat.type,
          transmission: mat.transmission,
          roughness: mat.roughness,
          ior: mat.ior,
          hasEnv: !!scene.environment,
        }),
        rendererInfo: () => renderer.info.render,
        forceRender: () => { composer.render(); return renderer.info.render; },
        sampleBrightness: () => {
          composer.render();
          const gl = renderer.getContext();
          const cw = gl.drawingBufferWidth, ch = gl.drawingBufferHeight;
          const px = new Uint8Array(4);
          gl.readPixels(Math.floor(cw / 2), Math.floor(ch / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
          return { r: px[0], g: px[1], b: px[2], a: px[3] };
        },
      };
    },
    undefined,
    (err) => console.warn('[hero3d] 폰트 로드 실패', err)
  );

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    if (mesh && !reduceMotion) {
      mesh.rotation.y += dt * 0.22; // 천천히 수평 회전
    }
    composer.render();
  }
  animate();

  window.addEventListener('resize', () => {
    ({ w, h } = getSize());
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
  });
}

window.addEventListener('load', initHero3D);
