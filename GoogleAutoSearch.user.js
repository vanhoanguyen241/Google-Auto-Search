// ==UserScript==
// @name         Google Auto-Search & Scraper (Phase 1+2)
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Floating UI, Pre-flight Check & Human-Typing Simulation
// @author       Nguyễn Văn Hòa
// @match        *://www.google.com/*
// @match        *://www.google.com.vn/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @connect      *
// ==/UserScript==

(function() {
    'use strict';

    /* ==========================================
       PHẦN 1: FOUNDATION UI (GIAO DIỆN & KÉO THẢ)
       ========================================== */
    const style = document.createElement('style');
    style.textContent = `
        #auto-search-bubble { position: fixed; bottom: 20px; right: 20px; width: 50px; height: 50px; background-color: #4CAF50; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; cursor: grab; z-index: 999999; box-shadow: 0 4px 8px rgba(0,0,0,0.3); user-select: none; transition: transform 0.1s; }
        #auto-search-bubble:active { cursor: grabbing; transform: scale(0.95); }
        #auto-search-panel { position: fixed; bottom: 80px; right: 20px; width: 300px; max-width: 90vw; background: white; border: 1px solid #ccc; border-radius: 8px; padding: 15px; z-index: 999998; box-shadow: 0 4px 12px rgba(0,0,0,0.2); display: none; flex-direction: column; gap: 10px; font-family: Arial, sans-serif; color: #333; }
        #auto-search-panel h4 { margin: 0; text-align: center; }
        #auto-search-panel input { padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
        #auto-search-panel button { padding: 8px; cursor: pointer; border: none; border-radius: 4px; background: #2196F3; color: white; font-weight: bold; }
        #auto-search-panel button.close-btn { background: #f44336; }
        #auto-search-panel button:disabled { background: #9e9e9e; cursor: not-allowed; }
    `;
    document.head.appendChild(style);

    const bubble = document.createElement('div');
    bubble.id = 'auto-search-bubble';
    bubble.innerHTML = '🔍';
    document.body.appendChild(bubble);

    const panel = document.createElement('div');
    panel.id = 'auto-search-panel';
    panel.innerHTML = `
        <h4>Auto Search</h4>
        <input type="text" id="as-keyword" placeholder="Nhập từ khóa...">
        <input type="text" id="as-url" placeholder="Nhập URL đích (VD: target.com)">
        <button id="as-start-btn">Bắt đầu tìm</button>
        <button id="as-close-btn" class="close-btn">Thu nhỏ</button>
    `;
    document.body.appendChild(panel);

    panel.addEventListener('mousedown', e => e.stopPropagation());
    panel.addEventListener('touchstart', e => e.stopPropagation(), {passive: true});

    let isInteraction = false; 
    let isClick = true;
    let initialX, initialY;

    function dragStart(e) {
        isInteraction = true; isClick = true;
        const clientX = e.type === "touchstart" ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === "touchstart" ? e.touches[0].clientY : e.clientY;
        initialX = clientX - bubble.getBoundingClientRect().left;
        initialY = clientY - bubble.getBoundingClientRect().top;
    }

    function drag(e) {
        if (!isInteraction) return; 
        isClick = false; 
        if(e.type === "touchmove") e.preventDefault(); 
        const clientX = e.type === "touchmove" ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === "touchmove" ? e.touches[0].clientY : e.clientY;
        let currentX = clientX - initialX;
        let currentY = clientY - initialY;
        const maxX = window.innerWidth - bubble.offsetWidth;
        const maxY = window.innerHeight - bubble.offsetHeight;
        bubble.style.left = Math.max(0, Math.min(currentX, maxX)) + "px";
        bubble.style.top = Math.max(0, Math.min(currentY, maxY)) + "px";
        bubble.style.bottom = "auto";
        bubble.style.right = "auto";
    }

    function dragEnd(e) {
        if (!isInteraction) return; 
        isInteraction = false;
        if (isClick) togglePanel(); else updatePanelPosition();
    }

    bubble.addEventListener('mousedown', dragStart); document.addEventListener('mousemove', drag); document.addEventListener('mouseup', dragEnd);
    bubble.addEventListener('touchstart', dragStart, {passive: false}); document.addEventListener('touchmove', drag, {passive: false}); document.addEventListener('touchend', dragEnd);

    function updatePanelPosition() {
        if (panel.style.display !== 'flex') return;
        const bubbleRect = bubble.getBoundingClientRect();
        panel.style.bottom = "auto"; panel.style.right = "auto";
        if (bubbleRect.top > 250) panel.style.top = (bubbleRect.top - panel.offsetHeight - 15) + "px";
        else panel.style.top = (bubbleRect.bottom + 15) + "px";
        panel.style.left = Math.min(Math.max(10, bubbleRect.left - (panel.offsetWidth / 2) + 25), window.innerWidth - panel.offsetWidth - 10) + "px";
    }

    function togglePanel() {
        panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
        if (panel.style.display === 'flex') requestAnimationFrame(updatePanelPosition);
    }
    document.getElementById('as-close-btn').addEventListener('click', togglePanel);

    /* ==========================================
       PHẦN 2: AUTO-SEARCH ENGINE & PRE-FLIGHT
       ========================================== */
    const startBtn = document.getElementById('as-start-btn');
    const keywordInput = document.getElementById('as-keyword');
    const urlInput = document.getElementById('as-url');

    function resetBtn() {
        startBtn.innerText = "Bắt đầu tìm";
        startBtn.disabled = false;
    }

    startBtn.addEventListener('click', () => {
        const keyword = keywordInput.value.trim();
        let targetUrl = urlInput.value.trim();

        if (!keyword || !targetUrl) {
            alert("Vui lòng nhập đầy đủ từ khóa và URL đích!");
            return;
        }

        // Đảm bảo URL có giao thức để check HTTP
        if (!/^https?:\/\//i.test(targetUrl)) {
            targetUrl = 'https://' + targetUrl;
        }

        startBtn.innerText = "Đang ping URL...";
        startBtn.disabled = true;

        // Bỏ qua CORS bằng GM_xmlhttpRequest để kiểm tra trang
        GM_xmlhttpRequest({
            method: "HEAD", // Dùng HEAD để tiết kiệm băng thông thay vì tải cả trang (GET)
            url: targetUrl,
            timeout: 5000,
            onload: function(response) {
                // Chấp nhận 200 (OK), 3xx (Redirect), và cả 403 (Một số web chặn bot/DDoS nhưng vẫn sống)
                if ((response.status >= 200 && response.status < 400) || response.status === 403) {
                    startBtn.innerText = "Đang gõ từ khóa...";
                    simulateHumanTyping(keyword, targetUrl);
                } else {
                    alert(`Trang web không khả dụng!\nMã lỗi trả về: ${response.status}`);
                    resetBtn();
                }
            },
            onerror: function() {
                alert("Lỗi mạng/CORS: Không thể kết nối tới URL (Trang có thể đã sập).");
                resetBtn();
            },
            ontimeout: function() {
                alert("Kiểm tra URL bị Timeout (Web quá tải hoặc không tồn tại).");
                resetBtn();
            }
        });
    });

    function simulateHumanTyping(keyword, targetUrl) {
        // Tìm ô nhập liệu của Google (hỗ trợ cả Mobile và PC)
        const searchBox = document.querySelector('textarea[name="q"], input[name="q"]');
        if (!searchBox) {
            alert("Không tìm thấy thanh tìm kiếm của Google!");
            resetBtn();
            return;
        }

        searchBox.focus();
        searchBox.value = "";
        let currentIndex = 0;

        function typeCharacter() {
            if (currentIndex < keyword.length) {
                // Gõ từng chữ và trigger sự kiện input để React/Angular của Google nhận dạng
                searchBox.value += keyword.charAt(currentIndex);
                searchBox.dispatchEvent(new Event('input', { bubbles: true }));
                currentIndex++;
                
                // Độ trễ ngẫu nhiên từ 50ms - 150ms cho mỗi phím gõ
                setTimeout(typeCharacter, Math.floor(Math.random() * 100) + 50);
            } else {
                // Gõ xong, nghỉ khoảng 0.5s - 1s rồi Enter
                setTimeout(() => triggerSearch(keyword, targetUrl, searchBox), Math.floor(Math.random() * 500) + 500);
            }
        }
        
        typeCharacter();
    }

    function triggerSearch(keyword, targetUrl, searchBox) {
        // LƯU TRẠNG THÁI: Để Giai đoạn 3 (khi sang trang mới) có thể đọc và chạy tiếp
        GM_setValue('as_isRunning', true);
        GM_setValue('as_keyword', keyword);
        GM_setValue('as_targetUrl', targetUrl);
        GM_setValue('as_currentPage', 1);

        startBtn.innerText = "Đang tìm kiếm...";
        
        // Mô phỏng phím Enter
        const enterEvent = new KeyboardEvent('keydown', {
            bubbles: true, cancelable: true, keyCode: 13, key: 'Enter'
        });
        searchBox.dispatchEvent(enterEvent);
        
        // Fallback: Nếu Enter bị chặn, tự động tìm form chứa ô search và submit
        setTimeout(() => {
            const form = searchBox.closest('form');
            if (form) form.submit();
        }, 300);
    }

})();