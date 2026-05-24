// ==UserScript==
// @name         Google Auto-Search & Scraper (Final)
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Modern Dark UI, Pre-flight Check, Regex Word Boundary & Auto-Scraping
// @author       Nguyễn Văn Hòa
// @match        *://www.google.com/*
// @match        *://www.google.com.vn/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @connect      *
// @updateURL    https://raw.githubusercontent.com/vanhoanguyen241/Google-Auto-Search/main/GoogleAutoSearch.user.js
// @downloadURL  https://raw.githubusercontent.com/vanhoanguyen241/Google-Auto-Search/main/GoogleAutoSearch.user.js
// ==/UserScript==

(function() {
    'use strict';

    // NGĂN CHẶN CHẠY TRONG IFRAME (ReCaptcha, Google Maps)
    if (window.top !== window.self) return;

    /* ==========================================
       PHẦN 1: FOUNDATION UI (GIAO DIỆN DARK MODE)
       ========================================== */
    const style = document.createElement('style');
    style.textContent = `
        /* Bubble nổi */
        #auto-search-bubble { 
            position: fixed; bottom: 20px; right: 20px; width: 52px; height: 52px; 
            background: linear-gradient(135deg, #3b82f6, #2563eb); 
            color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; 
            font-size: 22px; cursor: grab; z-index: 999999; 
            box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4); 
            user-select: none; transition: transform 0.15s ease, box-shadow 0.15s ease; 
        }
        #auto-search-bubble:hover { transform: scale(1.05); box-shadow: 0 6px 20px rgba(37, 99, 235, 0.6); }
        #auto-search-bubble:active { cursor: grabbing; transform: scale(0.95); }

        /* Khung Panel */
        #auto-search-panel { 
            position: fixed; bottom: 80px; right: 20px; width: 320px; max-width: 90vw; 
            background: #1f2937; /* Xám đen đậm */
            color: #f3f4f6; /* Trắng xám */
            border: 1px solid #374151; 
            border-radius: 16px; padding: 20px; z-index: 999998; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.5); 
            display: none; flex-direction: column; gap: 14px; 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
        }
        #auto-search-panel h4 { 
            margin: 0; padding-right: 30px; text-align: left; 
            font-size: 16px; font-weight: 600; color: #f9fafb; letter-spacing: 0.5px;
        }

        /* Ô nhập liệu */
        #auto-search-panel input { 
            padding: 12px; background: #111827; color: #f9fafb;
            border: 1px solid #374151; border-radius: 8px; box-sizing: border-box; width: 100%; 
            font-size: 14px; outline: none; transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        #auto-search-panel input::placeholder { color: #6b7280; }
        #auto-search-panel input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }

        /* Nút chức năng */
        #auto-search-panel button { 
            padding: 10px; cursor: pointer; border: none; border-radius: 8px; 
            font-weight: 600; font-size: 14px; transition: all 0.2s ease; 
        }
        #auto-search-panel .start-btn { background: #3b82f6; color: white; }
        #auto-search-panel .start-btn:hover:not(:disabled) { background: #2563eb; }
        #auto-search-panel .start-btn:active:not(:disabled) { transform: scale(0.98); }
        
        #auto-search-panel .reset-btn { background: #374151; color: #d1d5db; }
        #auto-search-panel .reset-btn:hover { background: #4b5563; color: white; }
        #auto-search-panel .reset-btn:active { transform: scale(0.98); }

        #auto-search-panel button:disabled { background: #4b5563 !important; color: #9ca3af !important; cursor: not-allowed; }

        /* Nút thu nhỏ */
        #auto-search-panel .close-btn { 
            position: absolute; top: 16px; right: 16px; 
            background: transparent; color: #9ca3af; 
            width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; 
            font-size: 18px; border-radius: 6px; padding: 0; line-height: 1;
        }
        #auto-search-panel .close-btn:hover { background: #374151; color: #ef4444; }
    `;
    document.head.appendChild(style);

    const bubble = document.createElement('div');
    bubble.id = 'auto-search-bubble';
    bubble.innerHTML = '🔍';
    document.body.appendChild(bubble);

    const panel = document.createElement('div');
    panel.id = 'auto-search-panel';
    panel.innerHTML = `
        <button id="as-close-btn" class="close-btn" title="Thu nhỏ">-</button>
        <h4>Auto Search</h4>
        <input type="text" id="as-keyword" placeholder="Nhập từ khóa...">
        <input type="text" id="as-url" placeholder="Nhập URL / Tên web che link">
        <button id="as-start-btn" class="start-btn">Bắt đầu tìm</button>
        <button id="as-clear-btn" class="reset-btn">Làm mới</button>
    `;
    document.body.appendChild(panel);

    panel.addEventListener('mousedown', e => e.stopPropagation());
    panel.addEventListener('touchstart', e => e.stopPropagation(), {passive: true});

    // === LOGIC KÉO THẢ ===
    const BUBBLE_SIZE = 52;
    let isDragging = false;
    let dragMoved = false;
    let currentX = 0;
    let currentY = 0;
    let initialX = 0;
    let initialY = 0;
    let xOffset = 0;
    let yOffset = 0;

    setTimeout(() => {
        const saved = GM_getValue('as_bubble_pos');
        if (saved) {
            xOffset = saved.x;
            yOffset = saved.y;
        } else {
            const rect = bubble.getBoundingClientRect();
            xOffset = rect.left;
            yOffset = rect.top;
        }
        bubble.style.right = 'auto';
        bubble.style.bottom = 'auto';
        bubble.style.left = xOffset + 'px';
        bubble.style.top = yOffset + 'px';
    }, 50);

    function dragStart(e) {
        const cX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const cY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        if (e.type === 'mousedown' && e.button !== 0) return;

        if (e.target === bubble || bubble.contains(e.target)) {
            initialX = cX - xOffset;
            initialY = cY - yOffset;
            isDragging = true;
            dragMoved = false;
            bubble.style.transform = 'scale(0.9)';
        }
    }

    function drag(e) {
        if (!isDragging) return;
        const cX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const cY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

        if (!dragMoved && Math.abs(cX - initialX - xOffset) < 5 && Math.abs(cY - initialY - yOffset) < 5) return;

        dragMoved = true;
        if (e.cancelable) e.preventDefault();

        currentX = Math.max(0, Math.min(window.innerWidth - BUBBLE_SIZE, cX - initialX));
        currentY = Math.max(0, Math.min(window.innerHeight - BUBBLE_SIZE, cY - initialY));
        xOffset = currentX;
        yOffset = currentY;
        
        bubble.style.left = currentX + 'px';
        bubble.style.top = currentY + 'px';
    }

    function dragEnd(e) {
        if (!isDragging) return;
        isDragging = false;
        bubble.style.transform = 'scale(1)';

        if (dragMoved) {
            GM_setValue('as_bubble_pos', { x: currentX, y: currentY });
        } else {
            if (e.type === 'touchend' && e.cancelable) e.preventDefault();
            openMenu();
        }
    }

    bubble.addEventListener('touchstart', dragStart, { passive: false });
    window.addEventListener('touchmove', drag, { passive: false });
    window.addEventListener('touchend', dragEnd);
    bubble.addEventListener('mousedown', dragStart);
    window.addEventListener('mousemove', drag);
    window.addEventListener('mouseup', dragEnd);

    function openMenu() {
        if (!bubble || !panel) return;
        
        panel.style.display = 'flex';
        bubble.style.display = 'none';
        
        const pW = panel.offsetWidth;
        const pH = panel.offsetHeight;
        
        const left = xOffset < window.innerWidth / 2 ? xOffset + BUBBLE_SIZE + 10 : xOffset - pW - 10;
        const top = xOffset < window.innerHeight / 2 ? yOffset : yOffset + BUBBLE_SIZE - pH;
        
        panel.style.left = Math.max(10, Math.min(window.innerWidth - pW - 10, left)) + 'px';
        panel.style.top = Math.max(10, Math.min(window.innerHeight - pH - 10, top)) + 'px';
        panel.style.bottom = 'auto';
        panel.style.right = 'auto';
    }

    function closeMenu() {
        if (!bubble || !panel) return;
        panel.style.display = 'none';
        bubble.style.display = 'flex';
        bubble.style.left = xOffset + 'px';
        bubble.style.top = yOffset + 'px';
    }
    
    document.getElementById('as-close-btn').addEventListener('click', () => {
        GM_setValue('as_isRunning', false);
        resetBtn();
        closeMenu();
    });

    /* ==========================================
       PHẦN 2: PRE-FLIGHT (SOFT-PING) & TYPING
       ========================================== */
    const startBtn = document.getElementById('as-start-btn');
    const keywordInput = document.getElementById('as-keyword');
    const urlInput = document.getElementById('as-url');
    const clearBtn = document.getElementById('as-clear-btn');

    keywordInput.value = GM_getValue('as_keyword', '');
    urlInput.value = GM_getValue('as_targetUrl', '');

    clearBtn.addEventListener('click', () => {
        keywordInput.value = '';
        urlInput.value = '';
        GM_setValue('as_keyword', '');
        GM_setValue('as_targetUrl', '');
    });

    function resetBtn() {
        startBtn.innerText = "Bắt đầu tìm";
        startBtn.disabled = false;
        startBtn.style.background = '#3b82f6';
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
                    if (confirm(`Trang web trả về lỗi ${res.status}. Có thể web đã sập hoặc chặn truy cập trực tiếp.\nBạn có muốn BỎ QUA và vẫn tiếp tục tìm kiếm không?`)) {
                        simulateHumanTyping(keyword, targetUrl);
                    } else resetBtn();
                }
            },
            onerror: () => { 
                if (confirm(`Lỗi mạng: Không thể ping tới địa chỉ này.\nĐây có thể là từ khóa (web che link) chứ không phải URL hợp lệ.\nBạn có muốn tiếp tục tìm kiếm chuỗi này không?`)) {
                    simulateHumanTyping(keyword, targetUrl);
                } else resetBtn();
            },
            ontimeout: () => { 
                if (confirm(`Ping bị Timeout. Bạn có muốn bỏ qua và tiếp tục tìm kiếm không?`)) {
                    simulateHumanTyping(keyword, targetUrl);
                } else resetBtn();
            }
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
    function humanScroll(callback) {
        const totalHeight = document.body.scrollHeight - window.innerHeight;
        let currentScroll = window.scrollY;
        
        function step() {
            if (currentScroll < totalHeight - 200) {
                currentScroll += randomInt(150, 400); 
                window.scrollTo({ top: currentScroll, behavior: 'smooth' });
                setTimeout(step, randomInt(300, 800)); 
            } else {
                setTimeout(callback, randomInt(1000, 2000)); 
            }
        }
        step();
    }

    function executeSearchCore() {
        const rawTargetUrl = GM_getValue('as_targetUrl', '').toLowerCase();
        const currentPage = GM_getValue('as_currentPage', 1);
        const MAX_PAGES = 10; 

        const links = Array.from(document.querySelectorAll('#search a[href^="http"], #rso a[href^="http"]'))
            .filter(a => !a.href.includes('google.'));
            
        let foundLink = null;
        for (let a of links) {
            let isMatch = false;

            try {
                let targetObj = new URL(/^https?:\/\//i.test(rawTargetUrl) ? rawTargetUrl : 'https://' + rawTargetUrl);
                let targetHost = targetObj.hostname.replace(/^www\./, '');
                let targetPath = targetObj.pathname === '/' ? '' : targetObj.pathname;

                let linkObj = new URL(a.href);
                let linkHost = linkObj.hostname.replace(/^www\./, '');
                let linkPath = linkObj.pathname === '/' ? '' : linkObj.pathname;

                if ((linkHost === targetHost || linkHost.endsWith('.' + targetHost)) && linkPath.startsWith(targetPath)) {
                    isMatch = true;
                }
            } catch(e) {}

            if (!isMatch) {
                let textToSearch = a.innerText.toLowerCase() + " " + a.href.toLowerCase();
                let escapedTarget = rawTargetUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                let regex = new RegExp('(^|[^a-z0-9])' + escapedTarget + '([^a-z0-9]|$)', 'i');

                if (regex.test(textToSearch)) {
                    isMatch = true;
                }
            }
            
            if (isMatch) {
                foundLink = a;
                break;
            }
        }
        
        if (foundLink) {
            GM_setValue('as_isRunning', false); 
            foundLink.style.border = "4px solid #3b82f6";
            foundLink.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
            foundLink.style.boxShadow = "0 0 15px rgba(59, 130, 246, 0.5)";
            foundLink.style.transition = "all 0.5s";
            foundLink.style.borderRadius = "8px";
            
            startBtn.innerText = `Tìm thấy ở trang ${currentPage}!`;
            startBtn.style.background = '#10b981'; // Xanh lá cây
            
            foundLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            setTimeout(() => {
                startBtn.innerText = "Đang chuyển hướng...";
                foundLink.click();
                setTimeout(() => { window.location.href = foundLink.href; }, 1000);
            }, randomInt(1500, 3000));

        } else {
            if (currentPage >= MAX_PAGES) {
                startBtn.innerText = `Không thấy sau ${MAX_PAGES} trang.`;
                startBtn.style.background = '#ef4444'; // Đỏ
                GM_setValue('as_isRunning', false); GM_setValue('as_keyword', ''); GM_setValue('as_targetUrl', ''); GM_setValue('as_currentPage', 1);
                setTimeout(() => { window.location.href = window.location.origin; }, 1500);
                return;
            }
            
            startBtn.innerText = `Không thấy. Đang sang trang ${currentPage + 1}...`;
            
            humanScroll(() => {
                let nextBtn = document.querySelector('#pnnext, a[aria-label="Tiếp theo"], a[aria-label="Next page"]');
                
                if (!nextBtn) {
                    const allElements = document.querySelectorAll('div[role="button"], a, button, span');
                    for (let el of allElements) {
                        const text = el.innerText?.toLowerCase() || '';
                        if ((text.includes('kết quả tìm kiếm khác') || text.includes('more search results') || text.includes('xem thêm')) && el.offsetParent !== null) {
                            nextBtn = el;
                            while (nextBtn && nextBtn.tagName !== 'A' && nextBtn.tagName !== 'BUTTON' && nextBtn.getAttribute('role') !== 'button' && nextBtn.parentElement) {
                                if (nextBtn.tagName === 'BODY') break;
                                nextBtn = nextBtn.parentElement;
                            }
                            break;
                        }
                    }
                }

                if (nextBtn) {
                    GM_setValue('as_currentPage', currentPage + 1);
                    nextBtn.click();
                } else {
                    startBtn.innerText = "Hết kết quả từ Google.";
                    startBtn.style.background = '#ef4444'; // Đỏ
                    GM_setValue('as_isRunning', false); GM_setValue('as_keyword', ''); GM_setValue('as_targetUrl', ''); GM_setValue('as_currentPage', 1);
                    setTimeout(() => { window.location.href = window.location.origin; }, 1500);
                }
            });
        }
    }

    window.addEventListener('load', () => {
        if (GM_getValue('as_isRunning', false)) {
            openMenu();
            startBtn.disabled = true;
            startBtn.innerText = `Đang quét trang ${GM_getValue('as_currentPage', 1)}...`;
            setTimeout(executeSearchCore, randomInt(1000, 2500));
        }
    });

})();