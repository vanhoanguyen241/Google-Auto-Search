// ==UserScript==
// @name         Google Auto-Search & Scraper (Final)
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Floating UI, Pre-flight Check, Regex Word Boundary & Auto-Scraping (AutoBypassPro UI)
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
       PHẦN 1: FOUNDATION UI (GIAO DIỆN)
       ========================================== */
    const style = document.createElement('style');
    style.textContent = `
        #auto-search-bubble { position: fixed; bottom: 20px; right: 20px; width: 50px; height: 50px; background-color: #4CAF50; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; cursor: grab; z-index: 999999; box-shadow: 0 4px 8px rgba(0,0,0,0.3); user-select: none; transition: transform 0.1s; }
        #auto-search-bubble:active { cursor: grabbing; }
        #auto-search-panel { position: fixed; bottom: 80px; right: 20px; width: 300px; max-width: 90vw; background: white; border: 1px solid #ccc; border-radius: 8px; padding: 15px; z-index: 999998; box-shadow: 0 4px 12px rgba(0,0,0,0.2); display: none; flex-direction: column; gap: 10px; font-family: Arial, sans-serif; color: #333; }
        #auto-search-panel h4 { margin: 0; padding-right: 30px; text-align: left; }
        #auto-search-panel input { padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; width: 100%; }
        #auto-search-panel button { padding: 8px; cursor: pointer; border: none; border-radius: 4px; font-weight: bold; }
        #auto-search-panel .start-btn { background: #2196F3; color: white; }
        #auto-search-panel .reset-btn { background: #757575; color: white; }
        #auto-search-panel .close-btn { position: absolute; top: 12px; right: 12px; background: #f44336; color: white; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 14px; border-radius: 4px; line-height: 1; padding: 0;}
        #auto-search-panel button:disabled { background: #9e9e9e !important; cursor: not-allowed; }
    `;
    document.head.appendChild(style);

    const bubble = document.createElement('div');
    bubble.id = 'auto-search-bubble';
    bubble.innerHTML = '🔍';
    document.body.appendChild(bubble);

    const panel = document.createElement('div');
    panel.id = 'auto-search-panel';
    panel.innerHTML = `
        <button id="as-close-btn" class="close-btn">-</button>
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
    const BUBBLE_SIZE = 50;
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
        bubble.style.display = 'none';
        panel.style.display = 'flex';
        
        const rect = bubble.getBoundingClientRect();
        const pW = panel.offsetWidth;
        const pH = panel.offsetHeight;
        
        const left = rect.left < window.innerWidth / 2 ? rect.left + BUBBLE_SIZE + 10 : rect.left - pW - 10;
        const top = rect.top < window.innerHeight / 2 ? rect.top : rect.top + BUBBLE_SIZE - pH;
        
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

    // Logic xử lý nút Làm mới
    clearBtn.addEventListener('click', () => {
        keywordInput.value = '';
        urlInput.value = '';
        GM_setValue('as_keyword', '');
        GM_setValue('as_targetUrl', '');
    });

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
            foundLink.style.border = "4px solid #ff0000";
            foundLink.style.backgroundColor = "#fff3cd";
            foundLink.style.boxShadow = "0 0 15px rgba(255,0,0,0.8)";
            foundLink.style.transition = "all 0.5s";
            
            startBtn.innerText = `Tìm thấy ở trang ${currentPage}!`;
            startBtn.style.background = '#4CAF50';
            
            foundLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            setTimeout(() => {
                startBtn.innerText = "Đang chuyển hướng...";
                foundLink.click();
                setTimeout(() => { window.location.href = foundLink.href; }, 1000);
            }, randomInt(1500, 3000));

        } else {
            if (currentPage >= MAX_PAGES) {
                startBtn.innerText = `Không thấy sau ${MAX_PAGES} trang. Đang reset...`;
                GM_setValue('as_isRunning', false); GM_setValue('as_keyword', ''); GM_setValue('as_targetUrl', ''); GM_setValue('as_currentPage', 1);
                setTimeout(() => { window.location.href = window.location.origin; }, 1000);
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
                    startBtn.innerText = "Hết kết quả từ Google. Đang reset...";
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