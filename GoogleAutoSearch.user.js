// ==UserScript==
// @name         Google Auto-Search & Scraper (Final)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Floating UI, Pre-flight Check, Human-Typing & Auto-Scraping/Clicking
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
        <button id="as-close-btn" class="close-btn">Thu nhỏ / Hủy</button>
    `;
    document.body.appendChild(panel);

    panel.addEventListener('mousedown', e => e.stopPropagation());
    panel.addEventListener('touchstart', e => e.stopPropagation(), {passive: true});

    let isInteraction = false, isClick = true, initialX, initialY;

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
        const maxX = window.innerWidth - bubble.offsetWidth;
        const maxY = window.innerHeight - bubble.offsetHeight;
        bubble.style.left = Math.max(0, Math.min(clientX - initialX, maxX)) + "px";
        bubble.style.top = Math.max(0, Math.min(clientY - initialY, maxY)) + "px";
        bubble.style.bottom = "auto"; bubble.style.right = "auto";
    }

    function dragEnd() {
        if (!isInteraction) return; 
        isInteraction = false;
        if (isClick) togglePanel(); else updatePanelPosition();
    }

    bubble.addEventListener('mousedown', dragStart); document.addEventListener('mousemove', drag); document.addEventListener('mouseup', dragEnd);
    bubble.addEventListener('touchstart', dragStart, {passive: false}); document.addEventListener('touchmove', drag, {passive: false}); document.addEventListener('touchend', dragEnd);

    function updatePanelPosition() {
        if (panel.style.display !== 'flex') return;
        const bRect = bubble.getBoundingClientRect();
        panel.style.bottom = "auto"; panel.style.right = "auto";
        panel.style.top = (bRect.top > 250 ? bRect.top - panel.offsetHeight - 15 : bRect.bottom + 15) + "px";
        panel.style.left = Math.min(Math.max(10, bRect.left - (panel.offsetWidth / 2) + 25), window.innerWidth - panel.offsetWidth - 10) + "px";
    }

    function togglePanel() {
        panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
        if (panel.style.display === 'flex') requestAnimationFrame(updatePanelPosition);
    }
    
    document.getElementById('as-close-btn').addEventListener('click', () => {
        // Nút thu nhỏ giờ kiêm luôn tính năng hủy tiến trình nếu đang chạy dở
        GM_setValue('as_isRunning', false);
        resetBtn();
        togglePanel();
    });

    /* ==========================================
       PHẦN 2: PRE-FLIGHT & HUMAN-TYPING
       ========================================== */
    const startBtn = document.getElementById('as-start-btn');
    const keywordInput = document.getElementById('as-keyword');
    const urlInput = document.getElementById('as-url');

    // Phục hồi giá trị cũ lên panel
    keywordInput.value = GM_getValue('as_keyword', '');
    urlInput.value = GM_getValue('as_targetUrl', '');

    function resetBtn() {
        startBtn.innerText = "Bắt đầu tìm";
        startBtn.disabled = false;
        startBtn.style.background = '#2196F3';
    }

    function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

    startBtn.addEventListener('click', () => {
        const keyword = keywordInput.value.trim();
        let targetUrl = urlInput.value.trim();

        if (!keyword || !targetUrl) return alert("Nhập đủ thông tin!");
        if (!/^https?:\/\//i.test(targetUrl)) targetUrl = 'https://' + targetUrl;

        startBtn.innerText = "Đang ping URL...";
        startBtn.disabled = true;

        GM_xmlhttpRequest({
            method: "HEAD", url: targetUrl, timeout: 5000,
            onload: function(res) {
                if ((res.status >= 200 && res.status < 400) || res.status === 403) {
                    startBtn.innerText = "Đang gõ từ khóa...";
                    simulateHumanTyping(keyword, targetUrl);
                } else {
                    alert(`Trang sập hoặc lỗi: ${res.status}`); resetBtn();
                }
            },
            onerror: () => { alert("Lỗi kết nối tới URL đích."); resetBtn(); },
            ontimeout: () => { alert("Timeout khi kiểm tra URL."); resetBtn(); }
        });
    });

    function simulateHumanTyping(keyword, targetUrl) {
        const searchBox = document.querySelector('textarea[name="q"], input[name="q"]');
        if (!searchBox) return alert("Không tìm thấy thanh tìm kiếm!");

        searchBox.focus(); searchBox.value = "";
        let i = 0;
        function typeChar() {
            if (i < keyword.length) {
                searchBox.value += keyword.charAt(i++);
                searchBox.dispatchEvent(new Event('input', { bubbles: true }));
                setTimeout(typeChar, randomInt(50, 150));
            } else {
                setTimeout(() => triggerSearch(keyword, targetUrl, searchBox), randomInt(500, 1000));
            }
        }
        typeChar();
    }

    function triggerSearch(keyword, targetUrl, searchBox) {
        GM_setValue('as_isRunning', true);
        GM_setValue('as_keyword', keyword);
        // Loại bỏ scheme (http/https) và dấu slash cuối để dễ match tương đối
        GM_setValue('as_targetUrl', targetUrl.replace(/^https?:\/\//, '').replace(/\/$/, ''));
        GM_setValue('as_currentPage', 1);

        startBtn.innerText = "Đang submit...";
        const enterEvent = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, keyCode: 13, key: 'Enter' });
        searchBox.dispatchEvent(enterEvent);
        setTimeout(() => { const form = searchBox.closest('form'); if (form) form.submit(); }, 300);
    }

    /* ==========================================
       PHẦN 3: CORE LOGIC - SCRAPING & ANTI-BOT
       ========================================== */
    
    // Hàm cuộn trang giống người (cuộn nhích từng đoạn)
    function humanScroll(callback) {
        const totalHeight = document.body.scrollHeight - window.innerHeight;
        let currentScroll = window.scrollY;
        
        function step() {
            if (currentScroll < totalHeight - 200) {
                currentScroll += randomInt(150, 400); // Cuộn mỗi lần một đoạn
                window.scrollTo({ top: currentScroll, behavior: 'smooth' });
                setTimeout(step, randomInt(300, 800)); // Nghỉ giữa các nhịp cuộn
            } else {
                setTimeout(callback, randomInt(1000, 2000)); // Đến đáy thì đợi 1 chút
            }
        }
        step();
    }

    function executeSearchCore() {
        const targetUrl = GM_getValue('as_targetUrl', '');
        const currentPage = GM_getValue('as_currentPage', 1);
        const MAX_PAGES = 10; // Giới hạn tìm kiếm

        // 1. Lọc tất cả thẻ <a> trỏ ra ngoài Google (Loại trừ các link Google Maps, Images, Cache...)
        const links = Array.from(document.querySelectorAll('#search a[href^="http"], #rso a[href^="http"]'))
            .filter(a => !a.href.includes('google.'));
            
        let foundLink = null;
        for (let a of links) {
            // Match tương đối: Ví dụ href là https://github.com/abc, targetUrl là github.com
            if (a.href.includes(targetUrl)) {
                foundLink = a;
                break;
            }
        }
        
        if (foundLink) {
            // === TÌM THẤY ===
            GM_setValue('as_isRunning', false); // Xóa state để dừng vòng lặp
            
            // Highlight bằng CSS
            foundLink.style.border = "4px solid #ff0000";
            foundLink.style.backgroundColor = "#fff3cd";
            foundLink.style.boxShadow = "0 0 15px rgba(255,0,0,0.8)";
            foundLink.style.transition = "all 0.5s";
            
            startBtn.innerText = `Tìm thấy ở trang ${currentPage}!`;
            startBtn.style.background = '#4CAF50'; // Đổi nút thành màu xanh
            
            // Cuộn mượt mà đến phần tử đó
            foundLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Fake delay như người thật đang đọc tiêu đề rồi mới click
            setTimeout(() => {
                startBtn.innerText = "Đang chuyển hướng...";
                // Ưu tiên trigger sự kiện click thực để trình duyệt tính là user-action, 
                // nếu bị chặn thì fallback sang gán window.location
                foundLink.click();
                setTimeout(() => { window.location.href = foundLink.href; }, 1000);
            }, randomInt(1500, 3000));

        } else {
            // === KHÔNG TÌM THẤY -> CHUYỂN TRANG ===
            if (currentPage >= MAX_PAGES) {
                startBtn.innerText = `Không thấy sau ${MAX_PAGES} trang. Đang reset...`;
                
                // 1. Xóa toàn bộ State để reset 2 ô input ở lần tải trang sau
                GM_setValue('as_isRunning', false);
                GM_setValue('as_keyword', '');
                GM_setValue('as_targetUrl', '');
                GM_setValue('as_currentPage', 1);
                
                // 2. Quay về trang chủ Google (origin sẽ tự động lấy google.com hoặc google.com.vn)
                setTimeout(() => {
                    window.location.href = window.location.origin;
                }, 1000);
                return;
            }
            
            startBtn.innerText = `Không thấy. Đang sang trang ${currentPage + 1}...`;
            
            // Cuộn xuống từ từ để anti-bot Google không thấy sự kiện nhảy page tức thì
            humanScroll(() => {
                // Nút "Tiếp" trên PC (id=pnnext) HOẶC nút "Xem thêm" trên Mobile
                const nextBtn = document.querySelector('#pnnext, a[aria-label="Tiếp theo"], a[aria-label="Next page"], .RVzKle, .GNJvt');
                
                if (nextBtn) {
                    GM_setValue('as_currentPage', currentPage + 1);
                    nextBtn.click();
                } else {
                    // Nếu hết kết quả từ Google trước khi chạm đến MAX_PAGES -> Cũng tiến hành Reset
                    startBtn.innerText = "Hết kết quả từ Google. Đang reset...";
                    
                    GM_setValue('as_isRunning', false);
                    GM_setValue('as_keyword', '');
                    GM_setValue('as_targetUrl', '');
                    GM_setValue('as_currentPage', 1);
                    
                    setTimeout(() => {
                        window.location.href = window.location.origin;
                    }, 1500);
                }
            });
        }
    }

    // Kích hoạt Core Logic khi trang search vừa tải xong và cờ isRunning = true
    window.addEventListener('load', () => {
        if (GM_getValue('as_isRunning', false)) {
            // Bật panel hiển thị trạng thái
            panel.style.display = 'flex';
            updatePanelPosition();
            startBtn.disabled = true;
            startBtn.innerText = `Đang quét trang ${GM_getValue('as_currentPage', 1)}...`;
            
            // Delay 1 chút ngay khi vừa sang trang mới cho giống người
            setTimeout(executeSearchCore, randomInt(1000, 2500));
        }
    });

})();