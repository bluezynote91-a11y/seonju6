import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 1. 여기에 본인의 Firebase 설정값을 넣으세요.
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

// 2. DOM 요소 참조
const dataForm = document.getElementById('data-form');
const scheduleList = document.getElementById('schedule-list');
const noticeList = document.getElementById('notice-list');

// 3. 데이터 저장 로직
dataForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const type = document.getElementById('data-type').value; // schedule or notice
    const title = document.getElementById('data-title').value;
    const date = document.getElementById('data-date').value;
    const desc = document.getElementById('data-desc').value;

    push(ref(db, 'dashboard/' + type), {
        title,
        date: date || "", // 날짜가 없으면 빈값
        desc,
        timestamp: Date.now()
    }).then(() => {
        dataForm.reset(); // 입력창 초기화
    });
});

// 4. 실시간 데이터 정렬 및 표시 로직
function updateDisplay(type, container) {
    const dataRef = ref(db, 'dashboard/' + type);
    
    onValue(dataRef, (snapshot) => {
        const data = snapshot.val();
        container.innerHTML = "";
        
        if (!data) return;

        // 객체를 배열로 변환
        const items = Object.values(data);

        // 정렬 로직: 날짜 있는 것을 위로(날짜순), 없는 것을 아래로(최신순)
        items.sort((a, b) => {
            if (a.date && b.date) return new Date(a.date) - new Date(b.date); // 날짜 오름차순
            if (a.date && !b.date) return -1; // a는 있고 b는 없으면 a가 위
            if (!a.date && b.date) return 1;  // a는 없고 b는 있으면 b가 위
            return b.timestamp - a.timestamp; // 둘 다 없으면 등록 순서
        });

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'item-card';
            card.innerHTML = `
                <span class="item-date">${item.date || "[일정미정]"}</span>
                <span class="item-title">${item.title}</span>
                <span class="item-desc">${item.desc}</span>
            `;
            container.appendChild(card);
        });
    });
}

// 초기 실행
updateDisplay('schedule', scheduleList);
updateDisplay('notice', noticeList);
