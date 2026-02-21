// frontend/js/app.js

// ╔══════════════════════════════════════════════╗
// ║  RENDER DEPLOYMENT: Set your backend URL here ║
// ║  e.g. https://wardrobewizard-backend.onrender.com
// ╚══════════════════════════════════════════════╝
const API_BASE_URL = window.location.hostname === 'localhost'
  ? ''                              // local: use relative /api/ paths (Nginx proxy)
  : 'https://YOUR-BACKEND-URL.onrender.com'; // ← replace after deploying backend

let userItems = [];
let currentOutfit = null;
let charts = {};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadCloset();
    loadWeather();
    loadAnalytics();
    
    // Setup tab listeners for refreshing data
    const tabs = document.querySelectorAll('button[data-bs-toggle="tab"]');
    tabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', function (event) {
            if (event.target.id === 'closet-tab') loadCloset();
            if (event.target.id === 'analytics-tab') loadAnalytics();
        });
    });
});

// Load closet items
async function loadCloset() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/items`);
        const items = await response.json();
        userItems = items;
        displayCloset(items);
    } catch (error) {
        console.error('Error loading closet:', error);
        showToast('Failed to load wardrobe', 'danger');
    }
}

// Display closet grid
function displayCloset(items) {
    const grid = document.getElementById('closetGrid');
    if (!grid) return;
    
    if (items.length === 0) {
        grid.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-tshirt fa-3x text-light mb-3"></i>
                <p class="text-muted">Your closet is empty. Start by adding some items!</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = '';
    items.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'clothing-item';
        itemElement.innerHTML = `
            <img src="${item.image_url || 'https://via.placeholder.com/200?text=' + item.category}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/200?text=Item'">
            <div class="item-info">
                <h6>${item.name || item.category}</h6>
                <p class="mb-1 d-flex align-items-center">
                    <span class="color-dot" style="background-color: ${item.color_primary}"></span>
                    <small>${item.category} • ${item.style}</small>
                </p>
                <div class="d-flex justify-content-between align-items-center mt-2">
                    <small class="text-muted">Worn ${item.times_worn || 0} times</small>
                    ${item.favorite ? '<i class="fas fa-heart text-danger"></i>' : ''}
                </div>
            </div>
        `;
        grid.appendChild(itemElement);
    });
}

// Handle image upload and AI analysis
async function handleImageUpload(input) {
    const file = input.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        showLoading('Analyzing your item with AI...');
        
        const response = await fetch(`${API_BASE_URL}/api/analyze-clothing`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) throw new Error('Analysis failed');
        
        const analysis = await response.json();
        
        // Show preview and pre-fill modal
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('imagePreview').src = e.target.result;
        }
        reader.readAsDataURL(file);
        
        document.getElementById('itemName').value = analysis.category || '';
        document.getElementById('itemCategory').value = analysis.category || 'shirt';
        document.getElementById('itemColor').value = fixHex(analysis.colors[0]) || '#000000';
        document.getElementById('itemStyle').value = analysis.style || 'casual';
        document.getElementById('itemPattern').value = analysis.pattern || 'solid';
        
        hideLoading();
        const modal = new bootstrap.Modal(document.getElementById('addItemModal'));
        modal.show();
        
    } catch (error) {
        hideLoading();
        console.error('Error analyzing image:', error);
        showToast('Error analyzing image. Please try again.', 'danger');
    }
}

// Save new item
async function saveItem() {
    const item = {
        name: document.getElementById('itemName').value,
        category: document.getElementById('itemCategory').value,
        color_primary: document.getElementById('itemColor').value,
        style: document.getElementById('itemStyle').value,
        pattern: document.getElementById('itemPattern').value,
        image_url: document.getElementById('imagePreview').src // In real app, this would be a URL from server
    };
    
    try {
        showLoading('Saving to your closet...');
        const response = await fetch(`${API_BASE_URL}/api/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });
        
        if (response.ok) {
            hideLoading();
            showToast('Item added successfully!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('addItemModal')).hide();
            loadCloset();
        } else {
            throw new Error('Save failed');
        }
    } catch (error) {
        hideLoading();
        console.error('Error saving item:', error);
        showToast('Error saving item', 'danger');
    }
}

// Load weather data
async function loadWeather() {
    try {
        const position = await getCurrentPosition();
        if (!position) return;
        
        const { latitude, longitude } = position.coords;
        const response = await fetch(`${API_BASE_URL}/api/weather?lat=${latitude}&lon=${longitude}`);
        if (!response.ok) return;
        
        const weather = await response.json();
        
        document.getElementById('weatherTemp').textContent = Math.round(weather.main.temp);
        document.getElementById('weatherDesc').textContent = weather.weather[0].description;
        
        // Implicitly generate first outfit based on weather
        generateOutfit();
    } catch (error) {
        console.error('Error loading weather:', error);
        document.getElementById('weatherDesc').textContent = 'Unable to fetch weather';
    }
}

// Get current position
function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }
        navigator.geolocation.getCurrentPosition(resolve, (err) => {
            console.warn('Geolocation error:', err);
            resolve(null); // Return null instead of rejecting to allow app to continue
        });
    });
}

