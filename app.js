import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ⚠️ 본인의 Firebase 설정값으로 반드시 교체하세요!
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://sj-6-9da52-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "YOUR_PROJECT",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "...",
    appId: "..."
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const dataForm = document.getElementById('data-form');
const scheduleList = document.getElementById('schedule-list');
const noticeList = document.getElementById('notice-list');

// 데이터 전송 로직
dataForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const type = document.getElementById('data-type').value;
    const title = document.getElementById('data-title').value;
    const date = document.getElementById('data-date').value;
    const desc = document.getElementById('data-desc').value;

    try {
        await push(ref(db, 'dashboard/' + type), {
            title,
            date: date || "", 
            desc,
            createdAt: serverTimestamp() // 서버 시간을 기준으로 생성 시간 기록
        });
        dataForm.reset();
        alert("대시보드에 반영되었습니다!"); 
    } catch (error) {
        console.error("데이터 전송 오류:", error);
        alert("반영에 실패했습니다. 파이어베이스 규칙 설정을 확인하세요.");
    }
});

// 실시간 감시 및 정렬 로직
function listenToData(type, container) {
    const dataRef = ref(db, 'dashboard/' + type);
    
    // onValue는 데이터가 변경될 때마다 "모든 사용자"에게 이 함수를 실행시킵니다.
    onValue(dataRef, (snapshot) => {
        const data = snapshot.val();
        container.innerHTML = "";
        
        if (!data) return;

        const items = Object.values(data);

        // 6학년 일정 정렬: 날짜순 -> 날짜 없는 건 아래로
        items.sort((a, b) => {
            if (a.date && b.date) return new Date(a.date) - new Date(b.date);
            if (a.date && !b.date) return -1;
            if (!a.date && b.date) return 1;
            return (b.createdAt || 0) - (a.createdAt || 0);
        });

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'item-card';
            card.innerHTML = `
                <span class="item-date">${item.date ? '🗓️ ' + item.date : "[미정]"}</span>
                <span class="item-title">${item.title}</span>
                <p class="item-desc">${item.desc}</p>
            `;
            container.appendChild(card);
        });
    }, (error) => {
        console.error("데이터 읽기 권한 없음:", error);
    });
}

listenToData('schedule', scheduleList);
listenToData('notice', noticeList);
