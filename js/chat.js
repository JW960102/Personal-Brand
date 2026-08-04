// AI 챗봇 — 프론트는 /api/chat 만 호출한다 (API 키는 서버에만 존재).
// 구조는 W:RUN 프로젝트(ezen_teamproject_2)의 chatClient 를 옮겨온 것.
// ⚠️ Live Server 로 열면 /api/chat 이 없어 404. 배포본이나 `vercel dev` 에서 동작한다.
(function () {
  var fab = document.getElementById('fabChat');
  var panel = document.getElementById('chatPanel');
  var closeBtn = document.getElementById('chatClose');
  var log = document.getElementById('chatLog');
  var form = document.getElementById('chatForm');
  var input = document.getElementById('chatInput');
  var chips = document.getElementById('chatChips');
  if (!fab || !panel || !log || !form || !input) return;

  // 서버(api/chat.js)의 기본 모델과 같은 값. 첫 응답이 오면 실제 모델로 갱신된다.
  var MODEL_FALLBACK = 'claude-haiku-4-5-20251001';
  var noteEl = null;

  // 모델 ID(claude-haiku-4-5-20251001)를 읽기 쉬운 이름(Claude Haiku 4.5)으로.
  function modelName(id) {
    var m = String(id || '').match(/^claude-([a-z]+)-(\d+)(?:-(\d+))?/);
    if (!m) return id || '';
    var family = m[1].charAt(0).toUpperCase() + m[1].slice(1);
    return 'Claude ' + family + ' ' + m[2] + (m[3] ? '.' + m[3] : '');
  }

  var history = [];      // [{ role, content }] — 서버로 보내는 대화 내역
  var busy = false;
  var greeted = false;

  // ---------- 화면 출력 ----------
  function addMessage(role, text) {
    var el = document.createElement('div');
    el.className = 'chat-msg chat-msg--' + role;
    el.textContent = text;               // 마크다운 미사용 — 그대로 텍스트로
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  // 말풍선이 아닌 안내 문구 (모델 버전 등)
  function addNote(text) {
    var el = document.createElement('p');
    el.className = 'chat-note';
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function versionNote(id) {
    return '현재 ' + modelName(id) + ' 버전을 사용 중입니다.';
  }

  function addTyping() {
    var el = document.createElement('div');
    el.className = 'chat-msg chat-msg--bot chat-typing';
    el.innerHTML = '<span></span><span></span><span></span>';
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  // ---------- 전송 ----------
  function send(text) {
    if (busy) return;
    var q = (text || '').trim();
    if (!q) return;

    if (chips) chips.hidden = true;      // 첫 질문 이후엔 유도 칩 숨김
    addMessage('user', q);
    history.push({ role: 'user', content: q });
    input.value = '';
    busy = true;

    var typing = addTyping();

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }),
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (!res.ok) throw new Error(data.error || '요청 실패 (' + res.status + ')');
          return data;
        });
      })
      .then(function (data) {
        typing.remove();
        var answer = data.text || '';
        addMessage('bot', answer);
        history.push({ role: 'assistant', content: answer });
        // 서버가 실제로 호출한 모델로 안내 문구를 정정 (환경변수로 바뀌어도 일치)
        if (noteEl && data.model) noteEl.textContent = versionNote(data.model);
      })
      .catch(function (err) {
        typing.remove();
        addMessage('error', err.message || '잠시 후 다시 시도해 주시기 바랍니다.');
        history.pop();                   // 실패한 턴은 내역에서 제거
      })
      .then(function () { busy = false; });
  }

  // ---------- 열기 / 닫기 ----------
  function open() {
    panel.hidden = false;
    // hidden 해제 직후 클래스를 붙여야 전환이 재생됨
    requestAnimationFrame(function () { panel.classList.add('is-open'); });
    fab.setAttribute('aria-expanded', 'true');
    if (!greeted) {
      greeted = true;
      addMessage('bot', '김종욱의 포트폴리오 안내를 담당하는 AI입니다.\n궁금한 점을 입력해 주시기 바랍니다.');
      noteEl = addNote(versionNote(MODEL_FALLBACK));
    }
    input.focus();
  }

  function close() {
    panel.classList.remove('is-open');
    fab.setAttribute('aria-expanded', 'false');
    setTimeout(function () { panel.hidden = true; }, 250);
    fab.focus();
  }

  fab.addEventListener('click', function () {
    if (panel.hidden) open(); else close();
  });
  if (closeBtn) closeBtn.addEventListener('click', close);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) close();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    send(input.value);
  });

  if (chips) {
    chips.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (btn) send(btn.textContent);
    });
  }
})();
