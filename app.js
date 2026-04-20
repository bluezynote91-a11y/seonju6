// 1. 파이어베이스 라이브러리 불러오기 (브라우저용 CDN 방식)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 2. 선생님의 파이어베이스 프로젝트 설정값 적용 완료
const firebaseConfig = {
  apiKey: "AIzaSyCz1A8QmTXuV9cF1aIqUok_FpvJra1eBx4",
  authDomain: "sj-6-9da52.firebaseapp.com",
  databaseURL: "https://sj-6-9da52-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sj-6-9da52",
  storageBucket: "sj-6-9da52.firebasestorage.app",
  messagingSenderId: "295498330859",
  appId: "1:295498330859:web:aceb14b8593a0549c784ae"
};

try {
    // 3. 파이어베이스 실행
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);

    // 4. 데이터 등록 기능 설정
    function setupForm(formId, type) {
        const form = document.getElementById(formId);
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const prefix = type === 'schedule' ? 's-' : 'n-';
            const title = document.getElementById(prefix + 'title').value;
            const start = document.getElementById(prefix + 'start').value || "";
            const end = document.getElementById(prefix + 'end').value || "";
            const desc = document.getElementById(prefix + 'desc').value || "";

            push(ref(db, 'dashboard/' + type), {
                title, start, end, desc,
                createdAt: serverTimestamp()
            })
            .then(() => {
                alert(type === 'schedule' ? "일정이 등록되었습니다." : "안내사항이 등록되었습니다.");
                form.reset();
            })
            .catch((error) => {
                console.error("등록 에러:", error);
                alert("등록에 실패했습니다. (파이어베이스 규칙 설정을 확인해 주세요)");
            });
        });
    }

    setupForm('schedule-form', 'schedule');
    setupForm('notice-form', 'notice');

    // 5. 화면에 실시간으로 데이터 보여주기 및 정렬
    function listenToData(type, containerId) {
        const container = document.getElementById(containerId);
        
        onValue(ref(db, 'dashboard/' + type), (snapshot) => {
            const data = snapshot.val();
            container.innerHTML = ""; // 기존 화면 비우기
            if (!data) return;

            const items = Object.entries(data).map(([id, val]) => ({ id, ...val }));

            // 정렬 로직 (시작일 순서 -> 없으면 최신순)
            items.sort((a, b) => {
                if (a.start && b.start) return new Date(a.start) - new Date(b.start);
                if (a.start && !b.start) return -1;
                if (!a.start && b.start) return 1;
                return b.createdAt - a.createdAt;
            });

            items.forEach(item => {
                const dateText = item.start ? (item.end ? `${item.start} ~ ${item.end}` : item.start) : "[미정]";
                const card = document.createElement('div');
                card.className = 'item-card';
                card.innerHTML = `
                    <span class="item-date">${dateText}</span>
                    <span class="item-title">${item.title}</span>
                    <p class="item-desc">${item.desc || "상세 내용 없음"}</p>
                    <button class="btn-delete" onclick="deleteItem('${type}', '${item.id}')">삭제</button>
                `;
                container.appendChild(card);
            });
        });
    }

    // 화면 로드 시 데이터 가져오기 실행
    listenToData('schedule', 'schedule-list');
    listenToData('notice', 'notice-list');

    // 6. 삭제 기능
    window.deleteItem = (type, id) => {
        if(confirm("이 항목을 삭제하시겠습니까?")) {
            remove(ref(db, `dashboard/${type}/${id}`))
                .then(() => alert("삭제되었습니다."))
                .catch((err) => alert("삭제 실패: " + err.message));
        }
    };

} catch (error) {
    console.error("파이어베이스 초기화 에러:", error);
}
