import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, update, onValue, remove, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 파이어베이스 설정값 (선생님 고유값)
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
    let isInitialLoad = { schedule: true, notice: true };

    // 🌟 1. 브라우저 알림 권한 요청 함수 (버튼 클릭 시 실행)
    window.requestNotificationPermission = function() {
        if (!("Notification" in window)) {
            alert("사용 중이신 브라우저는 알림 기능을 지원하지 않습니다.");
            return;
        }
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                alert("이제 다른 탭을 보거나 창을 내려두어도 새 글 알림이 울립니다!");
                new Notification("알림 설정 완료", { 
                    body: "6학년 대시보드 알림이 성공적으로 활성화되었습니다.", 
                    icon: "https://cdn-icons-png.flaticon.com/512/1827/1827347.png" 
                });
            } else {
                alert("알림이 차단되었습니다. 브라우저 주소창 왼쪽의 자물쇠 아이콘을 눌러 알림을 허용해주세요.");
            }
        });
    };

    // 🌟 2. 윈도우 바탕화면(브라우저 외부) 시스템 알림 띄우기
    function showWebNotification(type, title) {
        if (("Notification" in window) && Notification.permission === "granted") {
            const typeName = type === 'schedule' ? '일정' : '안내';
            const icon = type === 'schedule' ? '📅' : '📢';
            
            new Notification(`[6학년 대시보드] 새 ${typeName}`, {
                body: `${icon} ${title}`,
                icon: "https://cdn-icons-png.flaticon.com/512/1827/1827347.png"
            });
        }
    }

    // 화면 내 우측 하단 토스트 알림 띄우기
    function showNotification(type, title) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast-message';
        const icon = type === 'schedule' ? '📅' : '📢';
        const typeName = type === 'schedule' ? '일정' : '안내';
        
        toast.innerHTML = `<span class="toast-icon">${icon}</span> 새 ${typeName} 등록: <b>${title}</b>`;
        container.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400); 
        }, 4000);
    }

    // 날짜 요일 변환
    function formatDateKorean(dateString) {
        if (!dateString) return "";
        const [year, month, day] = dateString.split('-');
        const dateObj = new Date(year, month - 1, day);
        const week = ['일', '월', '화', '수', '목', '금', '토'];
        const dayName = week[dateObj.getDay()];
        return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일(${dayName})`;
    }

    // 글자 크기 자동 조절
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

    // 링크 자동 변환
    function linkify(inputText) {
        if (!inputText) return "";
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return inputText.replace(urlRegex, function(url) {
            return `<a href="${url}" target="_blank">${url}</a>`;
        });
    }

    // 폼 초기화
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
            const data = snapshot.val() || {};
            
            if (!isInitialLoad[type]) {
                const oldKeys = Object.keys(currentData[type]);
                const newKeys = Object.keys(data);
                const addedKeys = newKeys.filter(key => !oldKeys.includes(key));
                
                addedKeys.forEach(key => {
                    showNotification(type, data[key].title); // 화면 내 알림
                    showWebNotification(type, data[key].title); // 🌟 화면 밖 시스템 알림
                });
            }
            
            isInitialLoad[type] = false;
            currentData[type] = data; 
            
            container.innerHTML = ""; 
            container.style.fontSize = '16px'; 
            
            if (Object.keys(data).length === 0) return;

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
                    dateHtml = `<div class="item-date">${dateText}</div>`;
                }

                let descHtml = "";
                if (item.desc && item.desc.trim() !== "") {
                    const linkedDesc = linkify(item.desc);
                    descHtml = `<div class="item-desc">${linkedDesc}</div>`;
                }

                const pinIcon = item.isPinned ? `<span style="color:#e67e22; font-size:1.1em; margin-right:3px;">⭐</span>` : "";
                const cardClass = type === 'schedule' ? 'card-schedule' : 'card-notice';

                const card = document.createElement('div');
                card.className = `item-card ${cardClass}`;
                
                card.innerHTML = `
                    ${dateHtml}
                    <div class="item-body">
                        <div class="item-title">${pinIcon}${item.title}</div>
                        ${descHtml}
                    </div>
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
}
