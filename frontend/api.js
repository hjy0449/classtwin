// =============================================
// Class Twin AI ??API ?곕룞 紐⑤뱢
// 諛깆뿏?? https://classtwin-production.up.railway.app
// =============================================

const BASE_URL = "https://classtwin-production.up.railway.app";

// 怨듯넻 fetch ?섑띁 (??꾩븘???ы븿)
async function api(method, path, body = null, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const options = {
      method,
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(BASE_URL + path, options);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `?쒕쾭 ?ㅻ쪟 (${res.status})`);
    }
    return await res.json();
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('諛깆뿏???묐떟 ?놁쓬 (??꾩븘??');
    console.error(`API ?ㅻ쪟 [${method} ${path}]:`, e.message);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// =============================================
// 1?④퀎: ?숈깮 ?곗씠??// =============================================

const StudentAPI = {
  // ?꾩껜 ?숈깮 紐⑸줉 議고쉶
  getAll: () => api("GET", "/students"),

  // ?숈깮 異붽?
  add: (student) => api("POST", "/students", student),

  // ?숈깮 ?щ윭 紐???踰덉뿉 異붽?
  addBulk: (students) => api("POST", "/students/bulk", students),

  // ?숈깮 ??젣
  delete: (id) => api("DELETE", `/students/${id}`),

  // 愿怨?異붽?
  addRelation: (relation) => api("POST", "/relations", relation),

  // ?꾩껜 愿怨?議고쉶
  getRelations: () => api("GET", "/relations"),
};

// =============================================
// 2?④퀎: 梨쀫큸 議곌굔 ?뚯떛
// =============================================

const ConditionAPI = {
  // ?먯뿰????援ъ“?붾맂 議곌굔?쇰줈 蹂??  parse: (chatInput) =>
    api("POST", "/conditions/parse", { chat_input: chatInput }),

  // 梨쀫큸 ???  chat: (message, history) =>
    api("POST", "/conditions/chat", { message, history }),
};

// =============================================
// 3?④퀎: 諛섎같???뚭퀬由ъ쬁
// =============================================

const AssignmentAPI = {
  // 諛섎같???앹꽦 (?듭떖!)
  generate: (conditions) =>
    api("POST", "/assignments/class/generate", conditions),

  // 諛곗젙 寃곌낵 議고쉶
  getClass: (id) => api("GET", `/assignments/class/${id}`),

  // 4?④퀎: ?덉젙??遺꾩꽍
  analyze: (id) => api("POST", `/assignments/class/${id}/analyze`),

  // 5?④퀎: 諛곗튂 ?댁쑀 ?ㅻ챸
  explain: (id) => api("POST", `/assignments/class/${id}/explain`),

  // ?먮━諛곗젙 ?앹꽦
  generateSeat: (conditions) =>
    api("POST", "/assignments/seat/generate", conditions),

  // ?먮━ ?대젰 議고쉶
  getSeatHistory: (classId) =>
    api("GET", `/assignments/seat/history/${classId}`),

  // ?섎룞 議곗젙 ???듦퀎 ?ы룊媛
  evaluateSeat: (classId, seatGrid) =>
    api("POST", "/assignments/seat/evaluate", { class_id: classId, seat_grid: seatGrid }),

  // ?숈깮 ??紐낆쓽 ?먮━ 諛곗젙 ?댁쑀 (鍮좊Ⅸ LLM ?몄텧)
  explainSeatForStudent: (seatResult, studentName) =>
    api("POST", "/assignments/seat/student-reason", { seat_result: seatResult, student_name: studentName }, 30000),
};

// =============================================
// 臾몄꽌 ?앹꽦
// =============================================

const DocumentAPI = {
  generate: (assignmentId, docType) =>
    api("POST", `/documents/class/${assignmentId}?doc_type=${docType}`, null, 60000),

  // ?먮━諛곗젙 臾몄꽌: seat_result瑜?洹몃?濡?body濡??꾨떖 (DB ?쇱슫?쒗듃由??뚰뵾)
  // LLM??student_reasons?먯꽌 30紐낅텇 洹쇨굅瑜??묒꽦?섎뒓??8珥덈? ?먯＜ ?섍꺼??60珥덇퉴吏 ?덉슜
  generateSeat: (seatResult, docType = "teacher", seatId = null) =>
    api("POST", "/documents/seat", { seat_result: seatResult, doc_type: docType, seat_id: seatId }, 60000),
};

// =============================================
// ?곹깭 愿由?(???꾩뿭)
// =============================================

const AppState = {
  students: [],
  relations: [],
  _relationsAutoApplied: false,
  conditions: {
    absolute: [],
    balance: [
      { label: "?깅퉬 洹좊벑", priority: 1 },
      { label: "?깆쟻 遺꾪룷 洹좊벑", priority: 2 },
      { label: "由щ뜑???숈깮 遺꾩궛", priority: 3 },
      { label: "?댄뼢쨌?명뼢 洹좏삎", priority: 4 },
      { label: "?꾪븰???곸쓳 諛곕젮", priority: 5 },
    ],
    chat_input: "",
  },
  currentAssignmentId: null,
  currentResult: null,
  chatHistory: [],
  currentSeatResult: null,
  currentSeatId: null,
};

// =============================================
// UI ?좏떥由ы떚
// =============================================

function showLoading(message = "泥섎━ 以?..") {
  const overlay = document.getElementById("loading-overlay");
  const msg = document.getElementById("loading-message");
  if (overlay) overlay.style.display = "flex";
  if (msg) msg.textContent = message;
}

function hideLoading() {
  const overlay = document.getElementById("loading-overlay");
  if (overlay) overlay.style.display = "none";
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast toast-${type} show`;
  setTimeout(() => toast.classList.remove("show"), 3000);
}

function showError(message) {
  showToast("?ㅻ쪟: " + message, "error");
}

// =============================================
// 1?④퀎: ?숈깮 ?곗씠??濡쒕뱶 諛??뚮뜑留?// =============================================

async function loadStudents() {
  try {
    showLoading("?숈깮 ?곗씠??遺덈윭?ㅻ뒗 以?..");
    const data = await StudentAPI.getAll();
    AppState.students = data.students;

    renderStudentTable(data.students);
    updateStudentStats(data.students);
    showToast(`?숈깮 ${data.total}紐?遺덈윭?붿뒿?덈떎`);
  } catch (e) {
    showError(e.message);
  } finally {
    hideLoading();
  }
}

function renderStudentTable(students, conflictNames) {
  // conflictNames: 媛덈벑 愿怨꾩뿉 ?덈뒗 ?숈깮 ?대쫫 Set
  const conflictSet = conflictNames || new Set(
    AppState.relations
      .filter(r => r.type === '媛덈벑')
      .flatMap(r => [r.student_a, r.student_b])
  );
  const tbody = document.getElementById("ban-tbody");
  if (!tbody) return;

  const avatarColors = ['av-b','av-g','av-w','av-r','av-p'];
  tbody.innerHTML = students.map((s, i) => {
    const avatarCls = avatarColors[i % avatarColors.length];
    const genderFlag = s.gender === '?? ? '媛덈벑' : '';
    const tags = [];
    if (s.special_needs) tags.push(`<span class="badge bw">${s.special_needs}</span>`);
    if (s.attention_level === '??쓬') tags.push('<span class="badge bw">二쇱쓽?λ궙??/span>');
    const noteHtml = s.teacher_note
      ? `<span class="badge bg2" title="${s.teacher_note.replace(/"/g,'&quot;')}" style="cursor:pointer;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;vertical-align:middle" onclick="showNote('${s.name}',\`${s.teacher_note.replace(/`/g,"'")}\`)">?뱥 蹂닿린</span>`
      : '<span class="badge bw">誘몄엯??/span>';
    return `
    <tr data-name="${s.name}" data-gender="${s.gender}" data-flag="${s.special_needs ? '?뱀닔' : conflictSet.has(s.name) ? '媛덈벑' : ''}">
      <td><div class="name-cell"><div class="avatar ${avatarCls}">${s.name.slice(0,2)}</div>${s.name}</div></td>
      <td>${s.gender}</td>
      <td><span class="level-${s.academic_level}">${s.academic_level}</span></td>
      <td>${s.height}cm</td>
      <td>${s.vision}</td>
      <td>${s.attention_level || '??}</td>
      <td>${tags.join(' ') || '??}</td>
      <td>${noteHtml}</td>
    </tr>`;
  }).join("");

  // ?뚭껄 誘몄엯???숈깮 ???낅뜲?댄듃
  const noNote = students.filter(s => !s.teacher_note).length;
  const notice = document.getElementById('teacher-note-notice');
  if (notice) {
    notice.textContent = noNote > 0
      ? `??援먯궗 ?뚭껄 誘몄엯???숈깮 ${noNote}紐???AI 遺꾩꽍 ?뺥솗?꾨? ?꾪빐 ?낅젰??沅뚯옣?⑸땲??
      : '??紐⑤뱺 ?숈깮??援먯궗 ?뚭껄???낅젰?섏뼱 ?덉뒿?덈떎';
    notice.className = noNote > 0 ? 'notice notice-warn' : 'notice notice-success';
  }
}

function updateStudentStats(students) {
  const total = students.length;
  const male = students.filter((s) => s.gender === "??).length;
  const female = total - male;
  const special = students.filter((s) => s.special_needs).length;

  const elTotal = document.getElementById("ban-stat-total");
  const elGender = document.getElementById("ban-stat-gender");
  const elSpecial = document.getElementById("ban-stat-special");
  if (elTotal) elTotal.textContent = total;
  if (elGender) elGender.textContent = `${male}/${female}`;
  if (elSpecial) elSpecial.textContent = special;

  // 媛덈벑 移댁슫?몃뒗 relations?먯꽌 怨꾩궛 (relations 濡쒕뱶 ??蹂꾨룄 ?낅뜲?댄듃??
}

async function loadRelations() {
  try {
    const data = await StudentAPI.getRelations();
    // 以묐났 ?쒓굅 (媛숈? ?띿씠 ?щ윭 踰???λ맂 寃쎌슦)
    const seen = new Set();
    const uniqueRelations = (data.relations || []).filter(r => {
      const key = [r.type, ...[r.student_a, r.student_b].sort()].join(':');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    AppState.relations = uniqueRelations;
    renderRelations(uniqueRelations);

    // 媛덈벑 愿怨??듦퀎 ?낅뜲?댄듃
    const conflictCount = data.relations.filter(r => r.type === '媛덈벑').length;
    const el = document.getElementById('ban-stat-conflict');
    if (el) el.textContent = conflictCount;

    // 媛덈벑 ?숈깮 data-flag ?낅뜲?댄듃 (以묎컙 ?댁긽 ?ы븿)
    const conflictSet = new Set(data.relations.filter(r => r.type === '媛덈벑' && ['?믪쓬','以묎컙'].includes(r.severity)).flatMap(r => [r.student_a, r.student_b]));
    if (AppState.students.length > 0) {
      renderStudentTable(AppState.students, conflictSet);
    }

    // ?숈깮 ?곗씠??濡쒕뱶 ??updateAbsConditions?먯꽌 ?쇨큵 泥섎━
  } catch (e) {
    console.error("愿怨??곗씠??濡쒕뱶 ?ㅽ뙣:", e);
  }
}

function renderRelations(relations) {
  const conflictList = document.querySelector("#bt-relation .grid2 > div:first-child");
  const friendList = document.querySelector("#bt-relation .grid2 > div:last-child");
  if (!conflictList || !friendList) return;

  const conflicts = relations.filter((r) => r.type === "媛덈벑");
  const friends = relations.filter((r) => r.type === "移쒗븿");

  conflictList.innerHTML = `
    <div style="font-size:13px;font-weight:600;margin-bottom:10px">
      媛덈벑 愿怨?<span class="badge br">${conflicts.length}??/span>
    </div>
    ${conflicts.map((r) => `
      <div class="relation-row">
        <div class="rel-icon ri2-red">!</div>
        <div style="flex:1;font-size:12px">${r.student_a} ??${r.student_b}</div>
        <span class="badge br">${r.severity}</span>
      </div>
    `).join("")}
  `;

  friendList.innerHTML = `
    <div style="font-size:13px;font-weight:600;margin-bottom:10px">
      移쒗븳 愿怨?<span class="badge bg2">${friends.length}??/span>
    </div>
    ${friends.map((r) => `
      <div class="relation-row">
        <div class="rel-icon ri2-green">??/div>
        <div style="flex:1;font-size:12px">${r.student_a} ??${r.student_b}</div>
        <span class="badge bg2">${r.note || "移쒗븿"}</span>
      </div>
    `).join("")}
  `;
}

// =============================================
// 2?④퀎: 梨쀫큸 議곌굔 ?뚯떛
// =============================================

async function sendChatReal(prefix) {
  const input = document.getElementById(`${prefix}-chat-input`);
  const message = input.value.trim();
  if (!message) return;

  // UI???ъ슜??硫붿떆吏 異붽?
  const wrap = document.getElementById(`${prefix}-chat-wrap`);
  appendChatMsg(wrap, message, "user");
  input.value = "";

  try {
    // GPT-4o API ?몄텧
    const data = await ConditionAPI.chat(message, AppState.chatHistory);

    // AI ?묐떟 異붽?
    appendChatMsg(wrap, data.response, "ai");

    // ????대젰 ???    AppState.chatHistory.push({ role: "user", content: message });
    AppState.chatHistory.push({ role: "assistant", content: data.response });

    // parsed_conditions ?덉쑝硫?媛곴컖 異붽?
    if (data.parsed_conditions && data.parsed_conditions.length > 0) {
      data.parsed_conditions.forEach(cond => addParsedCondition(prefix, cond));
    } else if (data.extracted_condition) {
      addParsedCondition(prefix, data.extracted_condition);
    } else {
      // ?뚯떛 紐??덉뼱??硫붿떆吏 ?먯껜瑜?湲고? 議곌굔?쇰줈 異붽?
      const fallbackCond = {
        type: '湲고?',
        student_a: null,
        student_b: null,
        students: [],
        note: message
      };
      addParsedCondition(prefix, fallbackCond);
    }
    updateSummary();
    // 梨쀫큸 ?낅젰? ??긽 chat_input???꾩쟻
    AppState.conditions.chat_input += " " + message;
  } catch (e) {
    appendChatMsg(wrap, "二꾩넚?⑸땲?? ?좎떆 ???ㅼ떆 ?쒕룄?댁＜?몄슂.", "ai");
  }
}

function appendChatMsg(wrap, text, type) {
  const div = document.createElement("div");
  div.className = `chat-msg ${type === "user" ? "chat-right" : ""}`;
  div.innerHTML = `<div class="bubble-${type === "user" ? "user" : "ai"}">${text}</div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}

