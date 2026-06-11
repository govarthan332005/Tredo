import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { ref, get, set, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

let currentUser = null;
let userData = null;
let allWritings = [];
let currentCategory = 'all';

// ===== Auth Check =====
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    currentUser = user;
    const snap = await get(ref(db, `users/${user.uid}`));
    userData = snap.val() || {};
    
    document.getElementById('userAvatar').textContent = (userData.username || 'U').charAt(0).toUpperCase();
    
    if (userData.address) {
        document.getElementById('locationText').innerHTML = `${userData.address} <i class="fas fa-chevron-down" style="font-size:10px;"></i>`;
    } else {
        document.getElementById('locationText').innerHTML = `Set location <i class="fas fa-chevron-down" style="font-size:10px;"></i>`;
    }

    loadWritings();
    document.getElementById('pageLoader').classList.add('hide');
});

// ===== Sample Writings Data (also seeded to Firebase by admin) =====
const sampleWritings = [
    {
        id: 'w001',
        title: 'Math Assignment Pro',
        category: 'assignment',
        description: 'Neat handwritten math assignments with diagrams. Perfect for engineering & high school students.',
        image: 'https://images.unsplash.com/photo-1635372722656-389f87a941b7?w=600&q=80',
        pricePerPage: 15,
        minPages: 5,
        rating: 4.8,
        reviews: 234,
        deliveryTime: '2-3 days',
        writer: 'Priya S.',
        sampleImages: [
            'https://images.unsplash.com/photo-1635372722656-389f87a941b7?w=600&q=80',
            'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&q=80'
        ]
    },
    {
        id: 'w002',
        title: 'Chemistry Lab Record',
        category: 'record',
        description: 'Detailed lab records with neat experiments, observations and diagrams.',
        image: 'https://images.unsplash.com/photo-1532634922-8fe0b757fb13?w=600&q=80',
        pricePerPage: 20,
        minPages: 10,
        rating: 4.9,
        reviews: 412,
        deliveryTime: '3-4 days',
        writer: 'Rahul K.',
        sampleImages: [
            'https://images.unsplash.com/photo-1532634922-8fe0b757fb13?w=600&q=80',
            'https://images.unsplash.com/photo-1453733190371-0a9bedd82893?w=600&q=80'
        ]
    },
    {
        id: 'w003',
        title: 'English Essay Writer',
        category: 'essay',
        description: 'Creative & well-structured essays in beautiful cursive handwriting.',
        image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&q=80',
        pricePerPage: 12,
        minPages: 3,
        rating: 4.7,
        reviews: 189,
        deliveryTime: '1-2 days',
        writer: 'Anjali M.',
        sampleImages: [
            'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&q=80'
        ]
    },
    {
        id: 'w004',
        title: 'Physics Project File',
        category: 'project',
        description: 'Complete project files with diagrams, graphs and detailed explanations.',
        image: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=600&q=80',
        pricePerPage: 25,
        minPages: 15,
        rating: 4.8,
        reviews: 156,
        deliveryTime: '4-5 days',
        writer: 'Vikram J.',
        sampleImages: [
            'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=600&q=80'
        ]
    },
    {
        id: 'w005',
        title: 'Quick Class Notes',
        category: 'notes',
        description: 'Crisp & clean class notes with highlights and important points.',
        image: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&q=80',
        pricePerPage: 10,
        minPages: 5,
        rating: 4.6,
        reviews: 298,
        deliveryTime: '1-2 days',
        writer: 'Sneha R.',
        sampleImages: [
            'https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&q=80'
        ]
    },
    {
        id: 'w006',
        title: 'Biology Record Book',
        category: 'record',
        description: 'Detailed biology records with neat anatomical diagrams.',
        image: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=600&q=80',
        pricePerPage: 22,
        minPages: 10,
        rating: 4.9,
        reviews: 367,
        deliveryTime: '3-4 days',
        writer: 'Karthik N.',
        sampleImages: [
            'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=600&q=80'
        ]
    },
    {
        id: 'w007',
        title: 'Computer Science Assignment',
        category: 'assignment',
        description: 'Programming assignments with code, output screenshots and explanations.',
        image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&q=80',
        pricePerPage: 18,
        minPages: 6,
        rating: 4.7,
        reviews: 201,
        deliveryTime: '2-3 days',
        writer: 'Arjun T.',
        sampleImages: [
            'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&q=80'
        ]
    },
    {
        id: 'w008',
        title: 'History Essay Special',
        category: 'essay',
        description: 'Well-researched historical essays with proper structure and references.',
        image: 'https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?w=600&q=80',
        pricePerPage: 14,
        minPages: 4,
        rating: 4.8,
        reviews: 145,
        deliveryTime: '2-3 days',
        writer: 'Meera P.',
        sampleImages: [
            'https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?w=600&q=80'
        ]
    }
];

