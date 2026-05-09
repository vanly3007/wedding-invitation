/* ================================================
   TEMPLATE 23 - SCRIPT LOGIC
   ================================================ */

document.addEventListener('DOMContentLoaded', () => {
    // Force reload to start at top (avoid browser scroll restore)
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    const scroller =
        document.getElementById('appScroll') ||
        document.querySelector('.app-scroll') ||
        document.querySelector('.app-container') ||
        window;
    if (scroller !== window) scroller.scrollTop = 0;
    else window.scrollTo(0, 0);

    // 1. Hide Loading Screen
    const loadingScreen = document.getElementById('loadingScreen');
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
    }, 1500);

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // Birth footer: split text into chars for color sweep
    const birthFooter = document.querySelector('.birth-footer');
    if (birthFooter && !birthFooter.querySelector('.bf-char')) {
        const text = birthFooter.textContent ?? '';
        birthFooter.textContent = '';
        let i = 0;
        for (const ch of text) {
            const span = document.createElement('span');
            span.className = 'bf-char';
            // Keep spaces renderable
            span.textContent = ch === ' ' ? '\u00A0' : ch;
            span.style.setProperty('--i', String(i));
            birthFooter.appendChild(span);
            i += 1;
        }
    }

    // Story section choreography (runs once)
    // 1) Intro: side-title from left, red-sidebar from right
    // 2) Scroll: story-header split text
    // 3) Scroll: family groups from bottom, group 1 then group 2
    const parentsInfo = document.querySelector('.parents-info');
    const familyGroups = Array.from(document.querySelectorAll('.parents-info .family-group'));

    // Kick off intro ASAP (even before scrolling)
    if (parentsInfo) {
        requestAnimationFrame(() => {
            parentsInfo.classList.add('is-intro-in');
        });
    }

    const runFamilySequence = async () => {
        if (!parentsInfo || familyGroups.length < 2) return;
        // Let intro settle a bit
        await sleep(650);
        familyGroups[0]?.classList.add('is-in');
        // Wait for group 1 to complete, then group 2
        await sleep(1500);
        familyGroups[1]?.classList.add('is-in');
        await sleep(1600);
    };

    // Auto-play once from top to bottom on every load/reload.
    // Goal: continuous smooth scroll (no step-wise "waiting"), while elements animate when entering viewport.
    const runAutoPlay = async () => {
        const animatedEls = Array.from(document.querySelectorAll('[data-animate]'));
        if (!animatedEls.length) return;

        // Stage gate: event-opening animations should start after parents-info sequence finishes
        const eventStageEls = animatedEls.filter((el) => el.closest('.event-opening'));
        let allowEventStage = false;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    const el = entry.target;

                    if (el.closest('.event-opening') && !allowEventStage) return;

                    // Defer so transitions run reliably
                    requestAnimationFrame(() => el.classList.add('visible'));

                    // Parents-info is the gate for the family sequence
                    if (el === parentsInfo) {
                        // startFamilyIfNeeded is defined later; call via microtask
                        Promise.resolve().then(() => {
                            // eslint-disable-next-line no-use-before-define
                            if (typeof startFamilyIfNeeded === 'function') startFamilyIfNeeded();
                        });
                    }
                });
            },
            { threshold: 0.12, root: scroller === window ? null : scroller }
        );

        animatedEls.forEach((el) => observer.observe(el));

        const doc = document.documentElement;

        // During autoplay, disable CSS smooth scrolling to avoid browser queuing/lag.
        const prevScrollBehavior = doc.style.scrollBehavior;
        doc.style.scrollBehavior = 'auto';
        let prevContainerScrollBehavior = '';
        if (scroller !== window) {
            prevContainerScrollBehavior = scroller.style.scrollBehavior;
            scroller.style.scrollBehavior = 'auto';
        }

        // Ensure top
        if (scroller !== window) scroller.scrollTop = 0;
        else window.scrollTo(0, 0);
        await sleep(1600); // wait for loading screen to fade

        // Wait for images/layout to stabilize so maxScroll doesn't change mid-tour (causes jumps)
        const waitForLoadOrTimeout = () =>
            new Promise((resolve) => {
                if (document.readyState === 'complete') return resolve();
                const t = setTimeout(resolve, 2500);
                window.addEventListener(
                    'load',
                    () => {
                        clearTimeout(t);
                        resolve();
                    },
                    { once: true }
                );
            });
        await waitForLoadOrTimeout();

        // When parents-info becomes visible (through the same observer), run its internal sequence,
        // then open event stage. (Avoid a separate observer that can miss on mobile.)
        let familyStarted = false;
        const startFamilyIfNeeded = () => {
            if (familyStarted) return;
            familyStarted = true;
            runFamilySequence()
                .then(() => {
                    allowEventStage = true;
                    // Reveal any event elements we already scrolled past / into view.
                    const currentY = scroller === window ? window.scrollY : scroller.scrollTop;
                    const viewH = scroller === window ? window.innerHeight : scroller.clientHeight;
                    const cutoff = currentY + viewH * 0.95;
                    eventStageEls.forEach((el) => {
                        const topAbs = el.getBoundingClientRect().top + currentY;
                        if (topAbs <= cutoff) {
                            el.classList.add('visible');
                        }
                    });
                })
                .catch(() => {});
        };

        // Smooth continuous scroll using requestAnimationFrame.
        // Use "speed-based" scrolling (not time-mapping to initial height) to avoid early stop
        // when late-loading assets increase scrollHeight.
        const desiredDurationMs = 32000; // faster
        let lastTs = performance.now();
        let bottomFrames = 0;
        let nearBottomForMs = 0;
        let lastY = scroller === window ? window.scrollY : scroller.scrollTop;
        let stuckForMs = 0;

        await new Promise((resolve) => {
            const tick = (now) => {
                const dt = Math.min(64, now - lastTs); // clamp to keep stable
                lastTs = now;

                const maxScrollNow =
                    scroller === window
                        ? Math.max(0, doc.scrollHeight - window.innerHeight)
                        : Math.max(0, scroller.scrollHeight - scroller.clientHeight);
                // Speed adjusts with page length; ease a bit near top/bottom
                const currentY = scroller === window ? window.scrollY : scroller.scrollTop;
                const progress = maxScrollNow > 0 ? currentY / maxScrollNow : 0;
                const remaining = maxScrollNow - currentY;

                // Stop only when we're truly at the bottom.
                // On mobile, innerHeight/scrollHeight can fluctuate mid-page and make remaining ~0 briefly.
                const isReallyNearBottom = progress > 0.985 && remaining <= 2;
                if (isReallyNearBottom) {
                    bottomFrames += 1;
                    nearBottomForMs += dt;
                    if (bottomFrames >= 20 && nearBottomForMs >= 450) return resolve();
                } else {
                    bottomFrames = 0;
                    nearBottomForMs = 0;
                }

                const ease = progress < 0.5 ? 0.65 + progress * 0.7 : 0.65 + (1 - progress) * 0.7;
                const pxPerMs = (maxScrollNow / desiredDurationMs) * ease;
                const step = Math.max(1.4, pxPerMs * dt);

                const nextY = currentY + step;
                if (scroller === window) window.scrollTo(0, nextY);
                else scroller.scrollTop = nextY;

                // Kick family sequence as soon as parents-info is revealed
                if (!familyStarted && parentsInfo?.classList.contains('visible')) {
                    startFamilyIfNeeded();
                }

                // Watchdog: if scroll position doesn't change (layout jank / smooth-scroll queue), nudge forward
                const yNow = scroller === window ? window.scrollY : scroller.scrollTop;
                if (Math.abs(yNow - lastY) < 0.5) {
                    stuckForMs += dt;
                    if (stuckForMs > 700) {
                        if (scroller === window) window.scrollTo(0, yNow + 120);
                        else scroller.scrollTop = yNow + 120;
                        stuckForMs = 0;
                    }
                } else {
                    stuckForMs = 0;
                }
                lastY = yNow;
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        });

        // End: stop observers and disable scroll-triggered animations afterwards.
        observer.disconnect();
        animatedEls.forEach((el) => el.removeAttribute('data-animate'));

        // Restore scroll behavior
        doc.style.scrollBehavior = prevScrollBehavior;
        if (scroller !== window) scroller.style.scrollBehavior = prevContainerScrollBehavior;
    };

    runAutoPlay().catch((e) => console.error('AutoPlay error', e));

    // 2.5 Generate QR Code
    const qrContainer = document.getElementById("qrcode");
    if (qrContainer) {
        new QRCode(qrContainer, {
            text: window.location.href,
            width: 200,
            height: 200,
            colorDark: "#333333",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }

    // 2.6 Generate Floating QR (desktop widget)
    const qrFloatContainer = document.getElementById("qrcodeFloat");
    if (qrFloatContainer) {
        qrFloatContainer.innerHTML = '';
        new QRCode(qrFloatContainer, {
            text: window.location.href,
            width: 150,
            height: 150,
            colorDark: "#111111",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }

    // // 3. Floating Bubbles in Hero
    // const bubbleContainer = document.getElementById('bubbleContainer');
    // const messages = [
    //     "Ch�c m?ng h?nh ph�c! ??",
    //     "M�i y�u nh�! ?",
    //     "Tr?m n?m h?nh ph�c nha",
    //     "Tuy?t v?i qu� ?i!",
    //     "Ch? ng�y n�y l�u l?m r?i",
    //     "H?i ??ng & Minh Nguy?t",
    //     "H?nh ph�c nha!",
    //     "Qu� l� x?ng ?�i lu�n",
    //     "G?i ng�n l?i ch�c t?t ??p",
    //     "T�nh y�u v?nh c?u"
    // ];

    function createBubble() {
        if (typeof bubbleContainer === 'undefined' || !bubbleContainer) return;
        if (typeof messages === 'undefined' || !Array.isArray(messages) || messages.length === 0) return;
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        const msg = messages[Math.floor(Math.random() * messages.length)];
        bubble.innerText = msg;
        
        // Random horizontal position
        const left = Math.random() * 80 + 10; // 10% to 90%
        bubble.style.left = `${left}%`;
        
        // Random duration
        const duration = 10 + Math.random() * 10; // 10s to 20s
        bubble.style.animationDuration = `${duration}s`;
        
        // Random delay
        bubble.style.animationDelay = `${Math.random() * 5}s`;
        
        bubbleContainer.appendChild(bubble);
        
        // Remove after animation
        setTimeout(() => {
            bubble.remove();
        }, (duration + 5) * 1000);
    }

    // Start generating bubbles
    // Bubbles are optional; only start if config exists.
    if (typeof bubbleContainer !== 'undefined' && bubbleContainer && typeof messages !== 'undefined' && Array.isArray(messages)) {
        for(let i=0; i<5; i++) {
            setTimeout(createBubble, i * 2000);
        }
        setInterval(createBubble, 4000);
    }
});

// 4. Music Logic
const bgAudio = document.getElementById('bgAudio');
const musicToggle = document.getElementById('musicToggle');
let isPlaying = false;

function toggleMusic() {
    if (!bgAudio || !musicToggle) return;
    if (isPlaying) {
        bgAudio.pause();
        musicToggle.classList.remove('playing');
        isPlaying = false;
    } else {
        bgAudio.play().catch(e => console.log('Audio blocked', e));
        musicToggle.classList.add('playing');
        isPlaying = true;
    }
}

// 5. Heart Spray Logic
let heartCountNum = 26;
function sprayHearts(e) {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    heartCountNum++;
    document.getElementById('heartCount').innerText = heartCountNum;

    // Create 10 spray hearts
    for (let i = 0; i < 10; i++) {
        const heart = document.createElement('div');
        heart.innerText = '?';
        heart.className = 'heart-spray';
        heart.style.left = `${centerX}px`;
        heart.style.top = `${centerY}px`;
        
        // Random direction
        const dx = (Math.random() - 0.5) * 400; // Left/right spread
        const dy = -(Math.random() * 400 + 200); // Upwards
        
        heart.style.setProperty('--dx', `${dx}px`);
        heart.style.setProperty('--dy', `${dy}px`);
        
        document.body.appendChild(heart);
        
        setTimeout(() => {
            heart.remove();
        }, 1000);
    }
}

// 6. Interactive Actions
function submitRSVP() {
    const name = document.getElementById('rsvp_name').value;
    if(!name) {
        alert('Vui l�ng nh?p t�n c?a b?n!');
        return;
    }
    document.getElementById('rsvpForm').style.display = 'none';
    document.getElementById('rsvpThanks').style.display = 'block';
}

function sendWish() {
    const input = document.getElementById('wishInput');
    if(!input.value) return;
    
    alert('C?m ?n b?n ?� g?i l?i ch�c: ' + input.value);
    input.value = '';
}

function showGiftModal() {
    alert('Th�ng tin chuy?n kho?n: \n- Ng�n h�ng: VCB \n- STK: 1234567890 \n- Ch? TK: NGUYEN HAI DANG');
}

// 7. QR Modal Controls
function openQrModal() {
    document.getElementById('qrModal')?.classList.add('open');
}

function closeQrModal() {
    document.getElementById('qrModal')?.classList.remove('open');
}

function minimizeFloatQr(e) {
    e?.stopPropagation?.();
    const el = document.getElementById('qrFloatBtn');
    if (el) el.classList.add('is-minimized');
}

function restoreFloatQr() {
    const el = document.getElementById('qrFloatBtn');
    if (el) el.classList.remove('is-minimized');
}

// 8. Countdown Timer Logic (for the new Maroon boxes)
const weddingDate = new Date("Dec 25, 2025 12:00:00").getTime();

const countdownInterval = setInterval(() => {
    const now = new Date().getTime();
    const distance = weddingDate - now;

    if (distance < 0) {
        clearInterval(countdownInterval);
        return;
    }

    const d = Math.floor(distance / (1000 * 60 * 60 * 24));
    const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((distance % (1000 * 60)) / 1000);

    const dEl = document.getElementById("days");
    const hEl = document.getElementById("hours");
    const mEl = document.getElementById("minutes");
    const sEl = document.getElementById("seconds");

    if (dEl) dEl.innerText = d.toString().padStart(2, '0');
    if (hEl) hEl.innerText = h.toString().padStart(2, '0');
    if (mEl) mEl.innerText = m.toString().padStart(2, '0');
    if (sEl) sEl.innerText = s.toString().padStart(2, '0');
}, 1000);

/* ================================================
   GIFT MODAL LOGIC
   ================================================ */
function openGiftModal() {
  document.getElementById('giftModal')?.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeGiftModal() {
  document.getElementById('giftModal')?.classList.remove('active');
  document.body.style.overflow = 'auto';
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert('�� sao ch�p s? t�i kho?n: ' + text);
  }).catch(err => {
    console.error('L?i khi sao ch�p: ', err);
  });
}

// Close modal when clicking outside
window.onclick = function(event) {
  let modal = document.getElementById('giftModal');
  if (event.target == modal) {
    closeGiftModal();
  }
};
