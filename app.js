import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 선생님의 실제 파이어베이스 설정값 (그대로 유지)
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
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);

    // 🌟 글자 크기 자동 조절 함수
    function autoResizeText(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // 초기 기본 글자 크기 (16px) 설정
        let currentSize = 16;
        container.style.fontSize = currentSize + 'px';

        // 스크롤이 발생했는지(내용이 넘쳤는지) 확인하고, 최소 11px까지만 줄임
        // offsetHeight(보여지는 영역) 보다 scrollHeight(전체 내용 길이)가 크면 줄임
        while (container.scrollHeight > container.offsetHeight && currentSize > 11) {
            currentSize -= 0.5; // 0.5px씩 미세하게 줄임
            container.style.fontSize = currentSize + 'px';
        }
    }

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
                form.reset();
            })
            .catch((error) => console.error("등록 에러:", error));
        });
    }

    setupForm('schedule-form', 'schedule');
    setupForm('notice-form', 'notice');

    function listenToData(type, containerId) {
        const container = document.getElementById(containerId);
        
        onValue(ref(db, 'dashboard/' + type), (snapshot) => {
            const data = snapshot.val();
            container.innerHTML = ""; 
            
            // 데이터가 없어도 기본 폰트 사이즈로 초기화
            container.style.fontSize = '16px'; 
            
            if (!data) return;

            const items = Object.entries(data).map(([id, val]) => ({ id, ...val }));

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

            // 화면에 요소가 모두 그려진 직후(setTimeout)에 크기 조절 실행
            setTimeout(() => {
                autoResizeText(containerId);
            }, 10);
        });
    }

    listenToData('schedule', 'schedule-list');
    listenToData('notice', 'notice-list');

    window.deleteItem = (type, id) => {
        if(confirm("이 항목을 삭제하시겠습니까?")) {
            remove(ref(db, `dashboard/${type}/${id}`));
        }
    };

} catch (error) {
    console.error("파이어베이스 연결 실패:", error);
}
