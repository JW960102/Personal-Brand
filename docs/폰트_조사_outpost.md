# 폰트 조사 — 메인 레퍼런스 outpost.design

> 2026-07-27 조사. 강사님 피드백: "레퍼런스가 디자인이 심플해서 타이포를 정말 잘 해야 한다.
> 폰트 하나하나 똑같이(유료면 비슷한 폰트로) 해야 느낌이 산다."
> → outpost.design 실사용 폰트 전수 조사 + 무료 대체폰트 확정.

---

## outpost.design 실사용 폰트 (실측)

`@font-face` 선언은 4개지만 **실제 쓰이는 건 2종**뿐.

| 폰트 | 분류 | 유·무료 | 파운드리 | 사용처 | 굵기 |
|---|---|---|---|---|---|
| **Scto Grotesk A** | 그로테스크 산세리프 | 유료 | Schick Toikka | 히어로 헤드라인, 섹션 제목, 메뉴/네비, 버튼, 라벨 (거의 전부) | 400 / 500 |
| **Bradford LL** | 트랜지셔널 세리프 | 유료 | Lineto | 리드 문단(40px Light), 서비스 태그(14px, Sub 컷) | 300(Light) |
| BL Arctic | — | — | — | **선언만 있고 홈에서 미사용(0개)** — 무시 | 400 |

- `bradford-sub` = Bradford LL의 소형 텍스트용 서브컷(같은 폰트).

## 🔑 느낌의 핵심 = 폰트가 아니라 "세팅값"

폰트 자체는 평범한 그로테스크. 시그니처는 **극단적 타이트 자간 + 좁은 행간 + 전부 대문자**.

| 요소 | 폰트 | 크기 | 행간 | 자간 | 변형 | 굵기 |
|---|---|---|---|---|---|---|
| 히어로 H1 | Scto | 166.7px | 0.85 | **-0.075em** | UPPERCASE | 400 |
| 섹션 H2 | Scto | 66.7px | 0.825 | **-0.075em** | UPPERCASE | 400 |
| 소형 라벨 H3 | Scto | 13.3px | 0.9 | -0.05em | UPPERCASE | 500 |
| 리드 문단 | Bradford | 40px | 1.1 | -0.025em | none | 300 |
| 서비스 태그 | Bradford-sub | 14px | — | — | none | 400 |

→ **대형 텍스트일수록 자간을 -0.075em까지 조이는 게 핵심.** 안 하면 폰트가 같아도 느낌이 안 산다.

---

## 우리 프로젝트 확정 폰트 (2026-07-27)

둘 다 유료라 **무료·상업가능 대체폰트**로 매칭 + 한글은 Pretendard 유지 → **3역할 체계**.

| 역할 | 폰트 | 출처 | outpost 대응 | CSS 토큰 |
|---|---|---|---|---|
| 한글·본문·UI | **Pretendard** | jsdelivr | (한글용) | `--f-sans` |
| 영문 디스플레이/헤드라인·라벨·메뉴·로고 | **General Sans** | Fontshare (무료·상업가능) | Scto Grotesk A | `--f-display` |
| 에디토리얼 세리프/리드 문단·인용 | **Newsreader** | Google Fonts (무료) | Bradford LL | `--f-serif` |

- General Sans·Newsreader는 **한글 글리프 없음** → CSS fallback으로 Pretendard 지정.
- 자간 토큰: `--ls-hero: -0.075em` / `--ls-head: -0.05em` / `--ls-lead: -0.025em` (outpost 실측 이식).

### 로딩 (index.html)
```html
<!-- General Sans -->
<link href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600&display=swap" rel="stylesheet" />
<!-- Newsreader (옵티컬 사이즈 6..72, weight 300/400, italic 포함) -->
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;1,6..72,300;1,6..72,400&display=swap" rel="stylesheet" />
```

### 적용 현황 (style.css)
- `body` → `--f-sans` (Pretendard 기본)
- `.hero-title` → `--f-display` + `letter-spacing: var(--ls-hero)`
- `.logo` / `.menu` → `--f-display`, weight 500, `--ls-head` (기존 로고 italic DM Serif 폐기)
- `--f-serif`(Newsreader)는 토큰만 준비 — 리드 문단/About 섹션 만들 때 사용

## 폐기
- **DM Serif Display** (구 로고 폰트) — outpost엔 장식 세리프 로고가 없어 그로테스크로 대체.
