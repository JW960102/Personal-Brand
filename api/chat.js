// Vercel 서버리스 함수 — Claude API 프록시.
// ⚠️ API 키(ANTHROPIC_API_KEY)는 이 서버 환경변수에서만 읽는다. 절대 프론트로 내려보내지 않음.
//    프론트(브라우저)는 이 /api/chat 엔드포인트만 호출한다.
// 배포: Vercel 환경변수에 ANTHROPIC_API_KEY 등록. 로컬 테스트는 `vercel dev`.
//    ※ Live Server(127.0.0.1:5500)로 열면 /api/chat 이 없어 404 — 챗봇만 동작하지 않는다.
// 구조는 W:RUN 프로젝트(ezen_teamproject_2/api/chat.ts)에서 가져와 포트폴리오용으로 옮김.
import { KNOWLEDGE } from './knowledge.js';

export const config = { runtime: 'edge' };

// 챗봇 페르소나 — 포트폴리오 방문자(주로 채용 담당자)를 응대한다.
const SYSTEM = `너는 UX/UI 디자이너 김종욱의 포트폴리오 사이트에 있는 AI 안내원이야.
방문자(주로 채용 담당자·면접관)에게 김종욱이 어떤 사람이고 무엇을 만들었는지 안내한다.

[김종욱 정보]
- 디자인만 하지 않고 직접 구현해 검증하는 UX/UI 디자이너. 기획 → 디자인 → 프론트엔드 구현 → 배포까지 소화한다.
- 대표 작업 3건: W:RUN(러닝 앱, 팀), ILKW web(일광전구 웹 리뉴얼, 팀), GOI(AI 일기 앱, 개인).
  각각의 상세는 아래 [프로젝트 상세]를 근거로만 답한다.
- 강점: 개발의 언어를 이해해 디자인과 개발 사이를 잇는 것. 보기 좋은 화면보다 헤매지 않는 화면을 먼저 만든다.

[말투·형식 규칙 — 반드시 지켜]
※ 이 대화는 채용 담당자와 면접관이 열람한다. 사적인 대화가 아니라 공식 안내문이라고 생각하고 답한다.
- 격식체(하십시오체)만 사용한다. 문장은 "~합니다", "~입니다"로 끝맺는다.
- "~해요", "~할게요", "~네요" 같은 구어체 종결어미를 쓰지 않는다.
- 감탄사, 이모지, 텍스트 이모티콘, 느낌표를 쓰지 않는다.
- 짧게. 보통 2~4문장, 핵심만. 더 물으면 그때 자세히 답한다.
- 마크다운 기호(#, *, **, -, > 등)로 꾸미지 않는다. 화면에 일반 텍스트로 그대로 노출되어 기호가 그대로 보인다. 목록이 필요하면 줄바꿈으로만 구분한다.
- 문단 사이는 빈 줄로 띄운다.
- 사실만 전달한다. 과장하거나 추측해서 말하지 않으며, 위 [김종욱 정보]에 없는 내용은 지어내지 않는다.
- 확인되지 않은 내용은 "해당 내용은 확인되지 않았습니다. 김종욱에게 직접 문의하시기 바랍니다."로 안내한다.
- 농담, 잡담, 역할극 요청에는 응하지 않고 한 문장으로 정중히 사양한 뒤 포트폴리오 안내로 돌아간다.
- 포트폴리오·김종욱과 무관한 요청은 한 문장으로 정중히 사양하고 원래 주제로 안내한다.
- 한국어로 답한다. 다만 질문이 영어이면 영어로 답하되 동일한 격식을 유지한다.`;

const env = globalThis.process?.env ?? {};

// 비용 폭주 방어 (포폴용 — 정상 대화는 넉넉히 허용, 남용만 차단).
const MAX_MESSAGES = 20;          // 최근 N개만 모델로 전달
const MAX_CHARS_PER_MESSAGE = 2000;
const MAX_TOKENS = 1024;
const MODEL = env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001';

// ── 레이트 리밋 (IP당 요청 수 제한) ─────────────
const RATE_LIMIT = 15;
const RATE_WINDOW_MS = 60_000;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
  }
  const rec = hits.get(ip);
  if (!rec || now > rec.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > RATE_LIMIT;
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (rateLimited(ip)) {
    return Response.json(
      { error: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.' },
      { status: 429 },
    );
  }

  let messages;
  try {
    ({ messages } = await req.json());
  } catch {
    return Response.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'messages required' }, { status: 400 });
  }

  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') {
      return Response.json({ error: 'invalid message format' }, { status: 400 });
    }
    if (m.content.length > MAX_CHARS_PER_MESSAGE) {
      return Response.json(
        { error: `메시지는 ${MAX_CHARS_PER_MESSAGE}자를 넘을 수 없어요.` },
        { status: 400 },
      );
    }
  }
  const trimmed = messages.slice(-MAX_MESSAGES);

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not set on server' }, { status: 500 });
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        // 시스템 프롬프트 + 프로젝트 지식은 매 요청 동일하므로 캐시에 태워 비용을 줄인다.
        // (최소 토큰 미달이면 무시될 뿐 오류가 나지는 않는다)
        system: [
          {
            type: 'text',
            text: SYSTEM + '\n\n' + KNOWLEDGE,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: trimmed,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return Response.json(
        { error: data.error?.message ?? 'Anthropic API request failed' },
        { status: res.status },
      );
    }

    const text = (data.content ?? [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');
    // model 을 함께 돌려줘 화면 상단에 실제 사용 중인 버전을 표시한다
    // (환경변수 ANTHROPIC_MODEL 로 바꿔도 표시가 자동으로 따라감)
    return Response.json({ text, model: MODEL });
  } catch (err) {
    return Response.json({ error: err?.message ?? 'unknown error' }, { status: 502 });
  }
}