// Generate outfit
async function generateOutfit() {
    const occasion = document.getElementById('occasionSelect').value;
    const temp = parseInt(document.getElementById('weatherTemp').textContent) || 20;
    
    try {
        showLoading('Finding the perfect outfit...');
        const response = await fetch(`${API_BASE_URL}/api/outfits/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ occasion, weather: { temp } })
        });
        
        const outfits = await response.json();
        hideLoading();
        
        if (outfits && outfits.length > 0) {
            displayOutfit(outfits[0]);
            // Show styling tab if not visible
            bootstrap.Tab.getInstance(document.getElementById('outfit-tab'))?.show();
        } else {
            document.getElementById('outfitDisplay').innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-search fa-3x text-light mb-3"></i>
                    <h4>Heads up!</h4>
                    <p>We couldn't find enough items in your closet to make a complete ${occasion} outfit. Try adding more items!</p>
                </div>
            `;
        }
    } catch (error) {
        hideLoading();
        console.error('Error generating outfit:', error);
    }
}

// Display outfit components
function displayOutfit(outfit) {
    const display = document.getElementById('outfitDisplay');
    if (!display || !outfit) return;
    
    let html = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h3>Today's Recommended Look</h3>
            <span class="badge bg-soft-primary text-primary border border-primary border-opacity-25 px-3 py-2 rounded-pill">
                ${outfit.items.length} Items Selected
            </span>
        </div>
    `;
    
    outfit.items.forEach((item, index) => {
        html += `
            <div class="outfit-card animate__animated animate__fadeInUp" style="animation-delay: ${index * 0.1}s">
                <div class="row align-items-center">
                    <div class="col-3 col-md-2">
                        <img src="${item.image_url || 'https://via.placeholder.com/100?text=' + item.category}" class="img-fluid rounded" alt="${item.name}">
                    </div>
                    <div class="col-9 col-md-10">
                        <div class="d-flex justify-content-between">
                            <h5 class="mb-1">${item.name || item.category}</h5>
                            <span class="badge bg-light text-dark">${item.category}</span>
                        </div>
                        <p class="text-muted mb-0">
                            <span class="color-dot sm" style="background-color: ${item.color_primary}"></span>
                            ${item.style} • ${item.pattern}
                        </p>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `
        <div class="d-grid gap-2 d-md-flex justify-content-md-start mt-4">
            <button class="btn btn-success btn-lg px-5" onclick="saveOutfitSession()">
                <i class="fas fa-check-circle me-2"></i> I'm wearing this!
            </button>
            <button class="btn btn-outline-primary btn-lg px-4" onclick="generateOutfit()">
                <i class="fas fa-random me-2"></i> Shuffle
            </button>
        </div>
    `;
    
    display.innerHTML = html;
    currentOutfit = outfit;
}

// Load and display analytics
async function loadAnalytics() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/analytics/wardrobe`);
        const analytics = await response.json();
        
        displayCharts(analytics);
        displayInsights(analytics.gaps);
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

function displayCharts(data) {
    // Destory existing charts to prevent memory leaks/glitches
    Object.values(charts).forEach(chart => chart.destroy());

    // Category Chart
    const catCtx = document.getElementById('categoryChart').getContext('2d');
    charts.category = new Chart(catCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(data.category_breakdown),
            datasets: [{
                data: Object.values(data.category_breakdown),
                backgroundColor: ['#667eea', '#764ba2', '#00b4db', '#0083b0', '#ffc107', '#fd7e14'],
                borderWidth: 0
            }]
        },
        options: {
            plugins: { legend: { position: 'bottom' } },
            cutout: '70%'
        }
    });

    // Color Chart
    const colorCtx = document.getElementById('colorChart').getContext('2d');
    charts.color = new Chart(colorCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(data.color_distribution),
            datasets: [{
                label: 'Items',
                data: Object.values(data.color_distribution),
                backgroundColor: Object.keys(data.color_distribution).map(c => fixHex(c)),
                borderRadius: 8
            }]
        },
        options: {
            scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } },
            plugins: { legend: { display: false } }
        }
    });
}

function displayInsights(gaps) {
    const insights = document.getElementById('insights');
    if (!insights) return;
    
    if (gaps.length === 0) {
        insights.innerHTML = '<p class="text-success mb-0">Your wardrobe is looking complete! No major gaps detected.</p>';
        return;
    }

    let html = '<div class="row">';
    gaps.forEach(gap => {
        html += `
            <div class="col-md-6 mb-3">
                <div class="p-3 bg-light rounded-3 d-flex justify-content-between align-items-center">
                    <div>
                        <p class="mb-1 fw-bold">${gap.reason}</p>
                        <small class="text-muted">Recommendation based on AI analysis</small>
                    </div>
                    <span class="badge bg-warning text-dark px-3 rounded-pill">Priority ${gap.priority}</span>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    insights.innerHTML = html;
}

// UI Helpers
function showLoading(msg) {
    document.getElementById('loadingMessage').textContent = msg;
    document.getElementById('loadingOverlay').classList.remove('d-none');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('d-none');
}

function showToast(message, type = 'info') {
    // For demo, using Bootstrap-like toast behavior via alert
    // In production, use Bootstrap Toasts
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3 z-index-modal`;
    alertDiv.style.zIndex = '2000';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 500);
    }, 3000);
}

function fixHex(color) {
    if (!color) return '#666666';
    if (color.startsWith('#')) return color;
    // Map common names to hex if needed, but the server should return hex
    return color;
}

function saveOutfitSession() {
    showToast('Outfit logged! Have a great day.', 'success');
}