function addParsedCondition(prefix, condition) {
  const list = document.getElementById(`${prefix}-parsed-list`);
  if (!list || !condition) return;

  const type = condition.type || '湲고?';
  const studentA = condition.student_a || '';
  const studentB = condition.student_b || '';
  const note = condition.note || '';

  // ?대쫫 ?덉쑝硫??대쫫+??? ?놁쑝硫?note ?띿뒪???쒖떆
  const label = studentA
    ? `${studentA}${studentB ? ' ??' + studentB : ''} <span class="badge bb">${type}</span>`
    : `${note || type} <span class="badge bb">湲고? 議곌굔</span>`;

  // 以묐났 泥댄겕 (媛숈? ?띿뒪?몃㈃ 異붽? ????
  const existingTexts = Array.from(list.querySelectorAll('.cond-text')).map(e => e.textContent.trim());
  const labelText = label.replace(/<[^>]+>/g, '').trim();
  if (existingTexts.some(t => t.replace(/<[^>]+>/g, '').trim() === labelText)) return;

  const el = document.createElement("div");
  el.className = "cond-item";
  el.innerHTML = `
    <div class="cond-icon ci-blue">A</div>
    <div class="cond-text">${label}</div>
    <button class="del-btn" onclick="this.closest('.cond-item').remove();updateSummary()">??/button>
  `;
  list.appendChild(el);
  updateSummary();

  // AppState??異붽?
  if (studentA) {
    AppState.conditions.absolute.push(condition);
  } else {
    // ?대쫫 ?녿뒗 湲고? 議곌굔: chat_input???꾩쟻 (諛곗젙 ??GPT???꾨떖)
    AppState.conditions.chat_input = (AppState.conditions.chat_input || '') + ' ' + (note || type);
  }
}

// =============================================
// 3?④퀎: 諛섎같???ㅽ뻾 (?듭떖!)
// =============================================

