import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ⚠️ 본인의 파이어베이스 설정값으로 반드시 교체하세요!
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "...",
    appId: "..."
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 데이터 등록 함수 (비어있는 값 허용)
function setupForm(formId, type) {
    const form = document.getElementById(formId);
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const prefix = type === 'schedule' ? 's-' : 'n-';
        
        const title = document.getElementById(prefix + 'title').value;
        const start = document.getElementById(prefix + 'start').value || ""; // 없으면 빈칸
        const end = document.getElementById(prefix + 'end').value || "";     // 없으면 빈칸
        const desc = document.getElementById(prefix + 'desc').value || "";   // 없으면 빈칸

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
            alert("등록에 실패했습니다. 파이어베이스 설정을 확인하세요.\n에러내용: " + error.message);
        });
    });
}

setupForm('schedule-form', 'schedule');
setupForm('notice-form', 'notice');

// 데이터 실시간 로드 및 정렬
function listenToData(type, containerId) {
    const container = document.getElementById(containerId);
    onValue(ref(db, 'dashboard/' + type), (snapshot) => {
        const data = snapshot.val();
        container.innerHTML = "";
        if (!data) return;

        const items = Object.entries(data).map(([id, val]) => ({ id, ...val }));

        // 정렬: 시작일 순 -> 시작일 없으면 최신 등록 순
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

// 삭제 함수
window.deleteItem = (type, id) => {
    if(confirm("이 항목을 삭제하시겠습니까?")) {
        remove(ref(db, `dashboard/${type}/${id}`))
            .then(() => alert("삭제되었습니다."))
            .catch((err) => alert("삭제 실패: " + err.message));
    }
};

listenToData('schedule', 'schedule-list');
listenToData('notice', 'notice-list');