// ===== Load Writings =====
async function loadWritings() {
    const writingsRef = ref(db, 'writings');
    const snap = await get(writingsRef);
    
    if (!snap.exists()) {
        // Seed sample data
        const seed = {};
        sampleWritings.forEach(w => { seed[w.id] = w; });
        await set(writingsRef, seed);
        allWritings = sampleWritings;
    } else {
        allWritings = Object.values(snap.val());
    }
    
    renderWritings();
}

// ===== Render Writings =====
function renderWritings() {
    const grid = document.getElementById('writingsGrid');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    let filtered = allWritings;
    if (currentCategory !== 'all') {
        filtered = filtered.filter(w => w.category === currentCategory);
    }
    if (searchTerm) {
        filtered = filtered.filter(w => 
            w.title.toLowerCase().includes(searchTerm) || 
            w.description.toLowerCase().includes(searchTerm)
        );
    }
    
    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>No results found</h3>
                <p>Try different keywords or categories</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = filtered.map(w => `
        <div class="writing-card" onclick="window.location.href='product.html?id=${w.id}'">
            <div class="card-image">
                <img src="${w.image}" alt="${w.title}" loading="lazy">
                <div class="card-badge">⚡ ${w.deliveryTime}</div>
                <div class="card-fav" onclick="event.stopPropagation(); toggleFav('${w.id}', this)">
                    <i class="fas fa-heart"></i>
                </div>
            </div>
            <div class="card-body">
                <div class="card-title-row">
                    <div class="card-title">${w.title}</div>
                    <div class="rating-badge">
                        <i class="fas fa-star" style="font-size:10px;"></i>
                        ${w.rating}
                    </div>
                </div>
                <div class="card-desc">${w.description}</div>
                <div class="card-meta">
                    <div class="meta-info">
                        <span><i class="fas fa-user-pen"></i> ${w.writer}</span>
                        <span><i class="fas fa-file-lines"></i> ${w.minPages}+ pages</span>
                    </div>
                    <div class="card-price">₹${w.pricePerPage}<small>/page</small></div>
                </div>
            </div>
        </div>
    `).join('');
}

// ===== Toggle Favorite =====
window.toggleFav = async function(id, el) {
    el.classList.toggle('active');
    const favRef = ref(db, `users/${currentUser.uid}/favorites/${id}`);
    if (el.classList.contains('active')) {
        await set(favRef, true);
        showToast('Added to favorites ❤️', 'success');
    } else {
        await set(favRef, null);
        showToast('Removed from favorites', 'success');
    }
};

// ===== Category Filter =====
document.querySelectorAll('.category-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentCategory = chip.dataset.cat;
        renderWritings();
    });
});

// ===== Search =====
document.getElementById('searchInput').addEventListener('input', renderWritings);

// ===== Location Modal =====
const locationModal = document.getElementById('locationModal');
document.getElementById('locationBtn').addEventListener('click', () => {
    locationModal.classList.add('active');
});

locationModal.addEventListener('click', (e) => {
    if (e.target === locationModal) locationModal.classList.remove('active');
});

document.getElementById('useGPS').addEventListener('click', () => {
    if (!navigator.geolocation) {
        showToast('Geolocation not supported', 'error');
        return;
    }
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        // Reverse geocode using Nominatim
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await res.json();
            const addr = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            const shortAddr = data.address ? 
                `${data.address.suburb || data.address.neighbourhood || data.address.road || ''}, ${data.address.city || data.address.town || data.address.state || ''}`.replace(/^,\s*/, '') 
                : addr.split(',').slice(0, 2).join(',');
            
            await update(ref(db, `users/${currentUser.uid}`), {
                address: shortAddr,
                location: { lat: latitude, lng: longitude, fullAddress: addr }
            });
            document.getElementById('locationText').innerHTML = `${shortAddr} <i class="fas fa-chevron-down" style="font-size:10px;"></i>`;
            locationModal.classList.remove('active');
            showToast('Location updated ✓', 'success');
        } catch (e) {
            showToast('Could not fetch address', 'error');
        }
    }, () => {
        showToast('Location permission denied', 'error');
    });
});

document.getElementById('saveManual').addEventListener('click', async () => {
    const addr = document.getElementById('manualAddress').value.trim();
    if (!addr) return showToast('Enter an address', 'error');
    await update(ref(db, `users/${currentUser.uid}`), { address: addr });
    document.getElementById('locationText').innerHTML = `${addr} <i class="fas fa-chevron-down" style="font-size:10px;"></i>`;
    locationModal.classList.remove('active');
    showToast('Location saved ✓', 'success');
});

// ===== Toast =====
function showToast(msg, type = '') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `toast show ${type}`;
    setTimeout(() => toast.classList.remove('show'), 2500);
}
window.showToast = showToast;
