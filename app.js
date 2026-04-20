import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
// 🌟 update 함수가 새롭게 추가되었습니다.
import { getDatabase, ref, push, update, onValue, remove, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ⚠️ 본인의 파이어베이스 설정값으로 다시 덮어씌워 주세요!
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "sj-6-9da52.firebaseapp.com",
  databaseURL: "https://sj-6-9da52-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sj-6-9da52",
  storageBucket: "sj-6-9da52.firebasestorage.app",
  messagingSenderId: "295498330859",
  appId: "1:295498330859:web:aceb14b8593a0549c784ae"
};

try {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);

    // 수정을 위한 상태 저장 변수
    let editingId = { schedule: null, notice: null };
    let currentData = { schedule: {}, notice: {} };

    // 🌟 1. 날짜 가독성 개선 함수 (YYYY-MM-DD -> YYYY년 M월 D일)
    function formatDateKorean(dateString) {
        if (!dateString) return "";
        const [year, month, day] = dateString.split('-');
        return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`; // parseInt로 '04월'을 '4월'로 변경
    }

    // 🌟 글자 크기 자동 조절 함수 (기존과 동일)
    function autoResizeText(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        let currentSize = 16;
        container.style.fontSize = currentSize + 'px';
        while (container.scrollHeight > container.offsetHeight && currentSize > 11) {
            currentSize -= 0.5;
            container.style.fontSize = currentSize + 'px';
        }
    }

    // 입력 폼 초기화 함수
    function resetForm(type) {
        const prefix = type === 'schedule' ? 's-' : 'n-';
        document.getElementById(type + '-form').reset();
        editingId[type] = null;
        
        // 버튼을 다시 '등록' 상태로 원복
        const btn = document.getElementById(`btn-submit-${prefix.replace('-', '')}`);
        btn.innerText = type === 'schedule' ? '일정 등록' : '안내 등록';
        btn.style.backgroundColor = type === 'schedule' ? '#3498db' : '#27ae60';
    }

    // 데이터 등록 및 수정 이벤트
    function setupForm(formId, type) {
        const form = document.getElementById(formId);
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const prefix = type === 'schedule' ? 's-' : 'n-';
            const title = document.getElementById(prefix + 'title').value;
            const start = document.getElementById(prefix + 'start').value || "";
            const end = document.getElementById(prefix + 'end').value || "";
            const desc = document.getElementById(prefix + 'desc').value || "";

            const dataPayload = { title, start, end, desc };

            if (editingId[type]) {
                // 수정 모드일 때 (update 사용)
                update(ref(db, `dashboard/${type}/${editingId[type]}`), dataPayload)
                    .then(() => resetForm(type))
                    .catch((error) => console.error("수정 에러:", error));
            } else {
                // 신규 등록일 때 (push 사용)
                dataPayload.createdAt = serverTimestamp();
                push(ref(db, 'dashboard/' + type), dataPayload)
                    .then(() => resetForm(type))
                    .catch((error) => console.error("등록 에러:", error));
            }
        });
    }

    setupForm('schedule-form', 'schedule');
    setupForm('notice-form', 'notice');

    // 실시간 데이터 로드
    function listenToData(type, containerId) {
        const container = document.getElementById(containerId);
        
        onValue(ref(db, 'dashboard/' + type), (snapshot) => {
            const data = snapshot.val();
            container.innerHTML = ""; 
            container.style.fontSize = '16px'; 
            
            currentData[type] = data || {}; // 수정을 위해 현재 데이터 저장
            if (!data) return;

            const items = Object.entries(data).map(([id, val]) => ({ id, ...val }));

            items.sort((a, b) => {
                if (a.start && b.start) return new Date(a.start) - new Date(b.start);
                if (a.start && !b.start) return -1;
                if (!a.start && b.start) return 1;
                return (b.createdAt || 0) - (a.createdAt || 0);
            });

            items.forEach(item => {
                // 🌟 날짜 한국어로 포맷팅 적용
                let dateText = "[미정]";
                if (item.start) {
                    const startKorean = formatDateKorean(item.start);
                    const endKorean = item.end ? formatDateKorean(item.end) : "";
                    dateText = endKorean ? `${startKorean} ~ ${endKorean}` : startKorean;
                }

                const card = document.createElement('div');
                card.className = 'item-card';
                card.innerHTML = `
                    <span class="item-date">${dateText}</span>
                    <span class="item-title">${item.title}</span>
                    <p class="item-desc">${item.desc || "상세 내용 없음"}</p>
                    <button class="btn-edit" onclick="editItem('${type}', '${item.id}')">수정</button>
                    <button class="btn-delete" onclick="deleteItem('${type}', '${item.id}')">삭제</button>
                `;
                container.appendChild(card);
            });

            setTimeout(() => autoResizeText(containerId), 10);
        });
    }

    listenToData('schedule', 'schedule-list');
    listenToData('notice', 'notice-list');

    // 🌟 2. 수정 버튼 클릭 시 입력창으로 불러오기 기능
    window.editItem = (type, id) => {
        const item = currentData[type][id];
        if (!item) return;

        editingId[type] = id; // 현재 수정 중인 아이디 저장
        const prefix = type === 'schedule' ? 's-' : 'n-';

        // 입력 폼에 기존 데이터 채우기
        document.getElementById(prefix + 'title').value = item.title || "";
        document.getElementById(prefix + 'start').value = item.start || "";
        document.getElementById(prefix + 'end').value = item.end || "";
        document.getElementById(prefix + 'desc').value = item.desc || "";

        // 등록 버튼을 주황색 '수정 완료' 버튼으로 시각적 변경
        const btn = document.getElementById(`btn-submit-${prefix.replace('-', '')}`);
        btn.innerText = type === 'schedule' ? '일정 수정 완료' : '안내 수정 완료';
        btn.style.backgroundColor = '#f39c12';
    };

    // 삭제 기능
    window.deleteItem = (type, id) => {
        if(confirm("이 항목을 삭제하시겠습니까?")) {
            remove(ref(db, `dashboard/${type}/${id}`));
        }
    };

} catch (error) {
    console.error("파이어베이스 연결 실패:", error);
}
