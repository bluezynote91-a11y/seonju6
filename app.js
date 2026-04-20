import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, update, onValue, remove, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

    let editingId = { schedule: null, notice: null };
    let currentData = { schedule: {}, notice: {} };

    function formatDateKorean(dateString) {
        if (!dateString) return "";
        const [year, month, day] = dateString.split('-');
        return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;
    }

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

    function resetForm(type) {
        const prefix = type === 'schedule' ? 's-' : 'n-';
        document.getElementById(type + '-form').reset();
        document.getElementById(prefix + 'pin').checked = false;
        editingId[type] = null;
        
        const btn = document.getElementById(`btn-submit-${prefix.replace('-', '')}`);
        btn.innerText = type === 'schedule' ? '일정 등록' : '안내 등록';
        btn.style.backgroundColor = type === 'schedule' ? '#3498db' : '#27ae60';
    }

    function setupForm(formId, type) {
        const form = document.getElementById(formId);
        if(!form) return; 
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const prefix = type === 'schedule' ? 's-' : 'n-';
            const title = document.getElementById(prefix + 'title').value;
            const start = document.getElementById(prefix + 'start').value || "";
            const end = document.getElementById(prefix + 'end').value || "";
            const desc = document.getElementById(prefix + 'desc').value || "";
            const isPinned = document.getElementById(prefix + 'pin').checked;

            const dataPayload = { title, start, end, desc, isPinned };

            if (editingId[type]) {
                update(ref(db, `dashboard/${type}/${editingId[type]}`), dataPayload)
                    .then(() => resetForm(type))
                    .catch((error) => alert("수정 에러: " + error.message));
            } else {
                dataPayload.createdAt = serverTimestamp();
                push(ref(db, 'dashboard/' + type), dataPayload)
                    .then(() => resetForm(type))
                    .catch((error) => alert("등록 에러: " + error.message));
            }
        });
    }

    setupForm('schedule-form', 'schedule');
    setupForm('notice-form', 'notice');

    function listenToData(type, containerId) {
        const container = document.getElementById(containerId);
        if(!container) return; 
        
        onValue(ref(db, 'dashboard/' + type), (snapshot) => {
            const data = snapshot.val();
            container.innerHTML = ""; 
            container.style.fontSize = '16px'; 
            
            currentData[type] = data || {}; 
            if (!data) return;

            const items = Object.entries(data).map(([id, val]) => ({ id, ...val }));

            items.sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;

                if (a.start && b.start) return new Date(a.start) - new Date(b.start);
                if (a.start && !b.start) return -1;
                if (!a.start && b.start) return 1;
                
                return (b.createdAt || 0) - (a.createdAt || 0);
            });

            items.forEach(item => {
                let dateHtml = "";
                if (item.start) {
                    const startKorean = formatDateKorean(item.start);
                    const endKorean = item.end ? formatDateKorean(item.end) : "";
                    const dateText = endKorean ? `${startKorean} ~ ${endKorean}` : startKorean;
                    dateHtml = `<span class="item-date">${dateText}</span>`;
                }

                let descHtml = "";
                if (item.desc && item.desc.trim() !== "") {
                    descHtml = `<p class="item-desc">${item.desc}</p>`;
                }

                const pinIcon = item.isPinned ? `<span style="color:#e67e22; font-size:1.1em; margin-right:3px;">⭐</span>` : "";
                const cardClass = type === 'schedule' ? 'card-schedule' : 'card-notice';

                const card = document.createElement('div');
                card.className = `item-card ${cardClass}`;
                card.innerHTML = `
                    ${dateHtml}
                    <span class="item-title">${pinIcon}${item.title}</span>
                    ${descHtml}
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

    window.editItem = (type, id) => {
        const item = currentData[type][id];
        if (!item) return;

        editingId[type] = id; 
        const prefix = type === 'schedule' ? 's-' : 'n-';

        document.getElementById(prefix + 'title').value = item.title || "";
        document.getElementById(prefix + 'start').value = item.start || "";
        document.getElementById(prefix + 'end').value = item.end || "";
        document.getElementById(prefix + 'desc').value = item.desc || "";
        document.getElementById(prefix + 'pin').checked = item.isPinned || false;

        const btn = document.getElementById(`btn-submit-${prefix.replace('-', '')}`);
        btn.innerText = type === 'schedule' ? '일정 수정 완료' : '안내 수정 완료';
        btn.style.backgroundColor = '#f39c12';
    };

    window.deleteItem = (type, id) => {
        if(confirm("이 항목을 삭제하시겠습니까?")) {
            remove(ref(db, `dashboard/${type}/${id}`));
        }
    };

} catch (error) {
    console.error("파이어베이스 연결 실패:", error);
    alert("데이터베이스 연결에 문제가 발생했습니다. 관리자 모드(F12)를 확인해주세요.");
}
