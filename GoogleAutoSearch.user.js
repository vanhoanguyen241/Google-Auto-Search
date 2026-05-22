// ==UserScript==
// @name         Google Auto-Search & Scraper (Phase 1 - Fixed)
// @namespace    http://tampermonkey.net/
// @version      0.1.1
// @description  Floating UI cho Google Search Automation (Đã fix lỗi click)
// @author       Nguyễn Văn Hòa
// @match        *://www.google.com/*
// @match        *://www.google.com.vn/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    // 1. Bơm CSS cục bộ
    const style = document.createElement('style');
    style.textContent = `
        #auto-search-bubble {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            background-color: #4CAF50;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            cursor: grab;
            z-index: 999999;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            user-select: none;
            transition: transform 0.1s;
        }
        #auto-search-bubble:active { cursor: grabbing; transform: scale(0.95); }
        #auto-search-panel {
            position: fixed;
            bottom: 80px;
            right: 20px;
            width: 300px;
            max-width: 90vw;
            background: white;
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 15px;
            z-index: 999998;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            display: none;
            flex-direction: column;
            gap: 10px;
            font-family: Arial, sans-serif;
            color: #333;
        }
        #auto-search-panel h4 { margin: 0; text-align: center; }
        #auto-search-panel input { padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
        #auto-search-panel button { padding: 8px; cursor: pointer; border: none; border-radius: 4px; background: #2196F3; color: white; font-weight: bold; }
        #auto-search-panel button.close-btn { background: #f44336; }
    `;
    document.head.appendChild(style);

    // 2. Tạo Element
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

    // Ngăn chặn việc click/kéo thả bên trong panel kích hoạt nhầm ra document
    panel.addEventListener('mousedown', e => e.stopPropagation());
    panel.addEventListener('touchstart', e => e.stopPropagation(), {passive: true});

    // 3. Logic Kéo Thả (Drag & Drop) Đã Fix
    let isInteraction = false; // Cờ theo dõi xem thao tác có bắt đầu từ bong bóng không
    let isClick = true;
    let initialX, initialY;

    function dragStart(e) {
        isInteraction = true; 
        isClick = true;
        
        const clientX = e.type === "touchstart" ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === "touchstart" ? e.touches[0].clientY : e.clientY;
        
        initialX = clientX - bubble.getBoundingClientRect().left;
        initialY = clientY - bubble.getBoundingClientRect().top;
    }

    function drag(e) {
        if (!isInteraction) return; // Nếu không chạm từ bong bóng thì bỏ qua
        isClick = false; 
        
        if(e.type === "touchmove") e.preventDefault(); 

        const clientX = e.type === "touchmove" ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === "touchmove" ? e.touches[0].clientY : e.clientY;

        let currentX = clientX - initialX;
        let currentY = clientY - initialY;

        const maxX = window.innerWidth - bubble.offsetWidth;
        const maxY = window.innerHeight - bubble.offsetHeight;
        currentX = Math.max(0, Math.min(currentX, maxX));
        currentY = Math.max(0, Math.min(currentY, maxY));

        bubble.style.left = currentX + "px";
        bubble.style.top = currentY + "px";
        bubble.style.bottom = "auto";
        bubble.style.right = "auto";
    }

    function dragEnd(e) {
        if (!isInteraction) return; // Bỏ qua mọi cú nhả chuột không bắt nguồn từ bong bóng
        isInteraction = false;
        
        if (isClick) {
            togglePanel();
        } else {
            updatePanelPosition();
        }
    }

    bubble.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    bubble.addEventListener('touchstart', dragStart, {passive: false});
    document.addEventListener('touchmove', drag, {passive: false});
    document.addEventListener('touchend', dragEnd);

    // 4. Logic Ẩn/Hiện
    function updatePanelPosition() {
        if (panel.style.display !== 'flex') return;
        
        const bubbleRect = bubble.getBoundingClientRect();
        panel.style.bottom = "auto";
        panel.style.right = "auto";
        
        if (bubbleRect.top > 250) {
            panel.style.top = (bubbleRect.top - panel.offsetHeight - 15) + "px";
        } else {
            panel.style.top = (bubbleRect.bottom + 15) + "px";
        }
        
        panel.style.left = Math.min(
            Math.max(10, bubbleRect.left - (panel.offsetWidth / 2) + 25), 
            window.innerWidth - panel.offsetWidth - 10
        ) + "px";
    }

    function togglePanel() {
        if (panel.style.display === 'flex') {
            panel.style.display = 'none';
        } else {
            panel.style.display = 'flex';
            requestAnimationFrame(updatePanelPosition);
        }
    }

    // Nút thu nhỏ giờ đã hoạt động độc lập và an toàn
    document.getElementById('as-close-btn').addEventListener('click', togglePanel);

})();