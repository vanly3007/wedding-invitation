/* ================================================
   TEMPLATE 23 - SCRIPT LOGIC
   ================================================ */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Hide Loading Screen
    const loadingScreen = document.getElementById('loadingScreen');
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
    }, 1500);

    // 2. Animate on Scroll
    const observerOptions = {
        threshold: 0.1
    };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));

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

    // // 3. Floating Bubbles in Hero
    // const bubbleContainer = document.getElementById('bubbleContainer');
    // const messages = [
    //     "Chúc mừng hạnh phúc! 🌸",
    //     "Mãi yêu nhé! ❤",
    //     "Trăm năm hạnh phúc nha",
    //     "Tuyệt vời quá đi!",
    //     "Chờ ngày này lâu lắm rồi",
    //     "Hải Đăng & Minh Nguyệt",
    //     "Hạnh phúc nha!",
    //     "Quá là xứng đôi luôn",
    //     "Gửi ngàn lời chúc tốt đẹp",
    //     "Tình yêu vĩnh cửu"
    // ];

    function createBubble() {
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
    for(let i=0; i<5; i++) {
        setTimeout(createBubble, i * 2000);
    }
    setInterval(createBubble, 4000);
});

// 4. Music Logic
const bgAudio = document.getElementById('bgAudio');
const musicToggle = document.getElementById('musicToggle');
let isPlaying = false;

function toggleMusic() {
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
        heart.innerText = '❤';
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
        alert('Vui lòng nhập tên của bạn!');
        return;
    }
    document.getElementById('rsvpForm').style.display = 'none';
    document.getElementById('rsvpThanks').style.display = 'block';
}

function sendWish() {
    const input = document.getElementById('wishInput');
    if(!input.value) return;
    
    alert('Cảm ơn bạn đã gửi lời chúc: ' + input.value);
    input.value = '';
}

function showGiftModal() {
    alert('Thông tin chuyển khoản: \n- Ngân hàng: VCB \n- STK: 1234567890 \n- Chủ TK: NGUYEN HAI DANG');
}

// 7. QR Modal Controls
function openQRModal() {
    document.getElementById('qrModal').classList.add('open');
}

function closeQRModal() {
    document.getElementById('qrModal').classList.remove('open');
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
