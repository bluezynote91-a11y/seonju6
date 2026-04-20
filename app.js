import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// 데이터 등록 함수
function setupForm(formId, type) {
    document.getElementById(formId).addEventListener('submit', (e) => {
        e.preventDefault();
        const prefix = type === 'schedule' ? 's-' : 'n-';
        const title = document.getElementById(prefix + 'title').value;
        const start = document.getElementById(prefix + 'start').value;
        const end = document.getElementById(prefix + 'end').value;
        const desc = document.getElementById(prefix + 'desc').value;

        push(ref(db, 'dashboard/' + type), {
            title, start, end, desc,
            createdAt: serverTimestamp()
        }).then(() => e.target.reset());
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

        // 정렬 로직: 시작일이 있는 것 우선(날짜순) -> 없는 것 최신순
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
                <p class="item-desc">${item.desc}</p>
                <button class="btn-delete" onclick="deleteItem('${type}', '${item.id}')">삭제</button>
            `;
            container.appendChild(card);
        });
    });
}

// 삭제 함수 (글로벌 노출)
window.deleteItem = (type, id) => {
    if(confirm("정말 삭제하시겠습니까?")) {
        remove(ref(db, `dashboard/${type}/${id}`));
    }
};

listenToData('schedule', 'schedule-list');
listenToData('notice', 'notice-list');
