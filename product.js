import { auth, db, storage } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { ref, get, set, push, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { ref as sRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

let currentUser = null;
let userData = null;
let product = null;
let uploadedFile = null;
let currentImageIndex = 0;

const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = 'login.html'; return; }
    currentUser = user;
    const usnap = await get(ref(db, `users/${user.uid}`));
    userData = usnap.val() || {};
    
    if (userData.address) document.getElementById('addressInput').value = userData.address;
    if (userData.phone) document.getElementById('phoneInput').value = userData.phone;
    
    await loadProduct();
    document.getElementById('pageLoader').classList.add('hide');
});

async function loadProduct() {
    if (!productId) {
        showToast('Product not found', 'error');
        setTimeout(() => window.location.href = 'home.html', 1500);
        return;
    }
    const snap = await get(ref(db, `writings/${productId}`));
    if (!snap.exists()) {
        showToast('Product not found', 'error');
        setTimeout(() => window.location.href = 'home.html', 1500);
        return;
    }
    product = snap.val();
    renderProduct();
    setupDefaults();
}

function renderProduct() {
    document.getElementById('headerTitle').textContent = product.title;
    document.getElementById('productTitle').textContent = product.title;
    document.getElementById('productRating').textContent = product.rating;
    document.getElementById('reviewsCount').textContent = `${product.reviews} reviews`;
    document.getElementById('productDesc').textContent = product.description;
    document.getElementById('priceCurrent').textContent = `₹${product.pricePerPage}`;
    document.getElementById('minPagesNote').textContent = product.minPages;
    document.getElementById('pagesInput').value = product.minPages;
    document.getElementById('pagesInput').min = product.minPages;
    document.getElementById('sumPrice').textContent = product.pricePerPage;
    
    // Gallery
    const images = product.sampleImages && product.sampleImages.length > 0 ? product.sampleImages : [product.image];
    const track = document.getElementById('galleryTrack');
    const dots = document.getElementById('galleryDots');
    track.innerHTML = images.map(img => `<img src="${img}" alt="">`).join('');
    dots.innerHTML = images.map((_, i) => `<div class="dot ${i===0?'active':''}"></div>`).join('');
    
    if (images.length > 1) {
        let idx = 0;
        setInterval(() => {
            idx = (idx + 1) % images.length;
            track.style.transform = `translateX(-${idx * 100}%)`;
            dots.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === idx));
        }, 4000);
    }
    
    updateSummary();
}

function setupDefaults() {
    // Default pickup tomorrow, delivery +3 days
    const now = new Date();
    const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(10, 0, 0, 0);
    const delivery = new Date(now); delivery.setDate(delivery.getDate() + 4); delivery.setHours(18, 0, 0, 0);
    document.getElementById('pickupTime').value = toLocalISO(tomorrow);
    document.getElementById('deliveryTime').value = toLocalISO(delivery);
}

function toLocalISO(d) {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ===== Page Counter =====
window.changePages = function(delta) {
    const input = document.getElementById('pagesInput');
    const min = parseInt(input.min) || 1;
    let val = parseInt(input.value) || min;
    val = Math.max(min, val + delta);
    input.value = val;
    updateSummary();
};
document.getElementById('pagesInput').addEventListener('input', updateSummary);

// ===== Update Summary =====
function updateSummary() {
    const pages = parseInt(document.getElementById('pagesInput').value) || 0;
    const price = product ? product.pricePerPage : 0;
    const subtotal = pages * price;
    const delivery = 40;
    const platform = 10;
    const total = subtotal + delivery + platform;
    
    document.getElementById('sumPages').textContent = pages;
    document.getElementById('sumSubtotal').textContent = subtotal;
    document.getElementById('sumTotal').textContent = total;
    document.getElementById('ctaTotal').textContent = total;
}

// ===== Option Chips =====
document.querySelectorAll('.option-row').forEach(row => {
    row.addEventListener('click', (e) => {
        if (e.target.classList.contains('option-chip')) {
            row.querySelectorAll('.option-chip').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            
            // Toggle content section
            if (e.target.dataset.content === 'upload') {
                document.getElementById('uploadSection').style.display = 'block';
                document.getElementById('handoverSection').style.display = 'none';
            } else if (e.target.dataset.content === 'handover') {
                document.getElementById('uploadSection').style.display = 'none';
                document.getElementById('handoverSection').style.display = 'block';
            }
        }
    });
});

// ===== File Upload =====
document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { showToast('File too large (max 20MB)', 'error'); return; }
    uploadedFile = file;
    document.getElementById('filename').textContent = `✓ ${file.name}`;
});

