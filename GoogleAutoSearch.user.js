// ==UserScript==
// @name         Google Auto Search
// @namespace    http://tampermonkey.net/
// @version      2.0.0
// @description  Modern Dark UI, Explicit Exact/Fuzzy Matching Modes
// @author       Nguyễn Văn Hòa
// @match        *://www.google.com/*
// @match        *://www.google.com.vn/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @connect      *
// ==/UserScript==

(function () {
    'use strict';

    if (window.top !== window.self) return;

    /* ==========================================
       MODULE 1: STATE MANAGEMENT
       ========================================== */
    const State = {
        get isRunning() { return GM_getValue('as_isRunning', false); },
        set isRunning(val) { GM_setValue('as_isRunning', val); },
        get keyword() { return GM_getValue('as_keyword', ''); },
        set keyword(val) { GM_setValue('as_keyword', val); },
        get targetUrl() { return GM_getValue('as_targetUrl', ''); },
        set targetUrl(val) { GM_setValue('as_targetUrl', val); },
        get matchMode() { return GM_getValue('as_matchMode', 'exact'); },
        set matchMode(val) { GM_setValue('as_matchMode', val); },
        get currentPage() { return GM_getValue('as_currentPage', 1); },
        set currentPage(val) { GM_setValue('as_currentPage', val); },
        get pos() { return GM_getValue('as_bubble_pos', null); },
        set pos(val) { GM_setValue('as_bubble_pos', val); },
        clear() {
            this.isRunning = false;
            this.keyword = '';
            this.targetUrl = '';
            this.currentPage = 1;
        }
    };

    /* ==========================================
       MODULE 2: UTILITIES (Helpers)
       ========================================== */
    const Utils = {
        randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
        sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
        
        getPointerCoords: (e) => {
            return e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
        },

        cleanDomain: (url) => {
            try {
                return new URL(url.startsWith('http') ? url : 'https://' + url).hostname.replace(/^www\./, '').toLowerCase();
            } catch {
                return url.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
            }
        }
    };

    /* ==========================================
       MODULE 3: CORE MATCHER
       ========================================== */
    const Matcher = {
        getSimilarity(a, b) {
            if (a === b) return 1.0;
            if (!a || !b) return 0.0;
            let costs = Array.from({ length: b.length + 1 }, (_, i) => i);
            
            for (let i = 1; i <= a.length; i++) {
                let lastValue = i;
                for (let j = 1; j <= b.length; j++) {
                    let newValue = costs[j - 1];
                    costs[j - 1] = lastValue;
                    lastValue = a.charAt(i - 1) === b.charAt(j - 1) ? newValue : Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                }
                costs[b.length] = lastValue;
            }
            const maxLength = Math.max(a.length, b.length);
            return (maxLength - costs[b.length]) / maxLength;
        },

        isFlexibleMatch(s1, s2) {
            if (!s1 || !s2) return false;
            
            const clean1 = s1.toLowerCase().replace(/[^a-z0-9]/g, '');
            const clean2 = s2.toLowerCase().replace(/[^a-z0-9]/g, '');
            
            if (clean1 === clean2) return true;

            const [shorter, longer] = clean1.length < clean2.length ? [clean1, clean2] : [clean2, clean1];
            if (shorter.length < 3 || longer.length > shorter.length * 2.5) return false;

            if (longer.includes(shorter) && shorter.length >= longer.length * 0.5) return true;

            return this.getSimilarity(clean1, clean2) >= 0.75;
        }
    };

    /* ==========================================
       MODULE 4: AUTOMATOR (DOM & Actions)
       ========================================== */
    const Automator = {
        async simulateTyping(keyword, searchBox) {
            searchBox.focus(); 
            searchBox.value = "";
            for (let char of keyword) {
                searchBox.value += char;
                searchBox.dispatchEvent(new Event('input', { bubbles: true }));
                await Utils.sleep(Utils.randomInt(50, 150));
            }
        },

        triggerSearch(keyword, targetUrl, searchBox) {
            State.isRunning = true;
            State.keyword = keyword;
            State.targetUrl = targetUrl;
            State.currentPage = 1;

            const enterEvent = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, keyCode: 13, key: 'Enter' });
            searchBox.dispatchEvent(enterEvent);
            setTimeout(() => searchBox.closest('form')?.submit(), 300);
        },

        async humanScroll(onFinish) {
            const totalHeight = document.body.scrollHeight - window.innerHeight;
            let currentScroll = window.scrollY;

            while (State.isRunning && currentScroll < totalHeight - 200) {
                currentScroll += Utils.randomInt(150, 400);
                window.scrollTo({ top: currentScroll, behavior: 'smooth' });
                await Utils.sleep(Utils.randomInt(300, 800));
            }
            await Utils.sleep(Utils.randomInt(1000, 2000));
            if (State.isRunning) onFinish();
        },

        highlightAndClick(link) {
            link.style.cssText = "border: 4px solid #3b82f6; background-color: rgba(59, 130, 246, 0.1); box-shadow: 0 0 15px rgba(59, 130, 246, 0.5); transition: all 0.5s; border-radius: 8px;";
            link.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
                link.click();
                setTimeout(() => window.location.href = link.href, 1000);
            }, Utils.randomInt(1500, 3000));
        }
    };

    /* ==========================================
       MODULE 5: UI MANAGER
       ========================================== */
    class UIManager {
        constructor() {
            this.BUBBLE_SIZE = 52;
            this.dragState = { isDragging: false, moved: false, startX: 0, startY: 0, xOffset: 0, yOffset: 0 };
            this.runTimer = null;
        }

        init() {
            this.injectStyles();
            this.buildDOM();
            this.bindEvents();
            this.restorePositions();
            this.checkResumeState();
        }

        injectStyles() {
            const style = document.createElement('style');
            style.textContent = `
                #as-bubble { position: fixed; bottom: 20px; right: 20px; width: 52px; height: 52px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; cursor: grab; z-index: 999999; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4); user-select: none; transition: transform 0.15s ease, box-shadow 0.15s ease; }
                #as-bubble:hover { transform: scale(1.05); } #as-bubble:active { cursor: grabbing; transform: scale(0.95); }
                #as-panel { 
                    position: fixed; width: 320px; max-width: 90vw; background: #1f2937; color: #f3f4f6; border: 1px solid #374151; border-radius: 16px; padding: 20px; z-index: 999998; box-shadow: 0 10px 30px rgba(0,0,0,0.5); display: none; flex-direction: column; gap: 12px; font-family: -apple-system, sans-serif;
                    transition: top 0.2s ease-out, left 0.2s ease-out; 
                }
                #as-panel h4 { margin: 0; font-size: 16px; font-weight: 600; }
                #as-panel input, #as-panel select { padding: 10px; background: #111827; color: #f9fafb; border: 1px solid #374151; border-radius: 8px; width: 100%; outline: none; box-sizing: border-box; font-size: 14px; }
                #as-panel input:focus, #as-panel select:focus { border-color: #3b82f6; }
                #as-panel select { cursor: pointer; }
                #as-panel button { padding: 10px; cursor: pointer; border: none; border-radius: 8px; font-weight: 600; transition: all 0.2s ease; margin-top: 4px; }
                .as-btn-primary { background: #3b82f6; color: white; } .as-btn-primary:hover:not(:disabled) { background: #2563eb; }
                .as-btn-danger { background: #ef4444; color: white; } .as-btn-danger:hover { background: #dc2626; }
                .as-btn-secondary { background: #374151; color: #d1d5db; } .as-btn-secondary:hover { background: #4b5563; color: white; }
                #as-panel button:disabled { background: #4b5563 !important; color: #9ca3af !important; cursor: not-allowed; }
                #as-close-btn { position: absolute; top: 16px; right: 16px; background: transparent; color: #9ca3af; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 20px; padding: 0; margin: 0; } #as-close-btn:hover { color: #ef4444; }
            `;
            document.head.appendChild(style);
        }

        buildDOM() {
            this.bubble = document.createElement('div');
            this.bubble.id = 'as-bubble';
            this.bubble.innerHTML = 'Auto';

            this.panel = document.createElement('div');
            this.panel.id = 'as-panel';
            this.panel.innerHTML = `
                <button id="as-close-btn" title="Thu nhỏ">×</button>
                <h4>Auto Search</h4>
                <input type="text" id="as-keyword" placeholder="Nhập từ khóa...">
                <input type="text" id="as-url" placeholder="Nhập URL / Tên miền...">
                <select id="as-match-mode">
                    <option value="exact">Chế độ: Chuẩn xác</option>
                    <option value="fuzzy">Chế độ: Tương đối</option>
                </select>
                <button id="as-start-btn" class="as-btn-primary">Bắt đầu tìm</button>
                <button id="as-stop-btn" class="as-btn-danger" style="display: none;">Dừng tìm</button>
                <button id="as-clear-btn" class="as-btn-secondary">Làm mới</button>
            `;

            document.body.append(this.bubble, this.panel);

            this.els = {
                keyword: document.getElementById('as-keyword'),
                url: document.getElementById('as-url'),
                matchMode: document.getElementById('as-match-mode'),
                startBtn: document.getElementById('as-start-btn'),
                stopBtn: document.getElementById('as-stop-btn'),
                clearBtn: document.getElementById('as-clear-btn'),
                closeBtn: document.getElementById('as-close-btn')
            };

            this.els.keyword.value = State.keyword;
            this.els.url.value = State.targetUrl;
            this.els.matchMode.value = State.matchMode;
        }

        bindEvents() {
            this.els.matchMode.addEventListener('change', (e) => {
                State.matchMode = e.target.value;
            });

            const startDrag = (e) => {
                if (e.type === 'mousedown' && e.button !== 0) return;
                const coords = Utils.getPointerCoords(e);
                if (e.target === this.bubble || this.bubble.contains(e.target)) {
                    this.dragState = { ...this.dragState, isDragging: true, moved: false, startX: coords.x - this.dragState.xOffset, startY: coords.y - this.dragState.yOffset };
                    this.bubble.style.transform = 'scale(0.9)';
                }
            };

            const doDrag = (e) => {
                if (!this.dragState.isDragging) return;
                const coords = Utils.getPointerCoords(e);
                if (!this.dragState.moved && Math.abs(coords.x - this.dragState.startX - this.dragState.xOffset) < 5) return;

                this.dragState.moved = true;
                if (e.cancelable) e.preventDefault();

                const curX = Math.max(0, Math.min(window.innerWidth - this.BUBBLE_SIZE, coords.x - this.dragState.startX));
                const curY = Math.max(0, Math.min(window.innerHeight - this.BUBBLE_SIZE, coords.y - this.dragState.startY));
                
                this.dragState.xOffset = curX;
                this.dragState.yOffset = curY;
                this.bubble.style.cssText += `left: ${curX}px; top: ${curY}px; right: auto; bottom: auto;`;
            };

            const endDrag = (e) => {
                if (!this.dragState.isDragging) return;
                this.dragState.isDragging = false;
                this.bubble.style.transform = 'scale(1)';

                if (this.dragState.moved) {
                    State.pos = { x: this.dragState.xOffset, y: this.dragState.yOffset };
                } else {
                    if (e.type === 'touchend' && e.cancelable) e.preventDefault();
                    this.toggleMenu(true);
                }
            };

            this.bubble.addEventListener('touchstart', startDrag, { passive: false });
            window.addEventListener('touchmove', doDrag, { passive: false });
            window.addEventListener('touchend', endDrag);
            this.bubble.addEventListener('mousedown', startDrag);
            window.addEventListener('mousemove', doDrag);
            window.addEventListener('mouseup', endDrag);
            this.panel.addEventListener('mousedown', e => e.stopPropagation());
            this.panel.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });

            this.els.closeBtn.addEventListener('click', () => {
                if (State.isRunning) { State.isRunning = false; clearTimeout(this.runTimer); }
                this.resetButtons();
                this.toggleMenu(false);
            });

            this.els.clearBtn.addEventListener('click', () => {
                this.els.keyword.value = ''; this.els.url.value = '';
                State.keyword = ''; State.targetUrl = '';
            });

            this.els.stopBtn.addEventListener('click', () => {
                State.isRunning = false;
                clearTimeout(this.runTimer);
                this.els.startBtn.innerText = "Đã dừng tìm kiếm";
                this.els.startBtn.style.background = '#757575';
                this.els.stopBtn.style.display = 'none';
                setTimeout(() => this.resetButtons(), 2000);
            });

            this.els.startBtn.addEventListener('click', () => this.handleStartSearch());

            if (window.visualViewport) {
                let isPending = false;
                const updatePos = () => {
                    if (!isPending) {
                        isPending = true;
                        requestAnimationFrame(() => {
                            this.updatePanelPosition();
                            isPending = false;
                        });
                    }
                };
                window.visualViewport.addEventListener('resize', updatePos);
                window.visualViewport.addEventListener('scroll', updatePos);
            }
        }

        restorePositions() {
            const pos = State.pos;
            if (pos) {
                this.dragState.xOffset = pos.x;
                this.dragState.yOffset = pos.y;
            } else {
                const rect = this.bubble.getBoundingClientRect();
                this.dragState.xOffset = rect.left;
                this.dragState.yOffset = rect.top;
            }
            this.bubble.style.cssText += `left: ${this.dragState.xOffset}px; top: ${this.dragState.yOffset}px; right: auto; bottom: auto;`;
        }

        updatePanelPosition() {
            if (this.panel.style.display !== 'flex') return;

            const pW = this.panel.offsetWidth || 320;
            const pH = this.panel.offsetHeight || 280;
            
            const vW = window.visualViewport ? window.visualViewport.width : window.innerWidth;
            const vH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
            
            const vX = window.visualViewport ? window.visualViewport.pageLeft || window.visualViewport.offsetLeft : 0;
            const vY = window.visualViewport ? window.visualViewport.pageTop || window.visualViewport.offsetTop : 0;

            let left = this.dragState.xOffset < (vW / 2) 
                ? this.dragState.xOffset + this.BUBBLE_SIZE + 10 
                : this.dragState.xOffset - pW - 10;
                
            let top = this.dragState.yOffset < (vH / 2) 
                ? this.dragState.yOffset 
                : this.dragState.yOffset + this.BUBBLE_SIZE - pH;

            left = Math.max(vX + 10, Math.min(vX + vW - pW - 10, left));
            top = Math.max(vY + 10, Math.min(vY + vH - pH - 10, top));

            this.panel.style.left = `${left}px`;
            this.panel.style.top = `${top}px`;
            this.panel.style.bottom = 'auto'; 
            this.panel.style.right = 'auto';
            this.panel.style.transform = 'none';
        }

        toggleMenu(show) {
            this.panel.style.display = show ? 'flex' : 'none';
            this.bubble.style.display = show ? 'none' : 'flex';

            if (show) {
                this.updatePanelPosition();
            } else {
                this.bubble.style.left = `${this.dragState.xOffset}px`;
                this.bubble.style.top = `${this.dragState.yOffset}px`;
            }
        }

        resetButtons() {
            this.els.startBtn.innerText = "Bắt đầu tìm";
            this.els.startBtn.disabled = false;
            this.els.startBtn.className = "as-btn-primary";
            this.els.startBtn.style.background = ''; 
            this.els.stopBtn.style.display = 'none';
        }

        handleStartSearch() {
            const keyword = this.els.keyword.value.trim();
            const targetUrl = this.els.url.value.trim();

            if (!keyword || !targetUrl) return alert("Vui lòng nhập đủ thông tin!");
            
            const cleanTarget = Utils.cleanDomain(targetUrl);
            const finalUrl = `https://${cleanTarget}`;

            this.els.startBtn.innerText = "Đang ping URL...";
            this.els.startBtn.disabled = true;

            const execute = async () => {
                this.els.startBtn.innerText = "Đang gõ từ khóa...";
                const searchBox = document.querySelector('textarea[name="q"], input[name="q"]');
                if (!searchBox) return alert("Không tìm thấy thanh tìm kiếm Google!");
                
                await Automator.simulateTyping(keyword, searchBox);
                await Utils.sleep(Utils.randomInt(500, 1000));
                Automator.triggerSearch(keyword, cleanTarget, searchBox);
            };

            GM_xmlhttpRequest({
                method: "HEAD", url: finalUrl, timeout: 5000,
                onload: (res) => {
                    if ((res.status >= 200 && res.status < 400) || res.status === 403) {
                        execute();
                    } else if (confirm(`Trang web trả về lỗi ${res.status}. Bạn có muốn BỎ QUA và tiếp tục?`)) {
                        execute();
                    } else this.resetButtons();
                },
                onerror: () => confirm(`Lỗi mạng/CORS khi ping URL. Bỏ qua và tiếp tục tìm kiếm?`) ? execute() : this.resetButtons(),
                ontimeout: () => confirm(`Ping Timeout. Bỏ qua và tiếp tục tìm kiếm?`) ? execute() : this.resetButtons()
            });
        }

        checkResumeState() {
            if (State.isRunning) {
                this.toggleMenu(true);
                this.els.startBtn.disabled = true;
                this.els.startBtn.innerText = `Đang quét trang ${State.currentPage}...`;
                this.els.stopBtn.style.display = 'block';
                this.runTimer = setTimeout(() => this.scanPage(), Utils.randomInt(1000, 2500));
            }
        }

        scanPage() {
            if (!State.isRunning) return;

            const mode = State.matchMode;
            const rawTarget = State.targetUrl.toLowerCase().trim();
            const cleanInput = Utils.cleanDomain(rawTarget);
            const inputNoExt = cleanInput.split('.')[0];

            const MAX_PAGES = 10;
            const links = Array.from(document.querySelectorAll('#search a[href^="http"], #rso a[href^="http"]')).filter(a => !a.href.includes('google.'));
                
            let foundLink = null;

            for (let a of links) {
                const linkHost = Utils.cleanDomain(a.href);

                if (mode === 'exact') {
                    if (linkHost === cleanInput || linkHost.startsWith(`${cleanInput}.`)) {
                        foundLink = a;
                        break;
                    }
                } else if (mode === 'fuzzy') {
                    if (linkHost.includes(cleanInput)) {
                        foundLink = a;
                        break;
                    }

                    const hostMain = linkHost.split('.')[0];
                    if (Matcher.isFlexibleMatch(hostMain, inputNoExt)) {
                        foundLink = a;
                        break;
                    }

                    const visualElements = (a.closest('.g, .xpd, .F9iR2e, .Ww4FFb') || a).querySelectorAll('cite, .VuuXrf');
                    for (let el of visualElements) {
                        const domainOnly = (el.innerText || "").split(/[›>]/)[0].toLowerCase().trim().replace(/ /g, '').split('.')[0];
                        if (domainOnly.length <= inputNoExt.length * 3 && Matcher.isFlexibleMatch(domainOnly, inputNoExt)) {
                            foundLink = a;
                            break;
                        }
                    }
                }
            }
            
            if (foundLink) {
                State.isRunning = false;
                this.els.stopBtn.style.display = 'none';
                this.els.startBtn.innerText = `Tìm thấy ở trang ${State.currentPage}!`;
                this.els.startBtn.style.background = '#10b981';
                Automator.highlightAndClick(foundLink);
            } else {
                this.handlePagination(MAX_PAGES);
            }
        }

        handlePagination(MAX_PAGES) {
            if (State.currentPage >= MAX_PAGES) {
                this.terminateScan(`Không thấy sau ${MAX_PAGES} trang.`);
                return;
            }
            
            this.els.startBtn.innerText = `Không thấy. Đang sang trang ${State.currentPage + 1}...`;
            
            Automator.humanScroll(() => {
                let nextBtn = document.querySelector('#pnnext, a[aria-label="Tiếp theo"], a[aria-label="Next page"]');
                let isDynamicLoad = false;
                
                if (!nextBtn) {
                    const els = document.querySelectorAll('div[role="button"], a, button, span');
                    for (let el of els) {
                        const text = el.innerText?.toLowerCase() || '';
                        if (['kết quả tìm kiếm khác', 'more search results', 'xem thêm'].some(t => text.includes(t)) && el.offsetParent !== null) {
                            nextBtn = el.closest('a, button, div[role="button"]') || el;
                            isDynamicLoad = true;
                            break;
                        }
                    }
                }

                if (nextBtn) {
                    State.currentPage += 1;
                    nextBtn.click();

                    if (isDynamicLoad) {
                        this.els.startBtn.innerText = `Đang tải thêm kết quả...`;
                        setTimeout(() => {
                            this.scanPage(); 
                        }, 2500); 
                    }
                } else {
                    this.terminateScan("Hết kết quả từ Google.");
                }
            });
        }

        terminateScan(msg) {
            this.els.startBtn.innerText = msg;
            this.els.startBtn.style.background = '#ef4444'; 
            this.els.stopBtn.style.display = 'none';
            State.clear();
            setTimeout(() => window.location.href = window.location.origin, 1500);
        }
    }

    const app = new UIManager();
    window.addEventListener('load', () => app.init());

})();