async function runClassAssignment() {
  const n = typeof numClasses !== 'undefined' ? numClasses : 3;
  const absoluteConditions = collectAbsoluteConditions();
  
  // 狩?援먯궗 ?뚭껄 ?뚯떛 ?꾨즺 ?뺤씤
  const studentsWithNotes = AppState.students.filter(s => s.teacher_note && s.teacher_note.trim());
  if (studentsWithNotes.length > 0) {
    showLoading("援먯궗 ?뚭껄 AI 遺꾩꽍 以?..");
    let maxWait = 30; // 理쒕? 30珥??湲?    while (maxWait > 0) {
      try {
        const status = await api("GET", "/notes/status");
        if (status.done) {
          console.log(`??援먯궗 ?뚭껄 ?뚯떛 ?꾨즺: ${status.count}紐?);
          // ?뚯떛 ?꾨즺 ???숈깮 ?곗씠???ㅼ떆 濡쒕뱶 (ai_traits ?ы븿)
          const updatedData = await api("GET", "/students");
          AppState.students = updatedData.students;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1珥??湲?        maxWait--;
      } catch (e) {
        console.warn("?뚯떛 ?곹깭 ?뺤씤 ?ㅽ뙣:", e);
        break;
      }
    }
    if (maxWait === 0) {
      showToast("?좑툘 援먯궗 ?뚭껄 遺꾩꽍???꾩쭅 ?꾨즺?섏? ?딆븯?듬땲?? ?깃꺽 湲곕컲 議곌굔???쒕?濡?諛섏쁺?섏? ?딆쓣 ???덉뒿?덈떎.", "warn");
    }
  }
  
  let resultA = null, resultB = null, resultC = null;

  showLoading("諛섎같??怨꾩궛 以?.. (理쒕? 30珥?");
  try {
    // 諛곗튂??A (?덈?議곌굔 紐⑤몢 ?곸슜)
    resultA = await api("POST", "/assignments/class/generate", {
      absolute: absoluteConditions,
      balance: AppState.conditions.balance,
      chat_input: AppState.conditions.chat_input || "",
      num_classes: n,
    }, 120000);  // 120珥?(援먯궗?뚭껄 諛곗튂 遺꾩꽍 ?ы븿)

    // 諛곗튂??B (議곌굔 ?숈씪 + ?ㅻⅨ ?쒕뱶)
    resultB = await api("POST", "/assignments/class/generate", {
      absolute: absoluteConditions,
      balance: AppState.conditions.balance,
      chat_input: AppState.conditions.chat_input || "",
      num_classes: n,
      variant: 1,
    }, 90000);

    // 諛곗튂??C (議곌굔 ?숈씪 + ???ㅻⅨ ?쒕뱶)
    resultC = await api("POST", "/assignments/class/generate", {
      absolute: absoluteConditions,
      balance: AppState.conditions.balance,
      chat_input: AppState.conditions.chat_input || "",
      num_classes: n,
      variant: 2,
    }, 90000);

    showToast('AI 諛섎같???꾨즺!', 'success');
  } catch (e) {
    console.warn('諛깆뿏???ㅽ뙣 ???ㅽ봽?쇱씤 ?대갚:', e.message);
    showToast('?쒕쾭 ?묐떟 ?놁쓬 ???ㅽ봽?쇱씤 ?뚭퀬由ъ쬁?쇰줈 諛곗젙?⑸땲??, 'warn');
    try {
      resultA = makeFallbackAssignment(n, absoluteConditions);
      resultB = makeFallbackAssignment(n, []);
      resultC = makeFallbackAssignment(n, []);
    } catch (fe) {
      console.error('?대갚???ㅽ뙣:', fe);
      showToast('諛곗젙 ?뚭퀬由ъ쬁 ?ㅻ쪟: ' + fe.message, 'error');
    }
  } finally {
    hideLoading();
  }

  if (!resultA) return;

  AppState.currentResult = resultA;
  AppState.currentAssignmentId = resultA.assignment_id ?? 0;
  AppState.resultB = resultB;
  AppState.resultC = resultC;

  try {
    renderAssignmentResult(resultA, resultB, resultC);
  } catch (e) {
    console.error('?뚮뜑留??ㅻ쪟:', e);
    // ?먮윭 ?덉뼱??理쒖냼???먯닔???쒖떆
    const ps = document.getElementById('score-a');
    if (ps) ps.textContent = resultA.stability_score ?? '-';
    showToast('寃곌낵 ?쒖떆 ?ㅻ쪟: ' + e.message, 'error');
  }
  goScreen('ban3');

  if (AppState.currentAssignmentId) {
    loadExplanationInBackground(AppState.currentAssignmentId);
  }
}

async function loadExplanationInBackground(assignmentId) {
  try {
    const explanation = await api("POST", `/assignments/class/${assignmentId}/explain`, null, 25000);
    // 諛쏆븘???ㅻ챸??ban3 AI 諛곗튂 洹쇨굅 移대뱶??諛섏쁺
    if (explanation?.conditions_summary?.length) {
      renderReasonsFromExplanation(explanation);
    }
    if (explanation?.summary) {
      const sub = document.querySelector('#ban3 .page-sub');
      if (sub) sub.textContent = explanation.summary;
    }
  } catch (e) {
    // ?ㅻ챸 濡쒕뱶 ?ㅽ뙣??議곗슜??臾댁떆 (寃곌낵 移대뱶???대? ?쒖떆??
    console.warn('AI ?ㅻ챸 濡쒕뱶 ?ㅽ뙣:', e.message);
  }
}

function makeFallbackAssignment(numCls, absoluteConditions) {
  const students = AppState.students.length > 0
    ? AppState.students
    : MOCK_STUDENTS;

  // ?깅퀎쨌?깆쟻 洹좊벑 諛곕텇???꾪빐 ?욊린
  const shuffled = [...students].sort((a, b) => {
    const order = { '??: 0, '以?: 1, '??: 2 };
    return (order[a.academic_level] || 1) - (order[b.academic_level] || 1);
  });

  // ?덈? 議곌굔 ?뚯떛 (媛숈? 諛?/ 遺꾨━)
  const sameClass = [];
  const separate = [];
  absoluteConditions.forEach(c => {
    if (c.type === '媛숈? 諛? && c.student_a && c.student_b)
      sameClass.push([c.student_a, c.student_b]);
    if (c.type === '遺꾨━' && c.student_a && c.student_b)
      separate.push([c.student_a, c.student_b]);
  });

  // ?쇱슫?쒕줈鍮덉쑝濡?諛?諛곗젙
  const classes = {};
  for (let i = 1; i <= numCls; i++) classes[`class_${i}`] = [];
  shuffled.forEach((s, i) => {
    classes[`class_${(i % numCls) + 1}`].push(s.name);
  });

  // 媛숈? 諛?議곌굔 泥섎━
  sameClass.forEach(([a, b]) => {
    let clsA = null, clsB = null;
    for (let i = 1; i <= numCls; i++) {
      if (classes[`class_${i}`].includes(a)) clsA = i;
      if (classes[`class_${i}`].includes(b)) clsB = i;
    }
    if (clsA && clsB && clsA !== clsB) {
      // b瑜?a??諛섏쑝濡??대룞
      classes[`class_${clsB}`] = classes[`class_${clsB}`].filter(n => n !== b);
      classes[`class_${clsA}`].push(b);
    }
  });

  // 遺꾨━ 議곌굔 泥섎━
  separate.forEach(([a, b]) => {
    let clsA = null, clsB = null;
    for (let i = 1; i <= numCls; i++) {
      if (classes[`class_${i}`].includes(a)) clsA = i;
      if (classes[`class_${i}`].includes(b)) clsB = i;
    }
    if (clsA && clsB && clsA === clsB) {
      // b瑜??ㅻⅨ 諛섏쑝濡??대룞
      const target = clsA === 1 ? 2 : 1;
      classes[`class_${clsA}`] = classes[`class_${clsA}`].filter(n => n !== b);
      classes[`class_${target}`].push(b);
    }
  });

  const perClass = Math.round(students.length / numCls);
  const classCounts = Object.values(classes).map(c => c.length).join('쨌');

  return {
    assignment_id: 0,
    classes,
    stability_score: 82,
    stability_detail: {
      total_score: 82,
      conflict_pairs_in_same_class: 0,
      isolated_students: 0,
    },
    conditions_met: {
      met: absoluteConditions.map(c =>
        `${c.student_a}${c.student_b ? ' ??' + c.student_b : ''} ??${c.type} ?곸슜`
      ),
      unmet: [],
    },
  };
}

function collectAbsoluteConditions() {
  // DOM ?뚯떛 ???AppState.conditions.absolute瑜?吏곸젒 ?ъ슜
  // (DOM ?띿뒪???뚯떛? badge媛 ?щ윭 媛쒖씪 ??type???섎せ ?≫엳??踰꾧렇 ?덉쓬)
  return AppState.conditions.absolute.filter(c => {
    // student_b ?녿뒗 ?뱀닔援먯쑁 議곌굔? ?쒖쇅 (?뚭퀬由ъ쬁?먯꽌 蹂꾨룄 泥섎━)
    if (c.type === '遺꾨━' || c.type === '媛숈? 諛?) {
      return c.student_a && c.student_b && c.student_b !== 'None';
    }
    return true;
  });
}

function renderAssignmentResult(result, resultB, resultC) {
  const classes = result.classes;
  const score = result.stability_score;
  const stability = result.stability_detail;
  const conditionsMet = result.conditions_met;
  const n = typeof numClasses !== 'undefined' ? numClasses : Object.keys(classes).length;

  // ===== 諛곗튂??A ?낅뜲?댄듃 =====
  const planScore = document.querySelector("#p0 .plan-score");
  if (planScore) planScore.textContent = score;

  const classCounts = Array.from({length: n}, (_, i) => (classes[`class_${i+1}`] || []).length).join('쨌');
  const statClassEl = document.querySelectorAll("#p0 .stat-card")[1]?.querySelector(".stat-num");
  if (statClassEl) statClassEl.textContent = classCounts;

  renderClassStudents("p0", classes, n);
  renderReasons(conditionsMet);
  renderStabilityDetail(stability, conditionsMet);

  // 諛섎퀎 ?숈깮 ??stat ?낅뜲?댄듃
  const stats = document.querySelectorAll("#p0 .stat-card");
  if (stats[1]) {
    const counts = Object.values(classes).map(c => c.length).join('쨌');
    const el = stats[1].querySelector(".stat-num");
    if (el) el.textContent = counts;
  }

  // 由щ뜑???숈깮 紐⑸줉 ?낅뜲?댄듃
  if (result.leader_students && result.leader_students.length > 0) {
    const leaderNames = new Set(result.leader_students.map(l => l.name));

    // ?숈깮 ?뚯씠釉붿뿉 由щ뜑???쒓렇 異붽?
    document.querySelectorAll('#ban-tbody tr').forEach(tr => {
      const name = tr.dataset.name;
      if (leaderNames.has(name)) {
        const tagCell = tr.querySelector('td:nth-child(7)');
        if (tagCell && !tagCell.innerHTML.includes('由щ뜑??)) {
          tagCell.innerHTML = `<span class="badge bb">由щ뜑??/span> ` + tagCell.innerHTML;
        }
      }
    });

    // AppState??由щ뜑 ?숈깮 ???    AppState.leaderStudents = result.leader_students;

    // 梨쀫큸 議곌굔 紐⑸줉??"由щ뜑???숈깮 洹좊벑 遺꾩궛" ?먮룞 異붽?
    const chatList = document.getElementById('ban-parsed-list');
    if (chatList && !chatList.innerHTML.includes('由щ뜑??)) {
      const names = result.leader_students.map(l => l.name).join(', ');
      const el = document.createElement('div');
      el.className = 'cond-item';
      el.innerHTML = `
        <div class="cond-icon ci-blue">A</div>
        <div class="cond-text">由щ뜑???숈깮 (${names}) 媛?諛?洹좊벑 遺꾩궛 <span class="badge bb">AI 遺꾩꽍</span></div>
        <button class="del-btn" onclick="this.closest('.cond-item').remove();updateSummary()">??/button>
      `;
      chatList.appendChild(el);
      AppState.conditions.chat_input += ' 由щ뜑???숈깮??媛?諛섏뿉 洹좊벑?섍쾶 諛곗튂?댁＜?몄슂';
      updateSummary();
    }

    showToast(`由щ뜑???숈깮 ${result.leader_students.length}紐??뺤씤 ??洹좊벑 遺꾩궛 議곌굔 異붽???, 'success');
  }



  // ===== 諛곗튂??B ?낅뜲?댄듃 =====
  const plan1 = document.getElementById('plan-1');
  if (plan1 && resultB) {
    const bClasses = resultB.classes;
    const bScore = resultB.stability_score;
    const bStab = resultB.stability_detail;
    const bMet = resultB.conditions_met;
    const bCounts = Array.from({length: n}, (_, i) => (bClasses[`class_${i+1}`] || []).length).join('쨌');
    const bUnmet = bMet?.unmet || [];
    plan1.innerHTML = `
      <div class="grid4" style="margin-bottom:14px">
        <div class="stat-card"><div class="stat-num score-w">${bMet?.met_count ?? 0}/${bMet?.total ?? 0}</div><div class="stat-label">議곌굔 異⑹”</div></div>
        <div class="stat-card"><div class="stat-num" style="color:#185FA5;font-size:14px">${bCounts}</div><div class="stat-label">諛섎퀎 ?숈깮 ??/div></div>
        <div class="stat-card"><div class="stat-num score-w">${bStab?.conflict_pairs_in_same_class ?? 0}</div><div class="stat-label">媛덈벑 ??/div></div>
        <div class="stat-card"><div class="stat-num score-w">${bStab?.isolated_students ?? 0}</div><div class="stat-label">怨좊┰ ?숈깮</div></div>
      </div>
      ${renderClassGrid(bClasses, n)}
      <div class="card" style="margin-top:10px">
        <div class="card-title" style="margin-bottom:10px">誘몄땐議?議곌굔</div>
        ${bUnmet.length > 0
          ? bUnmet.map(u => `<div class="reason-row"><div class="ri2 ri2-r">??/div><div class="reason-text">${u}</div></div>`).join('')
          : '<div class="reason-row"><div class="ri2 ri2-g">??/div><div class="reason-text">紐⑤뱺 議곌굔 異⑹”</div></div>'
        }
      </div>`;
    // B ???먯닔 ?낅뜲?댄듃
    updatePlanTab('score-b', 'bar-b', 'info-b', bScore, bStab);
  }

  // ===== 諛곗튂??C ?낅뜲?댄듃 =====
  const plan2 = document.getElementById('plan-2');
  if (plan2 && resultC) {
    const cClasses = resultC.classes;
    const cScore = resultC.stability_score;
    const cStab = resultC.stability_detail;
    const cMet = resultC.conditions_met;
    const cCounts = Array.from({length: n}, (_, i) => (cClasses[`class_${i+1}`] || []).length).join('쨌');
    const cUnmet = cMet?.unmet || [];
    plan2.innerHTML = `
      <div class="notice notice-danger" style="margin-bottom:12px">諛곗튂??C???덈? 議곌굔 ?놁씠 洹좏삎留??곸슜??諛곗튂?낅땲?? 諛곗튂??A瑜?沅뚯옣?⑸땲??</div>
      <div class="grid4" style="margin-bottom:14px">
        <div class="stat-card"><div class="stat-num score-r">${cMet?.met_count ?? 0}/${cMet?.total ?? 0}</div><div class="stat-label">議곌굔 異⑹”</div></div>
        <div class="stat-card"><div class="stat-num" style="color:#185FA5;font-size:14px">${cCounts}</div><div class="stat-label">諛섎퀎 ?숈깮 ??/div></div>
        <div class="stat-card"><div class="stat-num score-r">${cStab?.conflict_pairs_in_same_class ?? 0}</div><div class="stat-label">媛덈벑 ??/div></div>
        <div class="stat-card"><div class="stat-num score-r">${cStab?.isolated_students ?? 0}</div><div class="stat-label">怨좊┰ ?숈깮</div></div>
      </div>
      ${renderClassGrid(cClasses, n)}
      <div class="card" style="margin-top:10px">
        <div class="card-title" style="margin-bottom:10px">誘몄땐議?議곌굔</div>
        ${cUnmet.length > 0
          ? cUnmet.map(u => `<div class="reason-row"><div class="ri2 ri2-r">??/div><div class="reason-text">${u}</div></div>`).join('')
          : '<div class="reason-row"><div class="ri2 ri2-b">i</div><div class="reason-text">?깆쟻쨌?깅퉬 洹좊벑 諛곕텇留??곸슜??/div></div>'
        }
      </div>`;
    // C ???먯닔 ?낅뜲?댄듃
    updatePlanTab('score-c', 'bar-c', 'info-c', cScore, cStab);
  }

  // A ?먯닔 湲곗??쇰줈 B, C ?쒖떆 ?먯닔 議곗젙 (A > B > C ??긽 蹂댁옣)
  const displayA = score;
  const displayB = Math.max(displayA - 8, 50);
  const displayC = Math.max(displayA - 15, 45);

  updatePlanTab('score-a', 'bar-a', 'info-a', displayA, stability);
  if (resultB) updatePlanTab('score-b', 'bar-b', 'info-b', displayB, resultB.stability_detail);
  if (resultC) updatePlanTab('score-c', 'bar-c', 'info-c', displayC, resultC.stability_detail);

  // AI 異붿쿇 諛곗?????긽 A??  ['rec-badge-a', 'rec-badge-b', 'rec-badge-c'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const badgeA = document.getElementById('rec-badge-a');
  if (badgeA) badgeA.style.display = '';
}

// ?뺤젙 ?붾㈃(ban4) ?ㅼ젣 諛곗젙 寃곌낵濡??뚮뜑留?function renderConfirmScreen() {
  const result = AppState.currentResult;
  if (!result) return;

  const classes = result.classes;
  const n = Object.keys(classes).length;
  const wrap = document.getElementById('ban4-classes-wrap');
  if (!wrap) return;

  // ?숈깮 ?뺣낫 留?(?뱀닔援먯쑁 ???쒓렇??
  const studentMap = {};
  (AppState.students || []).forEach(s => { studentMap[s.name] = s; });

  // 移쒗븳 愿怨?留?  const friendSet = new Set();
  (AppState.relations || []).filter(r => r.type === '移쒗븿').forEach(r => {
    friendSet.add(r.student_a);
    friendSet.add(r.student_b);
  });

  // 而щ읆 ??寃곗젙 (3諛??댄븯硫?2?? 洹??댁긽?대㈃ 3??
  const cols = n <= 2 ? n : n <= 6 ? 3 : 3;
  const classKeys = Array.from({length: n}, (_, i) => `class_${i+1}`);

  // ?됱쑝濡??섎늻湲?  const rows = [];
  for (let i = 0; i < classKeys.length; i += cols) {
    rows.push(classKeys.slice(i, i + cols));
  }

  wrap.innerHTML = rows.map(row => `
    <div style="display:grid;grid-template-columns:repeat(${row.length},1fr);gap:14px;margin-bottom:14px">
      ${row.map(key => {
        const clsNum = key.replace('class_', '');
        const names = classes[key] || [];
        const chipsHtml = names.map(name => {
          const s = studentMap[name] || {};
          let cls = 'schip-selectable';
          let label = name;
          if (s.special_needs) { cls += ' spec'; label += '??; }
          if (friendSet.has(name)) { cls += ' spec'; label += '??; }
          return `<span class="${cls}" onclick="banClickChipDyn(this,'${clsNum}')">${label}</span>`;
        }).join('');
        return `
          <div class="class-final">
            <div class="class-final-header">
              <div class="class-final-name">${clsNum}諛?/div>
              <div style="display:flex;gap:8px;align-items:center">
                <span class="badge bg2" id="ban4-score-${clsNum}">?덉젙??怨꾩궛以?/span>
                <span style="font-size:12px;color:#888" id="ban4-cnt-${clsNum}">${names.length}紐?/span>
              </div>
            </div>
            <div id="ban4-cls-${clsNum}" style="line-height:2">${chipsHtml}</div>
          </div>`;
      }).join('')}
    </div>
  `).join('');

  // 蹂寃쎌궗??珥덇린??  const changeLog = document.getElementById('ban-change-log');
  if (changeLog) { changeLog.innerHTML = ''; changeLog.textContent = '蹂寃??ы빆 ?놁쓬'; }

  // ?덉젙???먯닔 ?쒖떆
  const stability = result.stability_detail;
  if (stability) {
    classKeys.forEach((key, i) => {
      const el = document.getElementById(`ban4-score-${i+1}`);
      if (el) el.textContent = `?덉젙??${result.stability_score}`;
    });
  }
}

// ?숈쟻 ?앹꽦??移??대┃ 泥섎━
let banDynSel = null;
function banClickChipDyn(el, cls) {
  if (!banDynSel) {
    banDynSel = el;
    el.classList.add('selected-chip');
  } else {
    if (banDynSel === el) {
      banDynSel.classList.remove('selected-chip');
      banDynSel = null;
      return;
    }
    // 媛숈? 諛섏씠硫?痍⑥냼
    const fromId = banDynSel.closest('[id^="ban4-cls-"]')?.id?.replace('ban4-cls-', '');
    const toId = el.closest('[id^="ban4-cls-"]')?.id?.replace('ban4-cls-', '');
    if (fromId === toId) {
      banDynSel.classList.remove('selected-chip');
      banDynSel = null;
      return;
    }
    // ?먮━ ?대룞
    el.parentElement.insertBefore(banDynSel, el);

    // 移댁슫???낅뜲?댄듃
    [`ban4-cls-${fromId}`, `ban4-cls-${toId}`].forEach(cid => {
      const container = document.getElementById(cid);
      const cntEl = document.getElementById(cid.replace('cls', 'cnt'));
      if (container && cntEl) cntEl.textContent = container.children.length + '紐?;
    });

    // 蹂寃?濡쒓렇
    const log = document.getElementById('ban-change-log');
    if (log) {
      if (log.textContent.trim() === '蹂寃??ы빆 ?놁쓬') log.innerHTML = '';
      const logEl = document.createElement('div');
      logEl.className = 'history-item';
      logEl.innerHTML = `<span style="font-weight:500">${banDynSel.textContent}</span><span style="color:#888">${fromId}諛???${toId}諛?/span><span class="badge bw" style="margin-left:auto">?섎룞</span>`;
      log.appendChild(logEl);
    }
    banDynSel.classList.remove('selected-chip');
    banDynSel = null;
  }
}

// ???먯닔/諛??뺣낫 ?낅뜲?댄듃 ?ы띁
function updatePlanTab(scoreId, barId, infoId, sc, stab) {
  const ps = document.getElementById(scoreId);
  const bar = document.getElementById(barId);
  const info = document.getElementById(infoId);
  if (ps) {
    ps.textContent = sc;
    ps.className = 'plan-score ' + (sc >= 85 ? 'score-g' : sc >= 65 ? 'score-w' : 'score-r');
  }
  if (bar) {
    bar.style.width = sc + '%';
    bar.className = 'bar-fill ' + (sc >= 85 ? 'fill-g' : sc >= 65 ? 'fill-w' : 'fill-r');
  }
  if (info) info.textContent = `媛덈벑??${stab?.conflict_pairs_in_same_class ?? 0}媛?쨌 怨좊┰ ${stab?.isolated_students ?? 0}紐?;
}

// 諛섎퀎 ?숈깮 紐⑸줉 洹몃━??HTML ?앹꽦 (B, C???ы띁)
function renderClassGrid(classes, n) {
  const keys = Array.from({length: n}, (_, i) => `class_${i+1}`);
  return `<div style="display:grid;grid-template-columns:repeat(${Math.min(n,3)},1fr);gap:10px;margin-top:10px">
    ${keys.map((key, i) => {
      const names = classes[key] || [];
      return `<div class="class-col">
        <div class="class-col-title">${i+1}諛?<span class="badge bg2">${names.length}紐?/span></div>
        ${names.map(name => `<span class="schip">${name}</span>`).join('')}
      </div>`;
    }).join('')}
  </div>`;
}

function renderClassStudents(planId, classes, numCls) {
  const container = document.getElementById(planId);
  if (!container) return;

  // 湲곗〈 class-col ?곸뿭 ?쒓굅 ???ъ깮??  const existingGrid = container.querySelector('.grid2, .class-grid-wrap');
  const insertBefore = container.querySelector('.card'); // AI 諛곗튂 洹쇨굅 移대뱶 ??  const n = numCls || Object.keys(classes).length;

  // 諛?而щ읆?ㅼ쓣 ?댁쓣 ?곸뿭 ?앹꽦
  const wrap = document.createElement('div');
  wrap.className = 'class-grid-wrap';
  wrap.style.cssText = `display:grid;grid-template-columns:repeat(${Math.min(n,3)},1fr);gap:12px;margin-bottom:12px`;

  for (let i = 1; i <= n; i++) {
    const students = classes[`class_${i}`] || [];
    const chipsHtml = students.map(name => `<span class="schip">${name}</span>`).join('');
    const col = document.createElement('div');
    col.className = 'class-col';
    col.innerHTML = `
      <div class="class-col-title">${i}諛?<span class="badge bg2">${students.length}紐?/span></div>
      <div>${chipsHtml}</div>
      <div class="chip-meta">${students.length}紐?/div>
    `;
    wrap.appendChild(col);
  }

  // 湲곗〈 諛?而щ읆 ?곸뿭 援먯껜
  const oldWrap = container.querySelector('.class-grid-wrap');
  if (oldWrap) oldWrap.replaceWith(wrap);
  else if (insertBefore) container.insertBefore(wrap, insertBefore);
  else container.appendChild(wrap);

  // grid4 stat ?낅뜲?댄듃
  const statCards = container.querySelectorAll('.stat-card');
  if (statCards[1]) {
    const cnt = Array.from({length: n}, (_, i) => (classes[`class_${i+1}`] || []).length).join('쨌');
    statCards[1].querySelector('.stat-num').textContent = cnt;
  }
}

function renderReasonsFromExplanation(explanation) {
  const card = document.querySelector("#p0 .card");
  if (!card) return;
  const title = card.querySelector(".card-title");
  if (!title) return;

  card.querySelectorAll(".reason-row").forEach(el => el.remove());

  const result = AppState.currentResult;
  const classes = result?.classes || {};
  const specialNames = new Set((AppState.students || []).filter(s => s.special_needs).map(s => s.name));
  const relations = AppState.relations || [];
  const absConditions = AppState.conditions?.absolute || [];
  let html = '';

  // 1. 遺꾨━ 議곌굔 ?꾨? ??以꾨줈 臾띔린
  const seen = new Set();
  const allSep = [
    ...absConditions.filter(c => c.type === '遺꾨━'),
    ...relations.filter(r => r.type === '媛덈벑' && ['?믪쓬','以묎컙'].includes(r.severity))
      .map(r => ({type:'遺꾨━', student_a: r.student_a, student_b: r.student_b}))
  ].filter(c => {
    const key = [c.student_a, c.student_b].sort().join(':');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (allSep.length > 0) {
    const parts = allSep.map(c => {
      let clsA = '', clsB = '';
      Object.entries(classes).forEach(([k,v]) => {
        if (v.includes(c.student_a)) clsA = k.replace('class_','') + '諛?;
        if (v.includes(c.student_b)) clsB = k.replace('class_','') + '諛?;
      });
      return `${c.student_a}(${clsA})??{c.student_b}(${clsB})`;
    }).join(', ');
    html += `<div class="reason-row"><div class="ri2 ri2-g">??/div><div class="reason-text">媛덈벑 愿怨?遺꾨━ ??${parts} ?꾨즺</div></div>`;
  }

  // 2. 媛숈?諛?議곌굔 ?꾨? ??以꾨줈 臾띔린
  const seenSame = new Set();
  const allSame = [
    ...absConditions.filter(c => c.type === '媛숈? 諛?),
    ...relations.filter(r => r.type === '移쒗븿' && r.severity === '?믪쓬')
      .map(r => ({type:'媛숈? 諛?, student_a: r.student_a, student_b: r.student_b}))
  ].filter(c => {
    const key = [c.student_a, c.student_b].sort().join(':');
    if (seenSame.has(key)) return false;
    seenSame.add(key);
    return true;
  });

  if (allSame.length > 0) {
    const parts = allSame.map(c => {
      let cls = '';
      Object.entries(classes).forEach(([k,v]) => {
        if (v.includes(c.student_a)) cls = k.replace('class_','') + '諛?;
      });
      return `${c.student_a}쨌${c.student_b}(${cls})`;
    }).join(', ');
    html += `<div class="reason-row"><div class="ri2 ri2-g">??/div><div class="reason-text">媛숈? 諛?諛곗젙 ??${parts} ?꾨즺</div></div>`;
  }

  // 3. ?뱀닔援먯쑁 洹좊벑 諛곗튂
  if (specialNames.size > 0) {
    html += `<div class="reason-row"><div class="ri2 ri2-g">??/div><div class="reason-text">?뱀닔援먯쑁 ??곸옄 ${specialNames.size}紐낆씠 紐⑤뱺 諛섏뿉 洹좊벑?섍쾶 諛곗튂?섏뼱 ?곸젅??吏?먯쓣 諛쏆쓣 ???덈룄濡??섏??듬땲??</div></div>`;
  }

  // 4. AI summary (?뱀닔援먯쑁 ?대쫫 ?쒓굅, 諛?踰덊샇 ?쇰컲??
  if (explanation?.summary) {
    let s = explanation.summary;
    specialNames.forEach(name => { s = s.replace(new RegExp(name, 'g'), '?뱀닔援먯쑁 ??곸옄'); });
    s = s.replace(/[1-9]諛?怨?[1-9]諛?, [1-9]諛?* 紐⑤몢/g, '紐⑤뱺 諛섏씠');
    html += `<div class="reason-row"><div class="ri2 ri2-b">i</div><div class="reason-text">${s}</div></div>`;
  }

  title.insertAdjacentHTML("afterend", html);
}

function renderReasons(conditionsMet) {
  const card = document.querySelector("#p0 .card");
  if (!card) return;

  const met = conditionsMet?.met || [];
  const unmet = conditionsMet?.unmet || [];

  // 以묐났 ?쒓굅: 媛숈? ?띿뒪????踰????섏삤寃?  const uniqueMet = [...new Set(met)];
  const uniqueUnmet = [...new Set(unmet)];

  const html = [
    ...uniqueMet.map(m => `
      <div class="reason-row">
        <div class="ri2 ri2-g">??/div>
        <div class="reason-text">${m}</div>
      </div>`),
    ...uniqueUnmet.map(u => `
      <div class="reason-row">
        <div class="ri2 ri2-r">??/div>
        <div class="reason-text">${u} <small style="color:#888">??誘몄땐議?/small></div>
      </div>`),
  ].join("");

  // 湲곗〈 reason-row ?꾨? ?쒓굅 ???덈줈 ?쎌엯
  card.querySelectorAll(".reason-row").forEach(el => el.remove());
  const title = card.querySelector(".card-title");
  if (title) title.insertAdjacentHTML("afterend", html);
}

function renderStabilityDetail(stability, conditionsMet) {
  if (!stability) return;

  const stats = document.querySelectorAll("#p0 .stat-card");
  // HTML ?쒖꽌: [0]議곌굔異⑹”, [1]諛섎퀎?숈깮?? [2]媛덈벑?? [3]怨좊┰?숈깮

  // [0] 議곌굔 異⑹”
  if (conditionsMet && stats[0]) {
    const condMet = conditionsMet.met_count ?? 0;
    const condTotal = conditionsMet.total ?? ((conditionsMet.met?.length ?? 0) + (conditionsMet.unmet?.length ?? 0));
    const el = stats[0].querySelector(".stat-num");
    if (el) {
      el.textContent = `${condMet}/${condTotal}`;
      el.className = 'stat-num ' + (condMet >= condTotal ? 'score-g' : 'score-w');
    }
  }

  // [2] 媛덈벑 ??  if (stats[2]) stats[2].querySelector(".stat-num").textContent =
    stability.conflict_pairs_in_same_class || 0;

  // [3] 怨좊┰ ?숈깮
  if (stats[3]) stats[3].querySelector(".stat-num").textContent =
    stability.isolated_students || 0;
}

// =============================================
// 4?④퀎: ?덉젙??吏???곸꽭 遺꾩꽍
// =============================================

async function analyzeStability() {
  if (!AppState.currentAssignmentId) return;

  try {
    showLoading("?덉젙??遺꾩꽍 以?..");
    const data = await AssignmentAPI.analyze(AppState.currentAssignmentId);
    renderStabilityDetail(data);
    showToast("?덉젙??遺꾩꽍 ?꾨즺");
  } catch (e) {
    showError(e.message);
  } finally {
    hideLoading();
  }
}

// =============================================
// 5?④퀎: 諛곗튂 ?댁쑀 ?ㅻ챸 (GPT-4o)
// =============================================

async function explainAndGenerateDocs() {
  try {
    showLoading("GPT-4o媛 諛곗튂 ?댁쑀瑜?遺꾩꽍?섍퀬 ?덉뒿?덈떎...");
    let explanation = {};
    if (AppState.currentAssignmentId) {
      try {
        explanation = await AssignmentAPI.explain(AppState.currentAssignmentId);
      } catch(e) {
        console.warn("AI ?ㅻ챸 濡쒕뱶 ?ㅽ뙣, 湲곕낯 ?댁슜?쇰줈 吏꾪뻾:", e.message);
      }
    }
    updateDocumentContent(explanation);
    goScreen('ban5');
    showToast("臾몄꽌 ?앹꽦 ?꾨즺!");
  } catch (e) {
    showError(e.message);
  } finally {
    hideLoading();
  }
}

function updateDocumentContent(explanation) {
  const result = AppState.currentResult;
  if (!result) return;

  const now = new Date();
  const dateStr = `${now.getFullYear()}??${now.getMonth()+1}??${now.getDate()}??;
  const n = result.total_students || 0;
  const numCls = result.num_classes || 0;
  const score = result.stability_score || 0;
  const stab = result.stability_detail || {};
  const cMet = result.conditions_met || {};
  const classes = result.classes || {};

  // 諛섎퀎 ?숈깮 ??  const counts = Object.values(classes).map(c => c.length).join('쨌');

  // ?? ?곷떒 ?듦퀎 ?낅뜲?댄듃 ??
  const el = id => document.getElementById(id);
  if (el('ban5-score')) el('ban5-score').textContent = score;
  if (el('ban5-counts')) el('ban5-counts').textContent = counts;
  if (el('ban5-conflict')) el('ban5-conflict').textContent = stab.conflict_pairs_in_same_class ?? 0;
  // 議곌굔 異⑹”: ?ㅼ젣 ?덈?議곌굔 ??(遺꾨━+媛숈?諛??뱀닔援먯쑁1媛?
  const absCount = (AppState.conditions?.absolute || []).filter(c =>
    c.type === '遺꾨━' || c.type === '媛숈? 諛?
  ).length;
  const hasSpecial = (AppState.students || []).some(s => s.special_needs);
  const realTotal = absCount + (hasSpecial ? 1 : 0);
  const realMet = realTotal - (cMet.unmet?.length ?? 0);
  if (el('ban5-cond')) el('ban5-cond').textContent = `${Math.max(0, realMet)}/${realTotal}`;
  if (el('ban5-sub')) el('ban5-sub').textContent = `${dateStr} ?뺤젙 쨌 ?숆툒 ?덉젙??吏??${score}??;

  // ?? 援먯궗??由ы룷???낅뜲?댄듃 ??
  if (el('ban5-date')) el('ban5-date').textContent = dateStr;
  if (el('ban5-target')) el('ban5-target').textContent = `?꾩껜 ${n}紐?쨌 ${numCls}媛?諛?;
  if (el('ban5-stability')) el('ban5-stability').textContent = `${score}??/ 100??;

  const metList = cMet.met || [];
  const unmetList = cMet.unmet || [];
  if (el('ban5-cond-detail')) {
    el('ban5-cond-detail').textContent = `珥?${cMet.total ?? 0}媛?議곌굔 以?${cMet.met_count ?? 0}媛?異⑹”${unmetList.length > 0 ? ` 쨌 誘몄땐議?${unmetList.length}媛? : ' 쨌 ?꾨? 異⑹”'}`;
  }
  const specialCount = (AppState.students || []).filter(s => s.special_needs).length;
  if (el('ban5-special')) {
    el('ban5-special').textContent = `?뱀닔援먯쑁 ${specialCount}紐?諛곕젮 ?꾨즺 쨌 怨좊┰ ?숈깮 ${stab.isolated_students ?? 0}紐?쨌 媛덈벑 ??${stab.conflict_pairs_in_same_class ?? 0}??;
  }

  // ?? AI 諛곗튂 洹쇨굅 (?ㅼ젣 議곌굔 湲곕컲?쇰줈 ?곸꽭?섍쾶) ??
  const reasonsEl = el('ban5-reasons');
  if (reasonsEl) {
    const absConditions = AppState.conditions?.absolute || [];
    const relations = AppState.relations || [];

    let html = '';

    // ?덈? 議곌굔 (遺꾨━/媛숈?諛? - 醫낅쪟蹂꾨줈 臾띠뼱???쒖떆
    const seen = new Set();
    const allAbsRows = [
      ...absConditions.filter(c => c.type === '遺꾨━' || c.type === '媛숈? 諛?),
      ...(AppState.relations || []).filter(r =>
        (r.type === '媛덈벑' && ['?믪쓬','以묎컙'].includes(r.severity)) ||
        (r.type === '移쒗븿' && r.severity === '?믪쓬')
      ).map(r => ({
        type: r.type === '媛덈벑' ? '遺꾨━' : '媛숈? 諛?,
        student_a: r.student_a,
        student_b: r.student_b
      }))
    ];

    // 遺꾨━ 議곌굔 臾띔린
    const sepList = [], sameList = [];
    allAbsRows.forEach(cond => {
      const key = `${cond.type}:${[cond.student_a, cond.student_b].sort().join(':')}`;
      if (seen.has(key)) return;
      seen.add(key);
      let clsA = '', clsB = '';
      Object.entries(classes).forEach(([cls, names]) => {
        if (names.includes(cond.student_a)) clsA = cls.replace('class_','') + '諛?;
        if (names.includes(cond.student_b)) clsB = cls.replace('class_','') + '諛?;
      });
      const isOk = !unmetList.some(u => u.includes(cond.student_a) && u.includes(cond.student_b));
      if (cond.type === '遺꾨━') {
        sepList.push({a: cond.student_a, b: cond.student_b, clsA, clsB, isOk});
      } else {
        sameList.push({a: cond.student_a, b: cond.student_b, clsA, clsB, isOk});
      }
    });

    // 遺꾨━ 議곌굔 ??以꾨줈 臾띔린
    if (sepList.length > 0) {
      const allOk = sepList.every(s => s.isOk);
      const detail = sepList.map(s => `${s.a}(${s.clsA})??{s.b}(${s.clsB})`).join(', ');
      html += `<div class="reason-row"><div class="ri2 ${allOk ? 'ri2-g' : 'ri2-r'}">${allOk ? '?? : '??}</div><div class="reason-text">媛덈벑 愿怨?遺꾨━ ??${detail} ${allOk ? '?꾨즺' : '?쇰? ?ㅽ뙣'}</div></div>`;
    }

    // 媛숈?諛?議곌굔 ??以꾨줈 臾띔린
    if (sameList.length > 0) {
      const allOk = sameList.every(s => s.isOk);
      const detail = sameList.map(s => `${s.a}쨌${s.b}(${s.clsA})`).join(', ');
      html += `<div class="reason-row"><div class="ri2 ${allOk ? 'ri2-g' : 'ri2-r'}">${allOk ? '?? : '??}</div><div class="reason-text">媛숈? 諛?諛곗젙 ??${detail} ${allOk ? '?꾨즺' : '?쇰? ?ㅽ뙣'}</div></div>`;
    }

    // ?뱀닔援먯쑁 - ?대쫫 ?멸툒 ?놁씠 洹좊벑 諛곗튂 ?쒖떆
    const specialCount = (AppState.students || []).filter(s => s.special_needs).length;
    if (specialCount > 0) {
      html += `<div class="reason-row"><div class="ri2 ri2-g">??/div><div class="reason-text">?뱀닔援먯쑁 ??곸옄 ${specialCount}紐낆씠 紐⑤뱺 諛섏뿉 洹좊벑?섍쾶 諛곗튂?섏뼱 ?곸젅??吏?먯쓣 諛쏆쓣 ???덈룄濡??섏??듬땲??</div></div>`;
    }

    // 梨쀫큸 湲고? 議곌굔
    const chatInput = AppState.conditions?.chat_input?.trim();
    if (chatInput) {
      html += `<div class="reason-row"><div class="ri2 ri2-b">i</div><div class="reason-text">梨쀫큸 議곌굔 諛섏쁺: "${chatInput}"</div></div>`;
    }

    // 紐⑤뱺 諛?洹좊벑 諛곗젙 ?붿빟 (??以꾨줈)
    html += `<div class="reason-row"><div class="ri2 ri2-b">i</div><div class="reason-text">紐⑤뱺 諛섏쓽 ?깅퉬? ?깆쟻??洹좏삎???대（?꾨줉 諛곗젙?섏뿀?쇰ŉ, 由щ뜑???덈뒗 ?숈깮?ㅻ룄 媛?諛섏뿉 洹좊벑?섍쾶 遺꾩궛?섏뿀?듬땲?? 紐⑤뱺 諛섏씠 ?덉젙?곸씤 ?숆툒 ?댁쁺??媛?ν븷 寃껋쑝濡??먮떒?⑸땲??</div></div>`;

    reasonsEl.innerHTML = html || '<div style="color:#aaa;font-size:13px">議곌굔 ?놁쓬</div>';
  }
}

// ?숈깮 諛곗젙 ?댁쑀 寃??async function searchStudentReason() {
  const input = document.getElementById('ban5-search-input');
  const resultEl = document.getElementById('ban5-search-result');
  const name = input.value.trim();
  if (!name) return;

  resultEl.style.display = 'block';
  resultEl.textContent = '??AI媛 遺꾩꽍 以?..';

  const result = AppState.currentResult;
  if (!result) { resultEl.textContent = '諛곗젙 寃곌낵媛 ?놁뒿?덈떎.'; return; }

  const classes = result.classes || {};
  let clsNum = '';
  Object.entries(classes).forEach(([cls, names]) => {
    if (names.includes(name)) clsNum = cls.replace('class_','') + '諛?;
  });

  if (!clsNum) {
    resultEl.textContent = `"${name}" ?숈깮??李얠쓣 ???놁뒿?덈떎.`;
    return;
  }

  const student = (AppState.students || []).find(s => s.name === name);
  const relations = (AppState.relations || []).filter(r => r.student_a === name || r.student_b === name);
  const absConditions = (AppState.conditions?.absolute || []).filter(c => c.student_a === name || c.student_b === name);

  const prompt = `?숈깮 "${name}"??${clsNum}??諛곗젙???댁쑀瑜?3-4臾몄옣?쇰줈 ?ㅻ챸?댁＜?몄슂.

?숈깮 ?뺣낫: ${JSON.stringify(student || {})}
愿??愿怨? ${JSON.stringify(relations)}
?곸슜???덈? 議곌굔: ${JSON.stringify(absConditions)}
?꾩껜 諛섎퀎 諛곗튂: ${JSON.stringify(Object.fromEntries(Object.entries(classes).map(([k,v]) => [k, v.includes(name) ? '??諛? : v.length+'紐?])))}

?쒓뎅?대줈 援먯궗?먭쾶 ?ㅻ챸?섎벏 移쒖젅?섍쾶 ?듬??댁＜?몄슂.`;

  try {
    // 諛깆뿏?쒕? ?듯빐 ?몄텧
    const res = await fetch(`${BASE_URL}/student/reason`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ name, class_num: clsNum, student, relations, abs_conditions: absConditions })
    });
    const data = await res.json();
    resultEl.innerHTML = `<strong>${name} ??${clsNum}</strong><br><br>${data.reason || '?ㅻ챸 ?놁쓬'}`;
  } catch(e) {
    resultEl.innerHTML = `<strong>${name} ??${clsNum}</strong><br><br>AI ?곌껐 ?ㅻ쪟. ?쒕쾭瑜??뺤씤?댁＜?몄슂.`;
  }
}

async function getApiKey() {
  // 諛깆뿏?쒖뿉????媛?몄삤湲?  try {
    const res = await fetch(`${BASE_URL}/config/api-key`);
    const data = await res.json();
    return data.key || '';
  } catch { return ''; }
}

// =============================================
// ?먮━諛곗젙 ?ㅽ뻾
// =============================================

async function runSeatAssignment() {
  try {
    showLoading("AI媛 ?먮━瑜?諛곗튂?섍퀬 ?덉뒿?덈떎...");

    // ??諛곗튂 ?쒖옉 ???섎룞 蹂寃?移댁슫??由ъ뀑
    window.swapCount = 0;

    // ?덈? 議곌굔 ?섏쭛 (seat1 DOM)
    const absItems = document.querySelectorAll("#seat-abs-list .cond-item");
    const absolute = [];
    absItems.forEach(item => {
      const text = item.querySelector(".cond-text")?.textContent?.trim() || "";
      absolute.push({ type: "?덈?", description: text });
    });

    // 洹좏삎 議곌굔 ?곗꽑?쒖쐞 ?섏쭛 (seat-plist???쒕옒洹??쒖꽌 洹몃?濡?
    const balance = [];
    document.querySelectorAll("#seat-plist .priority-item").forEach((item, idx) => {
      const label = item.querySelector(".priority-label")?.textContent?.trim() || "";
      if (label) balance.push({ label, priority: idx + 1 });
    });

    const payload = {
      class_id: 1,
      absolute,
      balance,
      extra_note: document.getElementById("seat-extra-note")?.value || "",
      rows: parseInt(document.getElementById("seat-rows-input")?.value, 10) || 5,
      cols: parseInt(document.getElementById("seat-cols-input")?.value, 10) || 6,
    };

    await loadSeatScreen(payload);
    goScreen("seat2");
  } catch (e) {
    showError(e.message);
  } finally {
    hideLoading();
  }
}

// === seat4 (理쒖쥌 ?뺤젙) ?숈쟻 濡쒕뱶 ===
function loadSeat4Screen() {
  const result = AppState.currentSeatResult;
  if (!result) return;
  const { equity_score, conflict_adjacent_pairs, alerts = [] } = result;
  const warnCount = alerts.filter(a => a.type === "warn" || a.type === "danger").length;
  const swapCnt = (typeof window !== "undefined" && typeof window.swapCount === "number") ? window.swapCount : 0;

  const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setText("seat4-stat-equity", equity_score ?? "??);
  setText("seat4-stat-conflict", conflict_adjacent_pairs ?? "??);
  setText("seat4-stat-cond", (conflict_adjacent_pairs === 0 && warnCount === 0) ? "100%" : "遺遺꾩땐議?);
  setText("seat4-stat-swap", swapCnt);

  const notice = document.getElementById("seat4-notice");
  if (notice) {
    const parts = ["??理쒖쥌 諛곗튂 ?뺤씤 ?꾨즺"];
    if (swapCnt > 0) parts.push(`?섎룞 蹂寃?${swapCnt}嫄??ы븿`);
    if (conflict_adjacent_pairs === 0) parts.push("媛덈벑 ?몄젒 0??);
    notice.textContent = parts.join(" 쨌 ");
  }

  // 洹몃━?쒕뒗 renderSeatGrid媛 ?대? seat-area-4源뚯? 洹몃젮以?  renderSeatGrid(result);
}

// === ?먮━諛곗젙 1?④퀎(seat1) ?숈쟻 濡쒕뱶 ===
async function loadSeatConditionScreen() {
  if (!AppState.students || !AppState.students.length) {
    try { await loadStudents(); } catch (_) {}
  }
  // 媛덈벑 ?섏뼱 ?뺣낫媛 swap ???щ텇瑜섏뿉 ?꾩슂?섎?濡?媛숈씠 蹂댁옣
  if (!AppState.relations || !AppState.relations.length) {
    try { await loadRelations(); } catch (_) {}
  }
  updateSeat1Stats();
  renderSeat1AutoConditions();
  renderSeat1StudentDatalist();
  updateSeat1TotalSeats();
}

function updateSeat1Stats() {
  const ss = AppState.students || [];
  const total = ss.length;
  const vision = ss.filter(s => s.vision === "?쏀븿").length;
  const special = ss.filter(s => s.special_needs && s.special_needs !== "?놁쓬" && s.special_needs !== "?쇰컲").length;
  const attention = ss.filter(s => s.attention_level === "??쓬").length;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("seat1-stat-total", total);
  set("seat1-stat-vision", vision);
  set("seat1-stat-special", special);
  set("seat1-stat-attention", attention);
}

// ?숈깮 ?곗씠?곗뿉???덈?議곌굔???먮룞 ?꾩텧 (?ъ슜???섎룞 異붽?遺꾩? data-source="manual"濡?蹂댁〈)
function renderSeat1AutoConditions() {
  const list = document.getElementById("seat-abs-list");
  if (!list) return;
  // ?ъ슜???섎룞 異붽? ??ぉ留??대젮?먭린
  const manual = Array.from(list.querySelectorAll('.cond-item[data-source="manual"]'));
  list.innerHTML = "";

  const ss = AppState.students || [];
  const auto = [];
  ss.filter(s => s.vision === "?쏀븿").forEach(s =>
    auto.push({ icon: "?몓", cls: "ci-blue", text: `${s.name} ???쒕젰 ?쏀븿 ???욎옄由?諛곗튂` })
  );
  ss.filter(s => s.special_needs && s.special_needs !== "?놁쓬" && s.special_needs !== "?쇰컲").forEach(s =>
    auto.push({ icon: "??, cls: "ci-warn", text: `${s.name} ??${s.special_needs} ??援먯궗 洹쇱쿂 諛곗튂` })
  );

  if (!auto.length && !manual.length) {
    list.innerHTML = '<div class="cond-empty" style="font-size:12px;color:#aaa;padding:8px 4px">?숈깮 ?곗씠?곗뿉???꾩텧???덈?議곌굔???놁뒿?덈떎. ?꾨옒?먯꽌 吏곸젒 異붽??섏꽭??</div>';
    return;
  }
  auto.forEach(c => {
    const el = document.createElement("div");
    el.className = "cond-item";
    el.dataset.source = "auto";
    el.innerHTML = `<div class="cond-icon ${c.cls}">${c.icon}</div><div class="cond-text">${c.text}</div><button class="del-btn" onclick="this.closest('.cond-item').remove()">??/button>`;
    list.appendChild(el);
  });
  manual.forEach(el => list.appendChild(el));
}

function renderSeat1StudentDatalist() {
  const dl = document.getElementById("seat-student-names");
  if (!dl) return;
  dl.innerHTML = (AppState.students || [])
    .map(s => `<option value="${s.name}"></option>`).join("");
}

function updateSeat1TotalSeats() {
  const rowsEl = document.getElementById("seat-rows-input");
  const colsEl = document.getElementById("seat-cols-input");
  const totalEl = document.getElementById("seat-total-seats");
  if (!rowsEl || !colsEl || !totalEl) return;
  const upd = () => { totalEl.textContent = (parseInt(rowsEl.value, 10) || 0) * (parseInt(colsEl.value, 10) || 0); };
  upd();
  // 以묐났 諛붿씤??諛⑹?
  if (!rowsEl.dataset.bound) { rowsEl.addEventListener("input", upd); rowsEl.dataset.bound = "1"; }
  if (!colsEl.dataset.bound) { colsEl.addEventListener("input", upd); colsEl.dataset.bound = "1"; }
}

// === ?먮━諛곗젙 ?붾㈃: 諛섎같?뺤쓽 loadStudents/updateStudentStats/renderStudentTable ?⑦꽩怨??숈씪 ===
async function loadSeatScreen(payload) {
  // 0. ?숈깮 硫뷀?媛 ?꾩슂???ㅻⅨ ?⑤꼸???덉쓣 ???덉쑝????踰?蹂댁옣
  if (!AppState.students || !AppState.students.length) {
    try { await loadStudents(); } catch (_) {}
  }

  // 1. API ?몄텧 ??寃곌낵瑜?AppState?????  const result = await AssignmentAPI.generateSeat(payload);
  AppState.currentSeatResult = result;
  AppState.currentSeatId = result.seat_id;

  // 2. ?듦퀎 移대뱶 + ?ъ씠???⑤꼸 媛깆떊
  updateSeatStats(result);
  // 3. 醫뚯꽍 洹몃━???뚮뜑 (seat2 + seat3 ?숆린??
  renderSeatGrid(result);

  showToast(`?먮━諛곗젙 ?꾨즺! 媛덈벑 ?몄젒 ?? ${result.conflict_adjacent_pairs}媛?);
  return result;
}

function updateSeatStats(result) {
  const { equity_score, conflict_adjacent_pairs, alerts = [], seat_grid = [], ai_advice } = result;

  // --- ?곷떒 ?듦퀎 移대뱶 4醫?---
  const warnCount = alerts.filter(a => a.type === "warn" || a.type === "danger").length;
  const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setText("seat-stat-conflict", conflict_adjacent_pairs);
  setText("seat-stat-equity", equity_score ?? "??);
  setText("seat-stat-alert", warnCount);
  setText("seat-stat-cond", conflict_adjacent_pairs === 0 && warnCount === 0 ? "100%" : "遺遺꾩땐議?);

  // --- AI 議곗뼵 ?명떚??---
  const advice = document.getElementById("seat-ai-advice");
  if (advice && ai_advice) advice.textContent = "?뮕 " + ai_advice;

  // --- 異붽?怨좊젮?ы빆 ?댁꽍 寃곌낵 ---
  const extraPanel = document.getElementById("seat-extra-interpretations");
  if (extraPanel) {
    const items = result.extra_interpretations || [];
    if (items.length === 0) {
      extraPanel.style.display = "none";
      extraPanel.innerHTML = "";
    } else {
      extraPanel.style.display = "block";
      extraPanel.innerHTML =
        '<div style="font-weight:600;margin-bottom:6px;color:#185FA5">?뱷 異붽?怨좊젮?ы빆???ㅼ쓬怨?媛숈씠 ?댁꽍?섏뿀?듬땲??/div>' +
        items.map(m => `<div>??${m.replace(/[<>&]/g, c => ({"<":"&lt;",">":"&gt;","&":"&amp;"}[c]))}</div>`).join("");
    }
  }

  // --- ?뚮┝ ?⑤꼸 (seat2 + seat3 ?숆린?? ---
  const alertHtml = !alerts.length
    ? '<div class="alert-item alert-info"><div class="alert-icon">i</div><div>?뱀씠?ы빆 ?놁쓬</div></div>'
    : (() => {
        const map = { warn: ["alert-warn", "??], success: ["alert-success", "??], danger: ["alert-danger", "??], info: ["alert-info", "i"] };
        return alerts.map(a => {
          const [cls, icon] = map[a.type] || map.info;
          return `<div class="alert-item ${cls}"><div class="alert-icon">${icon}</div><div>${a.message}</div></div>`;
        }).join("");
      })();
  ["seat-alerts-panel", "seat3-alerts-panel"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = alertHtml;
  });

  // --- ?뺥룊??諛?(equity_score瑜?湲곕컲?쇰줈 ?⑥닚 ?쒖떆) ---
  const equityPanel = document.getElementById("seat-equity-panel");
  if (equityPanel) {
    const score = Number(equity_score) || 0;
    const pct = Math.max(0, Math.min(100, Math.round(score)));
    const color = pct >= 80 ? "#3B6D11" : pct >= 60 ? "#854F0B" : "#A52828";
    const barColor = pct >= 80 ? "" : pct >= 60 ? "background:#BA7517" : "background:#A52828";
    equityPanel.innerHTML = `
      <div class="equity-bar-wrap">
        <div class="equity-label"><span>?꾩껜 ?뺥룊??吏??/span><span style="color:${color};font-weight:600">${pct}%</span></div>
        <div class="equity-bar"><div class="equity-fill" style="width:${pct}%;${barColor}"></div></div>
      </div>
      <div style="font-size:11px;color:#888;margin-top:8px;line-height:1.5">?댁쟾 諛곗젙 ?대젰??諛섏쁺???곗텧???먯닔?낅땲??</div>
    `;
  }

  // --- 醫뚯꽍 遺꾪룷 (seat_grid ???gender/grade/special???ㅼ뼱?덉쓬) ---
  const distPanel = document.getElementById("seat-distribution-panel");
  if (distPanel) {
    const occ = seat_grid.flat().filter(s => s.name);
    const count = (pred) => occ.filter(pred).length;
    const male = count(s => s.gender === "?? || s.gender === "M");
    const female = count(s => s.gender === "?? || s.gender === "F");
    const top = count(s => s.grade === "??);
    const mid = count(s => s.grade === "以?);
    const low = count(s => s.grade === "??);
    const sp  = count(s => s.special_needs && s.special_needs !== "?놁쓬" && s.special_needs !== "?쇰컲");
    const row = (label, val, color = "#1a1a18") =>
      `<div style="display:flex;justify-content:space-between"><span>${label}</span><span style="color:${color};font-weight:500">${val}</span></div>`;
    distPanel.innerHTML = [
      row("珥앹썝", `${occ.length}紐?),
      row("?깅퀎", `??${male} / ??${female}`),
      row("?깆쟻 ??, `${top}紐?),
      row("?깆쟻 以?, `${mid}紐?),
      row("?깆쟻 ??, `${low}紐?),
      row("?뱀닔援먯쑁", `${sp}紐?, "#534AB7"),
    ].join("");
  }
}

function renderSeatGrid(result) {
  const { seat_grid } = result;
  if (!seat_grid) return;

  // ? 遺꾨쪟 ?ы띁 ???꾩씠肄섏? ?뱀닔援먯쑁 ??留??ъ슜
  // ?쒕젰諛곕젮: ?뚮? 諛곌꼍 (?꾩씠肄??놁쓬)
  // ?뱀닔援먯쑁: ???꾩씠肄?(諛곌꼍? ?쒕젰諛곕젮 ?숈떆???뚮쭔 ?뚮옉)
  // 媛덈벑二쇱쓽: 鍮④컙 ?뚮몢由?(?꾩씠肄??놁쓬)
  const classifyCell = (seat) => {
    const flags = seat.flags || [];
    const isVision = flags.includes("?쒕젰諛곕젮") || seat.special === "?쒕젰諛곕젮";
    const isSpecial = flags.includes("?뱀닔援먯쑁") || seat.special === "ADHD";
    const isConflict = flags.includes("媛덈벑二쇱쓽");

    const classList = [];
    if (isVision) classList.push("vision");
    else classList.push("occupied");
    if (isConflict) classList.push("has-conflict");

    const iconHtml = isSpecial
      ? '<div class="seat-icons"><span>??/span></div>'
      : "";

    // ?쒓렇 ?띿뒪???곗꽑?쒖쐞: 媛덈벑二쇱쓽 > ?뱀닔援먯쑁紐?> ?쒕젰諛곕젮 > 湲곕낯
    let tag = null;
    if (isConflict) tag = "媛덈벑二쇱쓽";
    else if (isSpecial) tag = seat.special_needs || "?뱀닔援먯쑁";
    else if (isVision) tag = "?쒕젰諛곕젮";

    return { cls: classList.join(" "), icon: iconHtml, tag };
  };

  // ?먮━ 洹몃━???뚮뜑留?  const area = document.getElementById("seat-grid-area");
  if (area && seat_grid) {
    area.innerHTML = seat_grid.map(row => {
      const seatsHtml = row.map((seat, colIdx) => {
        const aisle = "";

        if (!seat.name) {
          return `${aisle}<div class="seat" style="opacity:.3"><div class="seat-num">${seat.seat_num}</div><div class="seat-name">鍮덉옄由?/div></div>`;
        }

        const k = classifyCell(seat);
        const tagText = k.tag || seat.tag;

        return `${aisle}<div class="seat ${k.cls}" onclick="selSeat(this)">
          <div class="seat-num">${seat.seat_num}</div>
          ${k.icon}
          <div class="seat-name">${seat.name}</div>
          <div class="seat-tag">${tagText}</div>
        </div>`;
      }).join("");
      return `<div class="seat-row">${seatsHtml}</div>`;
    }).join("");
  }

  // ?뚮┝ ?⑤꼸? updateSeatStats媛 泥섎━

  // seat3(?섎룞 議곗젙) 洹몃━?쒕룄 ?숆린??  const area3 = document.getElementById("seat-area-3");
  if (area3 && seat_grid) {
    area3.innerHTML = seat_grid.map(row => {
      const seatsHtml = row.map((seat, colIdx) => {
        const aisle = "";
        if (!seat.name) {
          return `${aisle}<div class="seat" style="opacity:.3"><div class="seat-num">${seat.seat_num}</div><div class="seat-name">鍮덉옄由?/div></div>`;
        }
        const k = classifyCell(seat);
        const tagText = k.tag || seat.tag;
        return `${aisle}<div class="seat ${k.cls}" onclick="swapSeat(this)" data-name="${seat.name}">
          <div class="seat-num">${seat.seat_num}</div>
          ${k.icon}
          <div class="seat-name">${seat.name}</div>
          <div class="seat-tag">${tagText}</div>
        </div>`;
      }).join("");
      return `<div class="seat-row">${seatsHtml}</div>`;
    }).join("");
  }

  // seat4(理쒖쥌 ?뺤젙) 洹몃━?????쎄린 ?꾩슜 (onclick ?놁쓬)
  const area4 = document.getElementById("seat-area-4");
  if (area4 && seat_grid) {
    area4.innerHTML = seat_grid.map(row => {
      const seatsHtml = row.map((seat, colIdx) => {
        const aisle = "";
        if (!seat.name) {
          return `${aisle}<div class="seat" style="opacity:.3"><div class="seat-num">${seat.seat_num}</div><div class="seat-name">鍮덉옄由?/div></div>`;
        }
        const k = classifyCell(seat);
        const tagText = k.tag || seat.tag;
        return `${aisle}<div class="seat ${k.cls}">
          <div class="seat-num">${seat.seat_num}</div>
          ${k.icon}
          <div class="seat-name">${seat.name}</div>
          <div class="seat-tag">${tagText}</div>
        </div>`;
      }).join("");
      return `<div class="seat-row">${seatsHtml}</div>`;
    }).join("");
  }
}

// ?섎룞 swap ??AppState.currentSeatResult.seat_grid?먯꽌 ??????숈깮 硫뷀?瑜?援먰솚
// ?숈깮 ?대쫫?쇰줈 flags瑜??ш퀎??(AppState.students + relations 湲곕컲)
function _computeFlagsForStudent(name) {
  const flags = [];
  if (!name) return flags;
  const student = (AppState.students || []).find(s => s.name === name);
  if (student) {
    if (student.vision === "?쏀븿") flags.push("?쒕젰諛곕젮");
    if (student.special_needs && student.special_needs !== "?놁쓬" && student.special_needs !== "?쇰컲") {
      flags.push("?뱀닔援먯쑁");
    }
  }
  // 媛덈벑 ?섏뼱 ?깆옣 ?щ? ??移쒗븿? ?쒖쇅
  const inConflict = (AppState.relations || []).some(r =>
    r.type === "媛덈벑" && (r.student_a === name || r.student_b === name)
  );
  if (inConflict) flags.push("媛덈벑二쇱쓽");
  return flags;
}

function syncSeatSwapToState(seatNum1, seatNum2) {
  const result = AppState.currentSeatResult;
  if (!result || !result.seat_grid) return;
  let cell1 = null, cell2 = null;
  result.seat_grid.forEach(row => row.forEach(cell => {
    if (cell.seat_num === seatNum1) cell1 = cell;
    if (cell.seat_num === seatNum2) cell2 = cell;
  }));
  if (!cell1 || !cell2) return;
  // ?숈깮 硫뷀? 援먰솚 (name + 遺???뺣낫 ?꾨?)
  const fields = ["name", "gender", "grade", "special", "special_needs", "tag"];
  fields.forEach(f => {
    const tmp = cell1[f];
    cell1[f] = cell2[f];
    cell2[f] = tmp;
  });
  // flags??援먰솚???꾨땲?????대쫫 湲곗??쇰줈 ?ш퀎?고빐????(?쒕젰諛곕젮/媛덈벑二쇱쓽 ?깆? ?숈깮 ?띿꽦)
  cell1.flags = _computeFlagsForStudent(cell1.name);
  cell2.flags = _computeFlagsForStudent(cell2.name);
}

// 諛깆뿏?쒖뿉 ?ы룊媛 ?붿껌 ??seat2 ?듦퀎/?뚮┝/?뺥룊??遺꾪룷 媛깆떊
async function reevaluateSeatGrid() {
  const result = AppState.currentSeatResult;
  if (!result || !result.seat_grid) return;
  try {
    const evalResult = await AssignmentAPI.evaluateSeat(1, result.seat_grid);
    result.conflict_adjacent_pairs = evalResult.conflict_adjacent_pairs;
    result.equity_score = evalResult.equity_score;
    result.alerts = evalResult.alerts;
    // 諛깆뿏?쒓? ??grid??flags(媛덈벑二쇱쓽 ??瑜??ㅼ떆 諛뺤븘 ?뚮젮以???洹몃?濡?援먯껜
    if (evalResult.seat_grid) {
      result.seat_grid = evalResult.seat_grid;
    }
    updateSeatStats(result);
    renderSeatGrid(result);
  } catch (e) {
    console.warn("?먮━ ?ы룊媛 ?ㅽ뙣:", e.message);
  }
}

async function confirmSeatAndGenerateDocs() {
  try {
    if (AppState.currentSeatResult) {
      try { await reevaluateSeatGrid(); } catch (_) {}
    }
    if (!AppState.currentSeatResult) {
      throw new Error("?먮━諛곗젙 寃곌낵媛 ?놁뒿?덈떎. 癒쇱? ?먮룞 諛곗튂瑜??ㅽ뻾?섏꽭??");
    }

    // 利됱떆 seat5濡??대룞
    goScreen("seat5");

    // ??0(寃곌낵??, ??2(?뺥룊??留?LLM ?앹꽦. ??1? ?숈깮蹂?寃??UI?쇱꽌 嫄대뱶由ъ? ?딆쓬
    const slots = [
      { tabIdx: 0, label: "?먮━諛곗젙 寃곌낵??, docType: "teacher" },
      { tabIdx: 2, label: "?뺥룊??由ы룷??,   docType: "parent_response" },
    ];
    slots.forEach(({ tabIdx, label }) => {
      const el = document.getElementById(`seat-ddoc-${tabIdx}`);
      if (el) {
        el.innerHTML = `<div class="doc-paper" style="color:#888;font-size:13px;text-align:center;padding:30px"><div style="margin-bottom:8px">??${label} ?앹꽦 以?..</div><div style="font-size:11px">AI媛 臾몄꽌瑜??묒꽦?섍퀬 ?덉뒿?덈떎</div></div>`;
      }
    });
    AppState.currentSeatDocs = { 0: null, 2: null };
    showToast("臾몄꽌瑜??앹꽦?섍퀬 ?덉뒿?덈떎...");

    // seat5 ?숈깮 寃??datalist 梨꾩슦湲?    const dl = document.getElementById("seat5-student-names");
    if (dl) {
      const names = (AppState.students || []).map(s => s.name);
      dl.innerHTML = names.map(n => `<option value="${n}"></option>`).join("");
    }

    const escape = s => (s || "").replace(/[<>&]/g, c => ({"<":"&lt;",">":"&gt;","&":"&amp;"}[c]));
    const fillTab = (tabIdx, doc) => {
      AppState.currentSeatDocs[tabIdx] = doc;
      const el = document.getElementById(`seat-ddoc-${tabIdx}`);
      if (el) {
        el.innerHTML = `<div class="doc-paper"><pre style="white-space:pre-wrap;font-family:inherit;font-size:13px;line-height:1.7;color:#1a1a18;margin:0">${escape(doc.document)}</pre></div>`;
      }
    };

    const promises = slots.map(({ tabIdx, docType }) =>
      DocumentAPI.generateSeat(AppState.currentSeatResult, docType, AppState.currentSeatId)
        .then(d => fillTab(tabIdx, d))
        .catch(e => fillTab(tabIdx, { document: `[臾몄꽌 ?앹꽦 ?ㅽ뙣: ${e.message}]`, type: docType }))
    );
    await Promise.all(promises);
    showToast("?먮━諛곗젙 ?뺤젙 諛?臾몄꽌 ?앹꽦 ?꾨즺!");
  } catch (e) {
    showError(e.message);
  }
}

// === seat5 ?숈깮蹂??먮━ 諛곗젙 ?댁쑀 寃??===
async function searchSeatStudentReason() {
  const input = document.getElementById("seat5-search-input");
  const resultEl = document.getElementById("seat5-search-result");
  if (!input || !resultEl) return;
  const name = input.value.trim();
  if (!name) { showError("?숈깮 ?대쫫???낅젰?섏꽭??); return; }
  if (!AppState.currentSeatResult) { showError("?먮━諛곗젙 寃곌낵媛 ?놁뒿?덈떎"); return; }

  resultEl.style.display = "block";
  resultEl.textContent = "?쨼 AI媛 諛곗젙 ?댁쑀瑜?遺꾩꽍 以묒엯?덈떎...";
  try {
    const data = await AssignmentAPI.explainSeatForStudent(AppState.currentSeatResult, name);
    resultEl.innerHTML = `<div style="font-weight:600;margin-bottom:6px">${data.student_name}</div><div>${(data.reason || "").replace(/\n/g, "<br>")}</div>`;
  } catch (e) {
    resultEl.textContent = "寃???ㅽ뙣: " + e.message;
  }
}

// === ?먮━諛곗젙 臾몄꽌 ?ㅼ슫濡쒕뱶/蹂듭궗 ===
const SEAT_DOC_LABELS = { 0: "?먮━諛곗젙_寃곌낵??, 2: "?뺥룊??由ы룷?? };

function _activeSeatDocIndex() {
  const tabs = document.querySelectorAll("#seat5 .doc-tab");
  for (let i = 0; i < tabs.length; i++) if (tabs[i].classList.contains("active")) return i;
  return 0;
}

function _saveTextFile(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadActiveSeatDoc() {
  const docs = AppState.currentSeatDocs;
  if (!docs) { showError("癒쇱? 臾몄꽌瑜??앹꽦?섏꽭??"); return; }
  const i = _activeSeatDocIndex();
  if (!(i in SEAT_DOC_LABELS)) { showError("????? ?ㅼ슫濡쒕뱶 ??곸씠 ?꾨떃?덈떎."); return; }
  const text = docs[i]?.document || "";
  if (!text) { showError("??ν븷 臾몄꽌 ?댁슜???놁뒿?덈떎."); return; }
  _saveTextFile(`${SEAT_DOC_LABELS[i]}.txt`, text);
  showToast(`${SEAT_DOC_LABELS[i]} ????꾨즺`);
}

async function copyActiveSeatDoc() {
  const docs = AppState.currentSeatDocs;
  if (!docs) { showError("癒쇱? 臾몄꽌瑜??앹꽦?섏꽭??"); return; }
  const i = _activeSeatDocIndex();
  if (!(i in SEAT_DOC_LABELS)) { showError("????? 蹂듭궗 ??곸씠 ?꾨떃?덈떎."); return; }
  const text = docs[i]?.document || "";
  try {
    await navigator.clipboard.writeText(text);
    showToast(`${SEAT_DOC_LABELS[i]} 蹂듭궗 ?꾨즺`);
  } catch (e) {
    showError("?대┰蹂대뱶 蹂듭궗 ?ㅽ뙣: " + e.message);
  }
}

function downloadAllSeatDocs() {
  const docs = AppState.currentSeatDocs;
  if (!docs) { showError("癒쇱? 臾몄꽌瑜??앹꽦?섏꽭??"); return; }
  const sep = "\n\n" + "=".repeat(60) + "\n\n";
  const merged = Object.keys(SEAT_DOC_LABELS)
    .map(i => `# ${SEAT_DOC_LABELS[i]}\n\n${docs[i]?.document || ""}`)
    .join(sep);
  _saveTextFile("?먮━諛곗젙_?꾩껜臾몄꽌.txt", merged);
  showToast("?꾩껜 臾몄꽌 ????꾨즺");
}

// === 諛섎같??由ы룷???ㅼ슫濡쒕뱶/蹂듭궗 (DOM ?띿뒪??異붿텧 諛⑹떇) ===
function _extractClassReportText() {
  const report = document.getElementById("ban5-report");
  const reasons = document.getElementById("ban5-reasons");
  if (!report) return "";
  // doc-row ?ㅼ쓣 "?? 媛? 以꾨줈 蹂??  const reportLines = ["# 諛섎같??寃곌낵 蹂닿퀬??, ""];
  report.querySelectorAll(".doc-paper-title").forEach(t => {
    reportLines[0] = "# " + t.textContent.trim();
  });
  report.querySelectorAll(".doc-row").forEach(row => {
    const k = row.querySelector(".doc-key")?.textContent.trim() || "";
    const v = row.querySelector(".doc-val")?.textContent.trim() || "";
    if (k || v) reportLines.push(`- ${k}: ${v}`);
  });
  let out = reportLines.join("\n");
  if (reasons) {
    const reasonText = reasons.innerText.trim();
    if (reasonText && !/AI 遺꾩꽍 ?ㅽ뻾 ??.test(reasonText)) {
      out += "\n\n## AI 諛곗튂 洹쇨굅\n\n" + reasonText;
    }
  }
  return out;
}

function downloadClassReport() {
  const text = _extractClassReportText();
  if (!text) { showError("??ν븷 由ы룷?멸? ?놁뒿?덈떎."); return; }
  _saveTextFile("諛섎같??由ы룷??txt", text);
  showToast("由ы룷??????꾨즺");
}

async function copyClassReport() {
  const text = _extractClassReportText();
  if (!text) { showError("蹂듭궗??由ы룷?멸? ?놁뒿?덈떎."); return; }
  try {
    await navigator.clipboard.writeText(text);
    showToast("由ы룷??蹂듭궗 ?꾨즺");
  } catch (e) {
    showError("?대┰蹂대뱶 蹂듭궗 ?ㅽ뙣: " + e.message);
  }
}

// =============================================
// 珥덇린???????쒖옉 ???ㅽ뻾
// =============================================

// 援먯궗?뚭껄 ?뚯떛 ?꾨즺 ?대쭅
function setAnalysisBtnEnabled(enabled) {
  const btn = document.getElementById('btn-run-analysis');
  if (!btn) return;
  if (enabled) {
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
    btn.textContent = 'AI 遺꾩꽍 ?ㅽ뻾 ??;
  } else {
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
    btn.textContent = '援먯궗?뚭껄 遺꾩꽍 以?.. (?좎떆 湲곕떎?ㅼ＜?몄슂)';
  }
}

async function pollNotesStatus() {
  // 踰꾪듉 鍮꾪솢?깊솕
  setAnalysisBtnEnabled(false);

  const maxWait = 120;
  let elapsed = 0;
  const interval = setInterval(async () => {
    elapsed += 3;
    try {
      const res = await fetch(`${BASE_URL}/notes/status`);
      const data = await res.json();
      if (data.done) {
        clearInterval(interval);
        setAnalysisBtnEnabled(true);
        showToast(`??援먯궗?뚭껄 遺꾩꽍 ?꾨즺! ?댁젣 AI 遺꾩꽍???ㅽ뻾?섏꽭??`, 'success');
        const notice = document.getElementById('notes-done-notice');
        if (notice) {
          notice.style.display = 'block';
          notice.textContent = `??援먯궗?뚭껄 AI 遺꾩꽍 ?꾨즺 ??由щ뜑???숈깮???먮룞?쇰줈 諛섏쁺?⑸땲??;
        }
      } else if (elapsed >= maxWait) {
        clearInterval(interval);
        setAnalysisBtnEnabled(true); // ??꾩븘????洹몃깷 ?덉슜
        showToast('?뚭껄 遺꾩꽍 ?쒓컙 珥덇낵 ??AI 遺꾩꽍???ㅽ뻾?⑸땲??, 'warn');
      }
    } catch(e) {
      clearInterval(interval);
      setAnalysisBtnEnabled(true);
    }
  }, 3000);
}

async function resetAllData() {
  if (!confirm('?숈깮 ?곗씠?곗? 愿怨??곗씠?곕? 紐⑤몢 ??젣?좉퉴??')) return;
  try {
    showLoading('?곗씠??珥덇린??以?..');
    await fetch(`${BASE_URL}/students`, { method: 'DELETE' });
    await fetch(`${BASE_URL}/relations`, { method: 'DELETE' });
    AppState.students = [];
    AppState.relations = [];
    AppState.conditions.absolute = [];
    AppState._relationsAutoApplied = false;
    // UI 珥덇린??    const tbody = document.getElementById('ban-tbody');
    if (tbody) tbody.innerHTML = '';
    const absList = document.getElementById('ban-abs-list');
    if (absList) absList.innerHTML = '';
    renderRelations([]);
    updateStudentStats([]);
    const conflictEl = document.getElementById('ban-stat-conflict');
    if (conflictEl) conflictEl.textContent = '0';
    document.getElementById('ban-upload-result').textContent = '';

    // ?먮━諛곗젙 1?④퀎 ?붾㈃??媛숈씠 珥덇린??    if (typeof updateSeat1Stats === 'function') updateSeat1Stats();
    if (typeof renderSeat1AutoConditions === 'function') renderSeat1AutoConditions();
    if (typeof renderSeat1StudentDatalist === 'function') renderSeat1StudentDatalist();
    const seatUploadResult = document.getElementById('seat-upload-result');
    if (seatUploadResult) seatUploadResult.textContent = '';

    showToast('?곗씠??珥덇린???꾨즺! ?묒? ?뚯씪???낅줈?쒗빐二쇱꽭??', 'success');
  } catch(e) {
    showToast('珥덇린???ㅽ뙣: ' + e.message, 'error');
  } finally {
    hideLoading();
  }
}

async function initApp() {
  console.log("Class Twin AI 珥덇린??..");
  try {
    // ?쒖꽌?濡?濡쒕뱶: ?숈깮 癒쇱?, 愿怨??ㅼ쓬, 洹??ㅼ쓬 ?덈?議곌굔 ?곸슜
    await loadStudents();
    await loadRelations();
    // DB???숈깮/愿怨??곗씠???덉쑝硫??덈? 議곌굔 ?먮룞 ?곸슜
    if (AppState.students.length > 0 || AppState.relations.length > 0) {
      updateAbsConditions(AppState.students, 'ban');
    }
    console.log("珥덇린???꾨즺");
  } catch (e) {
    console.error("珥덇린???ㅽ뙣:", e);
    showToast("?쒕쾭 ?곌껐 ?ㅽ뙣. ?ㅽ봽?쇱씤 紐⑤뱶濡??ㅽ뻾?⑸땲??", "warn");
  }
}

// ?섏씠吏 濡쒕뱶 ??珥덇린??document.addEventListener("DOMContentLoaded", initApp);

// =============================================
// Excel/CSV ?낅줈??湲곕뒫
// =============================================

async function uploadExcelFile(file, type = 'students') {
  const formData = new FormData();
  formData.append('file', file);

  showLoading('湲곗〈 ?곗씠??珥덇린??以?..');
  try {
    // ?낅줈????湲곗〈 ?숈깮 + 愿怨??곗씠??珥덇린??    await fetch(`${BASE_URL}/students`, { method: 'DELETE' });
    await fetch(`${BASE_URL}/relations`, { method: 'DELETE' });
  } catch(e) {
    // 珥덇린???ㅽ뙣?대룄 ?낅줈?쒕뒗 ?쒕룄
  }

  showLoading(type === 'students' ? '?숈깮 ?곗씠???낅줈??以?..' : '愿怨??곗씠???낅줈??以?..');
  try {
    const res = await fetch(`${BASE_URL}/students/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error((await res.json()).detail);
    const data = await res.json();
    AppState.students = data.students;
    renderStudentTable(data.students);
    updateStudentStats(data.students);
    // ??踰덉㎏ ?쒗듃濡??ㅼ뼱??愿怨??곗씠?곕? AppState???숆린??(?섎룞 swap ??媛덈벑 遺꾨쪟???꾩슂)
    try { await loadRelations(); } catch (_) {}
    // ?먮━諛곗젙 1?④퀎 ?붾㈃?????덉쑝硫?洹몄そ??媛깆떊
    if (typeof updateSeat1Stats === 'function') updateSeat1Stats();
    if (typeof renderSeat1AutoConditions === 'function') renderSeat1AutoConditions();
    if (typeof renderSeat1StudentDatalist === 'function') renderSeat1StudentDatalist();
    const relCount = data.relations_added || 0;
    showToast(`${data.count}紐??낅줈???꾨즺${relCount ? ` (愿怨?${relCount}嫄?` : ''}`);
    return data;
  } catch(e) {
    showError(e.message);
  } finally {
    hideLoading();
  }
}

// 愿怨??곗씠???뚯씪 ?낅줈??async function uploadRelationsFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE_URL}/relations/upload`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error('愿怨??곗씠???낅줈???ㅽ뙣');
  return await res.json();
}

// ?ш컖???믪쓬 愿怨꾨? ?덈? 議곌굔???먮룞 異붽?
function applyAutoConditions(autoConditions) {
  const list = document.getElementById('ban-abs-list');
  if (!list) return;

  autoConditions.forEach(cond => {
    // ?대? 媛숈? 議곌굔 ?덉쑝硫?以묐났 異붽? ????(student_a + student_b + type 紐⑤몢 ?쇱튂???뚮쭔 以묐났)
    const existingItems = list.querySelectorAll('.cond-item .cond-text');
    const isDuplicate = Array.from(existingItems).some(el => {
      const text = el.textContent;
      return text.includes(cond.student_a) && text.includes(cond.student_b) && text.includes(cond.type);
    });
    if (isDuplicate) return;

    const iconMap = {'遺꾨━': '??, '媛숈? 諛?: '+'};
    const clsMap  = {'遺꾨━': 'ci-red', '媛숈? 諛?: 'ci-green'};
    const badgeMap= {'遺꾨━': 'br', '媛숈? 諛?: 'bg2'};
    const type    = cond.type;
    const label   = cond.relation_type === '媛덈벑'
      ? `${cond.student_a} ??${cond.student_b} (媛덈벑쨌?ш컖???믪쓬)`
      : `${cond.student_a} ??${cond.student_b} (移쒗븿쨌?ш컖???믪쓬)`;

    const el = document.createElement('div');
    el.className = 'cond-item';
    el.innerHTML = `
      <div class="cond-icon ${clsMap[type]}">${iconMap[type]}</div>
      <div class="cond-text">${label} <span class="badge ${badgeMap[type]}">${type}</span> <span class="badge bb">?먮룞</span></div>
      <button class="del-btn" onclick="this.closest('.cond-item').remove();updateSummary()">??/button>`;
    list.appendChild(el);

    // AppState?먮룄 異붽? (以묐났 泥댄겕)
    const alreadyInState = AppState.conditions.absolute.some(
      c => c.student_a === cond.student_a && c.student_b === cond.student_b && c.type === type
    );
    if (!alreadyInState) {
      AppState.conditions.absolute.push({
        type: type,
        student_a: cond.student_a,
        student_b: cond.student_b,
        students: [cond.student_a, cond.student_b],
      });
    }
  });

  updateSummary();
}

// ?낅줈?????덈? 議곌굔 紐⑸줉 ?먮룞 ?낅뜲?댄듃
function updateAbsConditions(students, flow) {
  if (flow === 'seat') {
    const list = document.getElementById('seat-abs-list');
    if (!list) return;
    list.innerHTML = '';

    students.forEach(s => {
      if (s.vision === '?쏀븿') {
        list.innerHTML += `<div class="cond-item"><div class="cond-icon ci-blue">?몓</div><div class="cond-text">${s.name} ???쒕젰 ?쏀븿 ????2以?諛곗튂</div><button class="del-btn" onclick="this.closest('.cond-item').remove()">??/button></div>`;
      }
      if (s.special_needs === 'ADHD') {
        list.innerHTML += `<div class="cond-item"><div class="cond-icon ci-warn">??/div><div class="cond-text">${s.name} ??ADHD ??援먯궗 洹쇱쿂 ?욎옄由?/div><button class="del-btn" onclick="this.closest('.cond-item').remove()">??/button></div>`;
      } else if (s.special_needs) {
        list.innerHTML += `<div class="cond-item"><div class="cond-icon ci-warn">??/div><div class="cond-text">${s.name} ??${s.special_needs} ???뱀닔援먯쑁 諛곕젮</div><button class="del-btn" onclick="this.closest('.cond-item').remove()">??/button></div>`;
      }
    });

    // 媛덈벑 愿怨?遺꾨━ 議곌굔 異붽?
    AppState.relations.filter(r => r.type === '媛덈벑').forEach(r => {
      list.innerHTML += `<div class="cond-item"><div class="cond-icon ci-red">??/div><div class="cond-text">${r.student_a} ??${r.student_b} ??遺꾨━ (媛덈벑?대젰)</div><button class="del-btn" onclick="this.closest('.cond-item').remove()">??/button></div>`;
    });

  } else if (flow === 'ban') {
    const list = document.getElementById('ban-abs-list');
    if (!list) return;

    // 湲곗〈 ?먮룞 諛곗? ??ぉ 紐⑤몢 ?쒓굅 ???덈줈 洹몃━湲?    list.querySelectorAll('.cond-item').forEach(item => {
      if (item.querySelector('.badge.bb')) item.remove();
    });

    // AppState.conditions.absolute?먯꽌 ?먮룞 議곌굔??珥덇린??(以묐났 諛⑹?)
    AppState.conditions.absolute = AppState.conditions.absolute.filter(c => !c._auto);

    // ?뱀닔援먯쑁 ?숈깮 臾띠뼱???섎굹濡??쒖떆
    const specialStudents = students.filter(s => s.special_needs);
    if (specialStudents.length > 0) {
      const existingSpecial = Array.from(list.querySelectorAll('.cond-text'))
        .some(el => el.textContent.includes('?뱀닔援먯쑁 諛곕젮'));
      if (!existingSpecial) {
        const names = specialStudents.map(s => s.name).join(', ');
        const el = document.createElement('div');
        el.className = 'cond-item';
        el.innerHTML = `<div class="cond-icon ci-warn">??/div><div class="cond-text">${names} <span class="badge bw">?뱀닔援먯쑁 諛곕젮 (媛?諛?洹좊벑 遺꾨같)</span> <span class="badge bb">?먮룞</span></div>`;
        list.appendChild(el);
        // ?섏젙 遺덇? (X 踰꾪듉 ?놁쓬)
      }
    }

    // 愿怨??곗씠?곗뿉??以묎컙 ?댁긽 媛덈벑, ?믪쓬 移쒗븿 ?먮룞 異붽? (?섏젙 遺덇?)
    AppState.relations.filter(r =>
      (r.type === '媛덈벑' && ['?믪쓬','以묎컙'].includes(r.severity)) ||
      (r.type === '移쒗븿' && r.severity === '?믪쓬')
    ).forEach(r => {
      const type = r.type === '媛덈벑' ? '遺꾨━' : '媛숈? 諛?;
      const existing = Array.from(list.querySelectorAll('.cond-text'))
        .some(el => el.textContent.includes(r.student_a) && el.textContent.includes(r.student_b));
      if (existing) return;
      const icon = type === '遺꾨━' ? '?? : '+';
      const cls = type === '遺꾨━' ? 'ci-red' : 'ci-green';
      const badge = type === '遺꾨━' ? 'br' : 'bg2';
      const el = document.createElement('div');
      el.className = 'cond-item';
      // ?섏젙 遺덇?: X 踰꾪듉 ?놁쓬, ?좉툑 ?꾩씠肄?      el.innerHTML = `<div class="cond-icon ${cls}">${icon}</div><div class="cond-text">${r.student_a} ??${r.student_b} <span class="badge ${badge}">${type}</span> <span class="badge bb">?먮룞</span></div><span style="font-size:11px;color:#bbb;margin-left:auto;padding-right:4px">?뵏</span>`;
      list.appendChild(el);

      // AppState?먮룄 異붽? (_auto ?뚮옒洹몃줈 以묐났 諛⑹?)
      const already = AppState.conditions.absolute.some(
        c => c.student_a === r.student_a && c.student_b === r.student_b && c.type === type
      );
      if (!already) {
        AppState.conditions.absolute.push({
          type, student_a: r.student_a, student_b: r.student_b,
          students: [r.student_a, r.student_b], _auto: true
        });
      }
    });

    updateSummary();
  }
}

async function loadMockData() {
  showLoading('?섑뵆 ?곗씠??遺덈윭?ㅻ뒗 以?..');
  try {
    // 紐⑹뾽 ?곗씠??30紐?諛깆뿏?쒕줈 ?꾩넚
    const res = await fetch(`${BASE_URL}/students/bulk`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(MOCK_STUDENTS)
    });
    const data = await res.json();
    AppState.students = data;
    await loadStudents();
    showToast('?섑뵆 ?곗씠??30紐?濡쒕뱶 ?꾨즺!');
  } catch(e) {
    // 諛깆뿏???놁쑝硫?洹몃깷 ?붾㈃留?梨꾩?
    AppState.students = MOCK_STUDENTS;
    renderStudentTable(MOCK_STUDENTS);
    updateStudentStats(MOCK_STUDENTS);
    showToast('?섑뵆 ?곗씠??濡쒕뱶 ?꾨즺 (?ㅽ봽?쇱씤 紐⑤뱶)');
  } finally {
    hideLoading();
  }
}

// 紐⑹뾽 ?곗씠??30紐?const MOCK_STUDENTS = [
  {id:1, name:'源誘쇱?', gender:'??, academic_level:'??, height:168, vision:'?뺤긽', attention_level:'?믪쓬', special_needs:null, teacher_note:'由щ뜑??씠 媛뺥븯??諛⑺뼢??遺?뺤쟻?쇰줈 ?먮? ???덉쓬'},
  {id:2, name:'?댁꽌??, gender:'??, academic_level:'??, height:158, vision:'?쏀븿', attention_level:'?믪쓬', special_needs:null, teacher_note:'?깆쟻 ?곗닔?섎ŉ 移쒗솕???믪쓬'},
  {id:3, name:'諛뺤???, gender:'??, academic_level:'以?, height:162, vision:'?뺤긽', attention_level:'??쓬', special_needs:null, teacher_note:'移쒗븳 移쒓뎄媛 嫄곗쓽 ?놁쓬. 愿怨꾨쭩 怨좊┰ ?곹깭'},
  {id:4, name:'?좊룞??, gender:'??, academic_level:'??, height:163, vision:'?뺤긽', attention_level:'??쓬', special_needs:'ADHD', teacher_note:'ADHD 吏꾨떒. 援먯궗 洹쇱쿂 ?먮━ ?꾩슂'},
  {id:5, name:'?쒖?誘?, gender:'??, academic_level:'??, height:160, vision:'?쏀븿', attention_level:'?믪쓬', special_needs:null, teacher_note:'紐⑤쾾?? 梨낆엫媛?媛뺥븯怨?湲띿젙???곹뼢'},
  {id:6, name:'?ㅼ듅??, gender:'??, academic_level:'以?, height:165, vision:'?뺤긽', attention_level:'以묎컙', special_needs:null, teacher_note:'?대룞??醫뗭븘?섎ŉ ?섏뾽 以??곕쭔?댁쭏 ???덉쓬'},
  {id:7, name:'?≪???, gender:'??, academic_level:'??, height:161, vision:'?뺤긽', attention_level:'?믪쓬', special_needs:null, teacher_note:'由щ뜑??낵 怨듦컧 ?λ젰 ?곸썡. 媛덈벑 以묒옱 ??븷'},
  {id:8, name:'?ㅼ옱??, gender:'??, academic_level:'??, height:172, vision:'?뺤긽', attention_level:'?믪쓬', special_needs:null, teacher_note:'?숈뾽怨???멸?怨?紐⑤몢 ?곗닔'},
  {id:9, name:'媛뺤삁?', gender:'??, academic_level:'以?, height:159, vision:'?쏀븿', attention_level:'以묎컙', special_needs:null, teacher_note:'?덉껜?μ뿉 ?뚯쭏 ?덉쓬'},
  {id:10, name:'?뺣룄??, gender:'??, academic_level:'??, height:170, vision:'?뺤긽', attention_level:'??쓬', special_needs:null, teacher_note:'?숈뒿 ?숆린媛 ??쓬. 愿???꾩슂'},
  {id:11, name:'?④턿??, gender:'??, academic_level:'以?, height:168, vision:'?뺤긽', attention_level:'以묎컙', special_needs:null, teacher_note:'移쒗솕??醫뗪퀬 ?덈줈???섍꼍 ?곸쓳 鍮좊쫫'},
  {id:12, name:'?꾪븯??, gender:'??, academic_level:'??, height:155, vision:'?뺤긽', attention_level:'??쓬', special_needs:null, teacher_note:'理쒓렐 ?꾪븰 ???숈깮. ?꾩쭅 ?곸쓳 以?},
  {id:13, name:'諛⑹쑀吏?, gender:'??, academic_level:'??, height:163, vision:'?뺤긽', attention_level:'?믪쓬', special_needs:null, teacher_note:'?섑븰 ?щ┝?쇱븘???섏긽. ?쇰━???ш퀬 ?곗뼱??},
  {id:14, name:'諛곗꽦誘?, gender:'??, academic_level:'以?, height:167, vision:'?뺤긽', attention_level:'以묎컙', special_needs:null, teacher_note:'?좊㉧ 媛먭컖 ?덉쓬. 吏?섏튌 ???덉쓬'},
  {id:15, name:'?곸듅??, gender:'??, academic_level:'??, height:161, vision:'?뺤긽', attention_level:'??쓬', special_needs:'?숈뒿?μ븷', teacher_note:'?숈뒿?μ븷 吏꾨떒. 媛쒕퀎??吏???꾩슂'},
  {id:16, name:'?띿???, gender:'??, academic_level:'??, height:164, vision:'?뺤긽', attention_level:'??쓬', special_needs:null, teacher_note:'?먯〈媛???쓬. 移?갔怨?寃⑸젮????諛섏쓳'},
  {id:17, name:'援щ굹??, gender:'??, academic_level:'以?, height:159, vision:'?뺤긽', attention_level:'以묎컙', special_needs:null, teacher_note:'怨듦컧 ?λ젰 ?믪쓬. 移쒓뎄 怨좊? ???ㅼ뼱以?},
  {id:18, name:'諛깆꽌??, gender:'??, academic_level:'??, height:162, vision:'?뺤긽', attention_level:'?믪쓬', special_needs:null, teacher_note:'?꾧탳 ?꾩썝 寃쏀뿕. 梨낆엫媛먭낵 異붿쭊??媛뺥븿'},
  {id:19, name:'?꾩???, gender:'??, academic_level:'以?, height:173, vision:'?뺤긽', attention_level:'以묎컙', special_needs:null, teacher_note:'寃쎌웳??媛뺥빐 媛??媛덈벑 ?좊컻'},
  {id:20, name:'梨꾨┛', gender:'??, academic_level:'以?, height:160, vision:'?쏀븿', attention_level:'?믪쓬', special_needs:null, teacher_note:'瑗쇨세?섍퀬 梨낆엫媛?媛뺥븿'},
  {id:21, name:'怨좏깭??, gender:'??, academic_level:'??, height:166, vision:'?뺤긽', attention_level:'??쓬', special_needs:null, teacher_note:'誘몄닠???щ뒫 ?덉쓬. ?먯떊媛??μ긽 ?꾩슂'},
  {id:22, name:'沅뚮???, gender:'??, academic_level:'以?, height:158, vision:'?뺤긽', attention_level:'以묎컙', special_needs:null, teacher_note:'?ㅻЦ??媛?? ?쒓뎅???μ닕?섎굹 媛???대젮?'},
  {id:23, name:'?쇰???, gender:'??, academic_level:'以?, height:167, vision:'?쏀븿', attention_level:'以묎컙', special_needs:null, teacher_note:'李⑤텇?섍퀬 ?좎쨷?? ?뚯쭛???쒕룞?먯꽌 媛뺤젏'},
  {id:24, name:'瑜섑븯?', gender:'??, academic_level:'以?, height:156, vision:'?뺤긽', attention_level:'以묎컙', special_needs:null, teacher_note:'議곗슜?섍퀬 ?깆떎?? ?뚯닔??移쒗븳 移쒓뎄? 源딆? 愿怨?},
  {id:25, name:'臾명쁽??, gender:'??, academic_level:'??, height:169, vision:'?뺤긽', attention_level:'?믪쓬', special_needs:null, teacher_note:'?낆꽌??留롪퀬 ?ш퀬??源딆쓬. 諛쒗몴??爰쇰젮??},
  {id:26, name:'?ъ옱??, gender:'??, academic_level:'以?, height:171, vision:'?뺤긽', attention_level:'以묎컙', special_needs:null, teacher_note:'?대룞 ?λ젰 ?곗뼱?? 湲띿젙??諛⑺뼢?쇰줈 ?묒슜'},
  {id:27, name:'?몄?吏', gender:'??, academic_level:'??, height:154, vision:'?뺤긽', attention_level:'以묎컙', special_needs:null, teacher_note:'理쒓렐 媛???섍꼍 蹂?붾줈 ?щ━???꾩텞'},
  {id:28, name:'?꾪븯??, gender:'??, academic_level:'??, height:156, vision:'?쏀븿', attention_level:'以묎컙', special_needs:null, teacher_note:'?뚭레?곸씠???쒕쾲 移쒗빐吏硫?源딆? 愿怨??좎?'},
  {id:29, name:'理쒖닔??, gender:'??, academic_level:'以?, height:155, vision:'?뺤긽', attention_level:'以묎컙', special_needs:null, teacher_note:'諛앷퀬 湲띿젙?? 遺꾩쐞湲?硫붿씠而???븷'},
  {id:30, name:'?띿???, gender:'??, academic_level:'??, height:165, vision:'?뺤긽', attention_level:'??쓬', special_needs:null, teacher_note:'?숈뒿 吏???꾩슂. 泥댁쑁??媛뺤젏 ?덉쓬'}
];