// ===== Use Current Location =====
document.getElementById('useCurrentLoc').addEventListener('click', () => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
            const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
            const d = await r.json();
            document.getElementById('addressInput').value = d.display_name || `${pos.coords.latitude}, ${pos.coords.longitude}`;
            showToast('Location filled ✓', 'success');
        } catch (e) { showToast('Failed to get address', 'error'); }
    }, () => showToast('Permission denied', 'error'));
});

// ===== Place Order =====
document.getElementById('placeOrderBtn').addEventListener('click', async () => {
    const pages = parseInt(document.getElementById('pagesInput').value);
    const minPages = parseInt(document.getElementById('pagesInput').min);
    const pickup = document.getElementById('pickupTime').value;
    const delivery = document.getElementById('deliveryTime').value;
    const address = document.getElementById('addressInput').value.trim();
    const phone = document.getElementById('phoneInput').value.trim();
    const instructions = document.getElementById('instructions').value.trim();
    
    const contentType = document.querySelector('[data-content].active').dataset.content;
    const writingStyle = document.querySelector('[data-style].active').dataset.style;
    const paperType = document.querySelector('[data-paper].active').dataset.paper;
    const payMethod = document.querySelector('[data-pay].active').dataset.pay;
    
    // Validation
    if (pages < minPages) return showToast(`Minimum ${minPages} pages required`, 'error');
    if (!pickup || !delivery) return showToast('Set pickup & delivery time', 'error');
    if (new Date(delivery) <= new Date(pickup)) return showToast('Delivery must be after pickup', 'error');
    if (!address) return showToast('Enter delivery address', 'error');
    if (!phone || phone.length < 10) return showToast('Valid phone required', 'error');
    if (contentType === 'upload' && !uploadedFile) return showToast('Upload your content file', 'error');
    
    const btn = document.getElementById('placeOrderBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Placing order...';
    
    try {
        // Upload file if present
        let fileURL = null;
        if (uploadedFile) {
            try {
                const fileRef = sRef(storage, `orders/${currentUser.uid}/${Date.now()}_${uploadedFile.name}`);
                await uploadBytes(fileRef, uploadedFile);
                fileURL = await getDownloadURL(fileRef);
            } catch (e) {
                console.warn('Storage upload failed, storing filename only', e);
                fileURL = uploadedFile.name;
            }
        }
        
        // Generate Order ID
        const orderId = 'WRT' + Date.now().toString().slice(-8) + Math.floor(Math.random()*99).toString().padStart(2,'0');
        
        const subtotal = pages * product.pricePerPage;
        const total = subtotal + 40 + 10;
        
        const orderData = {
            orderId,
            userId: currentUser.uid,
            username: userData.username,
            userEmail: userData.email,
            productId: product.id,
            productTitle: product.title,
            productImage: product.image,
            writerName: product.writer,
            pages,
            pricePerPage: product.pricePerPage,
            subtotal,
            deliveryCharge: 40,
            platformFee: 10,
            totalAmount: total,
            writingStyle,
            paperType,
            contentType,
            fileURL,
            handoverNotes: contentType === 'handover' ? document.getElementById('handoverNotes').value : null,
            instructions,
            pickupTime: pickup,
            deliveryTime: delivery,
            address,
            phone,
            location: userData.location || null,
            paymentMethod: payMethod,
            paymentStatus: payMethod === 'cod' ? 'pending' : 'pending',
            status: 'placed', // placed -> pickup_assigned -> picked_up -> writing -> completed -> out_for_delivery -> delivered
            statusHistory: [
                { status: 'placed', timestamp: Date.now(), note: 'Order placed successfully' }
            ],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        await set(ref(db, `orders/${orderId}`), orderData);
        await set(ref(db, `userOrders/${currentUser.uid}/${orderId}`), { orderId, createdAt: Date.now() });
        
        // Update user info
        await update(ref(db, `users/${currentUser.uid}`), { phone, address });
        
        showToast('Order placed successfully! 🎉', 'success');
        setTimeout(() => window.location.href = `order-detail.html?id=${orderId}`, 1500);
    } catch (e) {
        console.error(e);
        showToast('Failed to place order. Try again.', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-bag-shopping"></i> Place Order';
    }
});

function showToast(msg, type = '') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `toast show ${type}`;
    setTimeout(() => toast.classList.remove('show'), 2500);
}
