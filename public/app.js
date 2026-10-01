/* ==========================================================================
   AtlasEcho - Main Application Frontend JS
   Handling Map, Auth, Location Feed, Time Capsules, Comments & Notifications
   ========================================================================== */

let currentUser = null;
let authToken = localStorage.getItem('atlasecho_token') || null;
let map = null;
let mapMarkers = [];
let userLocationMarker = null;
let echoesCache = [];
let activeEchoIdForDiscussion = null;
let travelogueMode = 'grid';
let currentFeedTab = 'local';
let authMode = 'login'; // 'login' or 'register'
let userLocation = { lat: -33.9249, lng: 18.4241 }; // Default: Cape Town, South Africa
let currentFetchedWeather = { temp: '22°C', condition: 'Sunny & Clear', icon: 'sun' };
let selectedDistanceUnit = localStorage.getItem('preferred_units') || 'Miles';
let selectedTempUnit = localStorage.getItem('preferred_temp_unit') || 'Celsius';
let showAllDiscovery = false;

function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken && authToken !== 'null' && authToken !== 'undefined') {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  if (currentUser && currentUser.id) {
    headers['x-user-id'] = currentUser.id;
  }
  return headers;
}

function formatTemp(tempStr, targetUnit = selectedTempUnit) {
  if (!tempStr) return '';
  const match = String(tempStr).match(/^(-?\d+(?:\.\d+)?)\s*°?\s*([FCfc])?/);
  if (!match) return tempStr;
  let num = parseFloat(match[1]);
  let currentUnit = (match[2] || 'F').toUpperCase();

  if (targetUnit === 'Celsius' || targetUnit === 'C') {
    if (currentUnit === 'F') {
      num = Math.round((num - 32) * 5 / 9);
    }
    return `${Math.round(num)}°C`;
  } else {
    if (currentUnit === 'C') {
      num = Math.round((num * 9 / 5) + 32);
    }
    return `${Math.round(num)}°F`;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Initializing AtlasEcho...');
  
  await loadCurrentUser();
  initMap();

  // Try getting real user geolocation
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (map) {
          map.setView([userLocation.lat, userLocation.lng], 11);
          renderUserLocationMarker();
        }
        refreshAllData();
      },
      (err) => {
        console.log('Geolocation defaulted:', err.message);
        renderUserLocationMarker();
      },
      { timeout: 8000 }
    );
  } else {
    renderUserLocationMarker();
  }

  await refreshAllData();
  setupEventListeners();
});

/* ==========================================================================
   Auth & User Session
   ========================================================================== */
async function loadCurrentUser() {
  if (authToken && authToken !== 'null' && authToken !== 'undefined') {
    try {
      const res = await fetch('/api/auth/me', {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        currentUser = data.user;
        updateProfileUI();
        return;
      }
    } catch (err) {
      console.error('Error loading current user profile:', err);
    }
  }

  // If token is missing, invalid, or expired, clear session and take to auth screen
  localStorage.removeItem('atlasecho_token');
  authToken = null;
  currentUser = null;
  switchNav('auth');
}


function updateProfileUI() {
  if (!currentUser) return;

  const avatarImg = document.getElementById('header-user-avatar-img');
  if (avatarImg) avatarImg.src = currentUser.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80';

  const profileAvatar = document.getElementById('profile-avatar');
  if (profileAvatar) profileAvatar.src = currentUser.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80';

  const displayNameEl = document.getElementById('profile-display-name');
  if (displayNameEl) displayNameEl.textContent = currentUser.displayName || currentUser.fullName;

  const usernameEl = document.getElementById('profile-username');
  if (usernameEl) {
    const handle = currentUser.username ? (currentUser.username.startsWith('@') ? currentUser.username : `@${currentUser.username}`) : '@explorer';
    usernameEl.textContent = handle;
  }

  const badgesEl = document.getElementById('profile-badges');
  if (badgesEl) {
    if (currentUser.badges && currentUser.badges.trim()) {
      const badgeList = currentUser.badges.split(' ').filter(b => b.trim());
      badgesEl.innerHTML = badgeList.map(b => `<span class="tag-pill">${b}</span>`).join('');
    }
  }

  const bioEl = document.getElementById('profile-bio-text');
  if (bioEl) bioEl.textContent = currentUser.bio || 'Exploring the world and leaving echoes.';

  const milesEl = document.getElementById('stat-miles');
  if (milesEl) {
    const miles = currentUser.totalMiles !== undefined ? currentUser.totalMiles : 0;
    milesEl.textContent = Math.round(miles).toLocaleString();
  }

  const memoriesEl = document.getElementById('stat-memories');
  if (memoriesEl) {
    const echoesCount = currentUser.memoriesCount !== undefined ? currentUser.memoriesCount : (currentUser.echoesCount !== undefined ? currentUser.echoesCount : 0);
    memoriesEl.textContent = echoesCount.toLocaleString();
  }

  const followersEl = document.getElementById('stat-followers');
  if (followersEl) {
    const fCount = currentUser.followersCount !== undefined ? currentUser.followersCount : 0;
    followersEl.textContent = fCount >= 1000 ? `${(fCount / 1000).toFixed(1)}k` : fCount.toString();
  }

  if (currentUser.temperatureUnits) {
    selectedTempUnit = currentUser.temperatureUnits;
    setTempUnits(selectedTempUnit);
  }
}

/* ==========================================================================
   Map Setup
   ========================================================================== */
function initMap() {
  const mapElement = document.getElementById('map');
  if (!mapElement || map) return;

  map = L.map('map', {
    zoomControl: false
  }).setView([userLocation.lat, userLocation.lng], 9);

  // Warm CartoDB Voyager tile layer
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap © CARTO'
  }).addTo(map);

  renderUserLocationMarker();
}

function renderUserLocationMarker() {
  if (!map || !userLocation.lat || !userLocation.lng) return;

  if (userLocationMarker) {
    map.removeLayer(userLocationMarker);
  }

  const userIcon = L.divIcon({
    className: 'user-location-pin',
    html: `
      <div style="position: relative; width: 24px; height: 24px; background: #002045; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 16px rgba(0,32,69,0.5);">
        <div style="position: absolute; inset: -8px; border-radius: 50%; border: 2px solid #715c00; animation: pulse 2s infinite;"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  userLocationMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon }).addTo(map);
  userLocationMarker.bindPopup(`
    <div style="font-family: Inter, sans-serif; font-size: 12px; font-weight: 700; color: #002045; text-align: center;">
      📍 Your Current Coordinates
    </div>
  `);
}

function renderMapMarkers(echoes) {
  if (!map) return;

  // Clear existing markers
  mapMarkers.forEach(m => map.removeLayer(m));
  mapMarkers = [];

  echoes.forEach(echo => {
    if (!echo.latitude || !echo.longitude) return;

    const avatar = echo.author?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80';
    const customIcon = L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="position: relative; width: 44px; height: 44px; background: #ffffff; border-radius: 50%; padding: 3px; box-shadow: 0 4px 12px rgba(0,32,69,0.3); border: 2px solid #715c00;">
          <img src="${avatar}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" />
          <div style="position: absolute; bottom: -4px; right: -4px; background: #002045; color: #ffffff; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px;">📍</div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });

    const marker = L.marker([echo.latitude, echo.longitude], { icon: customIcon }).addTo(map);
    
    marker.bindPopup(`
      <div style="width: 200px; font-family: Inter, sans-serif;">
        <img src="${echo.imageUrl || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=300&q=80'}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />
        <div style="font-weight: 700; font-size: 14px; color: #002045; margin-bottom: 2px;">${echo.title}</div>
        <div style="font-size: 11px; color: #74777f; margin-bottom: 6px;">📍 ${echo.locationName}</div>
        <button onclick="openEchoDiscussion('${echo.id}')" style="background: #002045; color: #fff; width: 100%; padding: 6px; border-radius: 20px; font-weight: 600; font-size: 12px;">View Echo</button>
      </div>
    `);

    mapMarkers.push(marker);
  });
}

/* ==========================================================================
   Data Refresh & Rendering
   ========================================================================== */
async function refreshAllData() {
  await loadCurrentUser();
  await fetchEchoes();
  await fetchNotifications();
}

async function fetchEchoes() {
  try {
    const res = await fetch(`/api/echoes?feed=${currentFeedTab}&lat=${userLocation.lat}&lng=${userLocation.lng}&radius=all`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      echoesCache = await res.json();
      filterAndRenderEchoes();
      renderFeedEchoes(echoesCache);
      renderTravelogue(echoesCache);
    }
  } catch (err) {
    console.error('Error fetching echoes:', err);
  }
}

// Render Discovery View
function renderNearbyEchoes(echoes) {
  const container = document.getElementById('nearby-echoes-container');
  if (!container) return;

  if (echoes.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--color-outline);">No echoes dropped nearby yet. Be the first!</div>`;
    return;
  }

  const itemsToRender = (showAllDiscovery || activeFilters.radius === 'all') ? echoes : echoes.slice(0, 5);
  container.innerHTML = itemsToRender.map(echo => createEchoCardHTML(echo)).join('');
}

// Render Feed View
function renderFeedEchoes(echoes) {
  const container = document.getElementById('feed-echoes-container');
  if (!container) return;

  if (echoes.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 32px; color: var(--color-outline);">No echoes in this feed timeline yet.</div>`;
    return;
  }

  container.innerHTML = echoes.map(echo => createEchoCardHTML(echo)).join('');
}

// Create Echo Card HTML
function createEchoCardHTML(echo) {
  const isTimeCapsuleLocked = echo.isTimeCapsule && echo.isLocked;

  if (isTimeCapsuleLocked) {
    const days = echo.countdown ? String(echo.countdown.days).padStart(2, '0') : '04';
    const hrs = echo.countdown ? String(echo.countdown.hours).padStart(2, '0') : '18';
    const min = echo.countdown ? String(echo.countdown.mins).padStart(2, '0') : '32';

    return `
      <div class="time-capsule-card" data-card-echo-id="${echo.id}">
        <div class="lock-icon-circle">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        </div>
        <h3 style="font-size: 18px; font-weight: 700; color: var(--color-primary);">${echo.title}</h3>
        <p style="font-size: 13px; color: var(--color-on-surface-variant); margin-top: 4px;">📍 ${echo.locationName}</p>
        
        <div class="countdown-box">
          <div class="countdown-unit"><div class="num">${days}</div><div class="lbl">Days</div></div>
          <div class="countdown-unit"><div class="num">${hrs}</div><div class="lbl">Hrs</div></div>
          <div class="countdown-unit"><div class="num">${min}</div><div class="lbl">Min</div></div>
        </div>

        <button onclick="openEchoDiscussion('${echo.id}')" class="btn-action-sm" style="background: var(--color-tertiary);">🔒 Time Capsule Locked</button>
      </div>
    `;
  }

  const weatherBadge = echo.weatherTemp ? `
    <div class="weather-badge">
      <span>${getWeatherEmoji(echo.weatherIcon)} ${formatTemp(echo.weatherTemp, selectedTempUnit)} ${echo.weatherCondition || ''}</span>
    </div>
  ` : '';

  const tagsHTML = (echo.tags || '')
    .split(' ')
    .filter(t => t.startsWith('#'))
    .map(t => `<span class="tag-pill">${t}</span>`)
    .join('');

  const authorName = echo.author?.displayName || echo.author?.fullName || 'Traveler';
  const authorAvatar = echo.author?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80';

  const isSelf = currentUser && currentUser.id === echo.authorId;
  const isFollowing = Boolean(echo.isFollowingAuthor);

  const followIconSVG = isFollowing
    ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>`
    : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="17" y1="11" x2="23" y2="11"></line></svg>`;

  const followBtnHTML = !isSelf ? `
    <button class="follow-icon-btn ${isFollowing ? 'following' : ''}" data-author-id="${echo.authorId}" onclick="toggleFollow('${echo.authorId}', event)" title="${isFollowing ? 'Following' : 'Follow'} ${authorName}">
      ${followIconSVG}
    </button>
  ` : '';

  return `
    <div class="echo-card" data-card-echo-id="${echo.id}">
      <div class="card-image-wrap">
        <img class="card-image" src="${echo.imageUrl || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1000&q=80'}" alt="${echo.title}" />
        ${weatherBadge}
      </div>

      <div class="card-body">
        <div class="author-row">
          <div class="author-info" style="cursor: pointer;" onclick="viewUserProfile('${echo.authorId}')" title="View ${authorName}'s Profile">
            <img class="author-avatar" src="${authorAvatar}" alt="${authorName}" />
            <div>
              <div class="author-name" style="display: flex; align-items: center; gap: 6px;">
                <span>${authorName}</span>
                ${echo.author?.username ? `<span style="font-size: 11px; color: var(--color-outline); font-weight: 500;">@${echo.author.username}</span>` : ''}
              </div>
              <div class="card-time">📍 ${echo.locationName} • ${formatTimeAgo(echo.createdAt)}</div>
            </div>
          </div>
          ${followBtnHTML}
        </div>

        <h3 class="card-title">${echo.title}</h3>
        <p class="story-text">${echo.content}</p>

        <div class="tag-pills-row">${tagsHTML}</div>

        <div class="card-actions-row">
          <div class="action-item ${echo.isLiked ? 'liked' : ''}" data-echo-id="${echo.id}" onclick="toggleLike('${echo.id}', event)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="${echo.isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            <span class="like-count">${echo.likeCount || 0}</span>
          </div>

          <div class="action-item" onclick="openEchoDiscussion('${echo.id}')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            <span class="comment-count" data-echo-id="${echo.id}">${echo.commentCount || 0} Echoes</span>
          </div>

          <div class="action-item" onclick="shareEcho('${echo.id}', '${echo.title}')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Render Profile Travelogue
function renderTravelogue(echoes) {
  const container = document.getElementById('user-travelogue-container');
  if (!container) return;

  const userEchoes = echoes.filter(e => !currentUser || e.authorId === currentUser.id || e.author?.fullName === 'Julian Thorne');

  if (travelogueMode === 'grid') {
    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
        ${userEchoes.map(e => `
          <div onclick="openEchoDiscussion('${e.id}')" style="background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid var(--color-border); cursor: pointer;">
            <img src="${e.imageUrl || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=400&q=80'}" style="width: 100%; height: 110px; object-fit: cover;" />
            <div style="padding: 10px;">
              <div style="font-size: 11px; color: var(--color-secondary); font-weight: 600;">${formatTemp(e.weatherTemp || '22°C', selectedTempUnit)}</div>
              <div style="font-weight: 700; font-size: 13px; color: var(--color-primary);">${e.title}</div>
              <div style="font-size: 10px; color: var(--color-outline); margin-top: 2px;">📍 ${e.locationName}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    container.innerHTML = `
      <div style="position: relative; padding-left: 24px; border-left: 3px solid var(--color-secondary-container);">
        ${userEchoes.map(e => `
          <div style="position: relative; margin-bottom: 24px;">
            <div style="position: absolute; left: -31px; top: 4px; width: 14px; height: 14px; border-radius: 50%; background: var(--color-primary); border: 3px solid var(--color-secondary-container);"></div>
            <div style="font-size: 11px; font-weight: 700; color: var(--color-secondary); margin-bottom: 4px;">${new Date(e.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            ${createEchoCardHTML(e)}
          </div>
        `).join('')}
      </div>
    `;
  }
}

/* ==========================================================================
   Liking System
   ========================================================================== */
async function toggleLike(echoId, event) {
  if (event) event.stopPropagation();

  try {
    const res = await fetch(`/api/echoes/${echoId}/like`, {
      method: 'POST',
      headers: getAuthHeaders()
    });

    if (res.ok) {
      const data = await res.json();
      
      // Update cache
      const cached = echoesCache.find(e => e.id === echoId);
      if (cached) {
        cached.isLiked = data.liked;
        cached.likeCount = data.likeCount;
      }

      // Synchronize DOM everywhere
      const likeActionItems = document.querySelectorAll(`.action-item[data-echo-id="${echoId}"]`);
      likeActionItems.forEach(el => {
        el.classList.toggle('liked', data.liked);
        const svg = el.querySelector('svg');
        if (svg) svg.setAttribute('fill', data.liked ? 'currentColor' : 'none');
        const countEl = el.querySelector('.like-count');
        if (countEl) countEl.textContent = data.likeCount;
      });
    }
  } catch (err) {
    console.error('Error toggling like:', err);
  }
}

/* ==========================================================================
   Following System
   ========================================================================== */
async function toggleFollow(targetUserId, event) {
  if (event) event.stopPropagation();

  try {
    const res = await fetch(`/api/users/${targetUserId}/follow`, {
      method: 'POST',
      headers: getAuthHeaders()
    });

    if (res.ok) {
      const data = await res.json();
      const isFollowing = data.following;

      // Update cache for all echoes by target author
      echoesCache.forEach(e => {
        if (e.authorId === targetUserId) {
          e.isFollowingAuthor = isFollowing;
        }
      });

      // Update all follow buttons in DOM matching targetUserId
      const followBtns = document.querySelectorAll(`button.follow-icon-btn[data-author-id="${targetUserId}"]`);
      followBtns.forEach(btn => {
        btn.innerHTML = isFollowing
          ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>`
          : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="17" y1="11" x2="23" y2="11"></line></svg>`;
        btn.classList.toggle('following', isFollowing);
        btn.title = isFollowing ? 'Following' : 'Follow';
      });

      // Update Profile Modal if open for this user
      const modalFollowBtn = document.querySelector(`.profile-follow-btn[data-user-id="${targetUserId}"]`);
      if (modalFollowBtn) {
        modalFollowBtn.textContent = isFollowing ? 'Following' : 'Follow';
        modalFollowBtn.classList.toggle('following', isFollowing);
      }

      const modalFollowersCount = document.getElementById('user-profile-followers-count');
      if (modalFollowersCount) {
        modalFollowersCount.textContent = data.followersCount;
      }

      // If in following feed, refresh feed view
      if (currentFeedTab === 'following') {
        fetchEchoes();
      }
    }
  } catch (err) {
    console.error('Error following user:', err);
  }
}

/* ==========================================================================
   Discussion & Threaded Comments
   ========================================================================== */
async function openEchoDiscussion(echoId) {
  activeEchoIdForDiscussion = echoId;
  const modal = document.getElementById('modal-echo-discussion');
  if (!modal) return;

  try {
    const res = await fetch(`/api/echoes/${echoId}`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const echo = await res.json();

      // Render Original Post Snippet
      const previewEl = document.getElementById('discussion-post-preview');
      previewEl.innerHTML = `
        <div style="display: flex; gap: 12px; align-items: flex-start;">
          <img src="${echo.author?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80'}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;" />
          <div style="flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: 700; font-size: 14px; color: var(--color-primary); cursor: pointer;" onclick="viewUserProfile('${echo.authorId}')">${echo.author?.displayName || echo.author?.fullName}</span>
              <span class="badge-gold">Original Post</span>
            </div>
            <div style="font-size: 11px; color: var(--color-outline); margin-bottom: 6px;">📍 ${echo.locationName}</div>
            <p style="font-size: 13px; font-style: italic; color: var(--color-on-surface); border-left: 3px solid var(--color-secondary-container); padding-left: 10px; margin-top: 4px;">"${echo.content}"</p>
          </div>
        </div>
      `;

      // Render Comments Header
      const headerEl = document.getElementById('discussion-count-header');
      headerEl.textContent = `${echo.comments?.length || 0} Echoes`;

      // Render Comments List
      renderCommentsList(echo.comments || [], echo.id);

      modal.classList.add('active');
    }
  } catch (err) {
    console.error('Error opening echo discussion:', err);
  }
}

function renderCommentsList(comments, echoId) {
  const listEl = document.getElementById('discussion-comments-list');
  if (!listEl) return;

  if (comments.length > 0) {
    listEl.innerHTML = comments.map(c => {
      const isOwner = currentUser && currentUser.id === c.authorId;
      const deleteBtn = isOwner ? `
        <button onclick="deleteComment('${c.id}', '${echoId}')" style="color: var(--color-tertiary-accent); font-size: 12px; border: none; background: none; cursor: pointer; padding: 2px 6px;" title="Delete comment">✕</button>
      ` : '';

      return `
        <div class="comment-item">
          <div class="comment-author-row">
            <span class="comment-author-name" style="cursor: pointer;" onclick="viewUserProfile('${c.authorId}')">${c.author?.displayName || c.author?.fullName || 'Traveler'}</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 11px; color: var(--color-outline);">${formatTimeAgo(c.createdAt)}</span>
              ${deleteBtn}
            </div>
          </div>
          <div class="comment-text">${c.content}</div>
        </div>
      `;
    }).join('');
  } else {
    listEl.innerHTML = `<div style="text-align: center; color: var(--color-outline); padding: 16px;">No responses yet. Add the first echo!</div>`;
  }
}

async function deleteComment(commentId, echoId) {
  try {
    const res = await fetch(`/api/echoes/comments/${commentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (res.ok) {
      // Update cache
      const cached = echoesCache.find(e => e.id === echoId);
      if (cached && cached.commentCount > 0) {
        cached.commentCount -= 1;
      }

      // Update DOM comment count badges
      const countEls = document.querySelectorAll(`.comment-count[data-echo-id="${echoId}"]`);
      countEls.forEach(el => {
        const count = cached ? cached.commentCount : 0;
        el.textContent = `${count} Echoes`;
      });

      // Refresh discussion modal
      if (activeEchoIdForDiscussion === echoId) {
        openEchoDiscussion(echoId);
      }
    }
  } catch (err) {
    console.error('Error deleting comment:', err);
  }
}

function closeDiscussionModal() {
  const modal = document.getElementById('modal-echo-discussion');
  if (modal) modal.classList.remove('active');
}

/* ==========================================================================
   Traveler Profile View Modal
   ========================================================================== */
async function viewUserProfile(userId) {
  if (!userId) return;
  const modal = document.getElementById('modal-user-profile');
  const body = document.getElementById('user-profile-modal-body');
  if (!modal || !body) return;

  modal.classList.add('active');
  body.innerHTML = `<div style="text-align: center; padding: 32px; color: var(--color-on-surface-variant);">Loading traveler profile...</div>`;

  try {
    const res = await fetch(`/api/users/${userId}`, {
      headers: getAuthHeaders()
    });

    if (!res.ok) {
      body.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--color-error);">Traveler profile not found.</div>`;
      return;
    }

    const u = await res.json();
    const badgesHTML = (u.badges || '')
      .split(' ')
      .filter(b => b.trim())
      .map(b => `<span class="tag-pill">${b}</span>`)
      .join('');

    const echoesHTML = (u.echoes && u.echoes.length > 0)
      ? u.echoes.map(echo => createEchoCardHTML({ ...echo, author: u, isFollowingAuthor: u.isFollowing })).join('')
      : `<div style="text-align: center; color: var(--color-outline); padding: 24px;">No echoes dropped yet.</div>`;

    const isSelf = currentUser && currentUser.id === u.id;

    body.innerHTML = `
      <div style="position: relative; margin-bottom: 16px;">
        ${u.bannerUrl ? `<img src="${u.bannerUrl}" style="width: 100%; height: 110px; object-fit: cover; border-radius: var(--radius-md);" />` : ''}
        <div style="display: flex; align-items: flex-end; justify-content: space-between; margin-top: ${u.bannerUrl ? '-36px' : '0'}; padding: 0 8px;">
          <img src="${u.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80'}" style="width: 72px; height: 72px; border-radius: 50%; border: 3px solid var(--color-surface); object-fit: cover; box-shadow: var(--shadow-sm);" />
          ${isSelf ? '' : `
            <button class="follow-btn-sm profile-follow-btn ${u.isFollowing ? 'following' : ''}" data-user-id="${u.id}" style="padding: 8px 18px; font-size: 13px;" onclick="toggleFollow('${u.id}', event)">
              ${u.isFollowing ? 'Following' : 'Follow'}
            </button>
          `}
        </div>
      </div>

      <div style="padding: 0 4px;">
        <h3 style="font-size: 18px; font-weight: 700; color: var(--color-primary);">${u.displayName || u.fullName}</h3>
        <div style="font-size: 12px; color: var(--color-outline); font-weight: 600; margin-bottom: 8px;">@${u.username}</div>
        
        ${badgesHTML ? `<div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px;">${badgesHTML}</div>` : ''}
        
        <p style="font-size: 13px; color: var(--color-on-surface-variant); line-height: 1.5; margin-bottom: 16px;">${u.bio || 'Exploring the world and sharing memory echoes.'}</p>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; background: var(--color-surface-container-low); padding: 12px; border-radius: var(--radius-md); text-align: center; margin-bottom: 20px;">
          <div>
            <div style="font-size: 16px; font-weight: 800; color: var(--color-primary);">${u.memoriesCount || u.echoes?.length || 0}</div>
            <div style="font-size: 10px; color: var(--color-outline); font-weight: 600; text-transform: uppercase;">Echoes</div>
          </div>
          <div>
            <div style="font-size: 16px; font-weight: 800; color: var(--color-primary);">${Math.round(u.totalMiles || 0).toLocaleString()}</div>
            <div style="font-size: 10px; color: var(--color-outline); font-weight: 600; text-transform: uppercase;">Miles</div>
          </div>
          <div>
            <div style="font-size: 16px; font-weight: 800; color: var(--color-primary);" id="user-profile-followers-count">${u.followersCount || 0}</div>
            <div style="font-size: 10px; color: var(--color-outline); font-weight: 600; text-transform: uppercase;">Followers</div>
          </div>
          <div>
            <div style="font-size: 16px; font-weight: 800; color: var(--color-primary);">${u.followingCount || 0}</div>
            <div style="font-size: 10px; color: var(--color-outline); font-weight: 600; text-transform: uppercase;">Following</div>
          </div>
        </div>

        <h4 style="font-size: 14px; font-weight: 700; color: var(--color-primary); margin-bottom: 12px; border-bottom: 1px solid var(--color-border); padding-bottom: 6px;">Traveler's Dropped Memories</h4>

        <div style="display: flex; flex-direction: column; gap: 14px;">
          ${echoesHTML}
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Error viewing user profile:', err);
    body.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--color-error);">Failed to load traveler profile.</div>`;
  }
}

function closeUserProfileModal() {
  const modal = document.getElementById('modal-user-profile');
  if (modal) modal.classList.remove('active');
}

/* ==========================================================================
   Notifications ("Incoming Echoes")
   ========================================================================== */
let notifsCache = [];
let currentNotifFilter = 'all';

async function fetchNotifications() {
  if (!authToken) return;

  try {
    const res = await fetch('/api/users/notifications/all', {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      notifsCache = await res.json();
      filterNotifs(currentNotifFilter);
    }
  } catch (err) {
    console.error('Error fetching notifications:', err);
  }
}

function filterNotifs(filter) {
  currentNotifFilter = filter;
  document.getElementById('tab-notif-all')?.classList.toggle('active', filter === 'all');
  document.getElementById('tab-notif-interactions')?.classList.toggle('active', filter === 'interactions');

  const filtered = filter === 'interactions'
    ? notifsCache.filter(n => ['like', 'follow', 'comment', 'highlight'].includes(n.type))
    : notifsCache;
  renderNotifications(filtered);
}

function renderNotifications(notifs) {
  const container = document.getElementById('notifications-list-container');
  if (!container) return;

  if (notifs.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--color-outline); padding: 32px;">No incoming echoes right now.</div>`;
    return;
  }

  container.innerHTML = notifs.map(n => `
    <div class="notif-card ${n.type === 'time_capsule' ? 'highlight' : ''}">
      <div class="notif-icon-box">
        ${getNotifIcon(n.type)}
      </div>
      <div class="notif-content">
        <div class="notif-time">${formatTimeAgo(n.createdAt)}</div>
        <div class="notif-title">${n.title}</div>
        <div class="notif-body">${n.message}</div>
        ${n.type === 'time_capsule' && n.relatedEchoId ? `<button onclick="openEchoDiscussion('${n.relatedEchoId}')" class="btn-action-sm">Unlock Echo</button>` : ''}
      </div>
    </div>
  `).join('');
}

function getNotifIcon(type) {
  if (type === 'time_capsule') return '🔒';
  if (type === 'echo_nearby') return '📍';
  if (type === 'like') return '❤️';
  if (type === 'follow') return '👤';
  return '🌟';
}

/* ==========================================================================
   Search & Map Filtering Engine
   ========================================================================== */
let activeFilters = {
  type: 'all',
  radius: 'all',
  sort: 'recent',
  searchQuery: ''
};

function calcDistanceMiles(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function openFilterModal() {
  const modal = document.getElementById('modal-filter');
  if (modal) modal.classList.add('active');
}

function closeFilterModal() {
  const modal = document.getElementById('modal-filter');
  if (modal) modal.classList.remove('active');
}

function filterAndRenderEchoes() {
  if (!echoesCache) return;

  const searchInput = document.getElementById('map-search-input');
  const query = (searchInput?.value || '').trim().toLowerCase();
  activeFilters.searchQuery = query;

  let result = [...echoesCache];

  // 1. Text Search
  if (query) {
    result = result.filter(echo => {
      const title = (echo.title || '').toLowerCase();
      const loc = (echo.locationName || '').toLowerCase();
      const tags = (echo.tags || '').toLowerCase();
      const content = (echo.content || '').toLowerCase();
      const authorName = (echo.author?.displayName || echo.author?.username || '').toLowerCase();
      return title.includes(query) || loc.includes(query) || tags.includes(query) || content.includes(query) || authorName.includes(query);
    });
  }

  // 2. Type Filter
  if (activeFilters.type === 'unlocked') {
    result = result.filter(e => !e.isTimeCapsule || !e.isLocked);
  } else if (activeFilters.type === 'time_capsule') {
    result = result.filter(e => e.isTimeCapsule);
  } else if (activeFilters.type === 'photo') {
    result = result.filter(e => e.imageUrl && e.imageUrl.length > 0);
  }

  // 3. Distance Radius Filter
  if (activeFilters.radius !== 'all' && userLocation.lat && userLocation.lng) {
    const maxRadius = parseFloat(activeFilters.radius);
    result = result.filter(e => {
      if (!e.latitude || !e.longitude) return true;
      const dist = calcDistanceMiles(userLocation.lat, userLocation.lng, e.latitude, e.longitude);
      return dist <= maxRadius;
    });
  }

  // 4. Sort Order
  if (activeFilters.sort === 'distance' && userLocation.lat && userLocation.lng) {
    result.sort((a, b) => {
      const distA = calcDistanceMiles(userLocation.lat, userLocation.lng, a.latitude, a.longitude);
      const distB = calcDistanceMiles(userLocation.lat, userLocation.lng, b.latitude, b.longitude);
      return distA - distB;
    });
  } else if (activeFilters.sort === 'popular') {
    result.sort((a, b) => {
      const popA = (a.likeCount || 0) + (a.commentCount || 0);
      const popB = (b.likeCount || 0) + (b.commentCount || 0);
      return popB - popA;
    });
  } else {
    result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  renderNearbyEchoes(result);
  renderMapMarkers(result);

  const labelEl = document.getElementById('discovery-radius-label');
  if (labelEl) {
    if (query) {
      labelEl.textContent = `${result.length} result${result.length === 1 ? '' : 's'} for "${query}"`;
    } else if (activeFilters.radius === 'all') {
      labelEl.textContent = `All Echoes (${result.length})`;
    } else {
      labelEl.textContent = `Echoes within ${activeFilters.radius} miles (${result.length})`;
    }
  }

  const filterDot = document.getElementById('filter-badge');
  const isFiltered = activeFilters.type !== 'all' || activeFilters.radius !== 'all' || activeFilters.sort !== 'recent' || query !== '';
  if (filterDot) {
    filterDot.style.display = isFiltered ? 'block' : 'none';
  }

  if (query && result.length > 0 && map) {
    const firstWithCoords = result.find(e => e.latitude && e.longitude);
    if (firstWithCoords) {
      map.setView([firstWithCoords.latitude, firstWithCoords.longitude], 12);
    }
  }
}

/* ==========================================================================
   Interactive Handlers & Event Listeners
   ========================================================================== */
function setupEventListeners() {
  // Header buttons navigation
  const brandBtn = document.getElementById('header-brand-btn');
  if (brandBtn) brandBtn.addEventListener('click', () => switchNav('discovery'));

  const btnToggleSearch = document.getElementById('btn-toggle-search');
  if (btnToggleSearch) {
    btnToggleSearch.addEventListener('click', () => {
      switchNav('discovery');
      const searchInput = document.getElementById('map-search-input');
      if (searchInput) searchInput.focus();
    });
  }

  const btnShareProfile = document.getElementById('btn-share-profile');
  if (btnShareProfile) {
    btnShareProfile.addEventListener('click', () => {
      if (navigator.clipboard && window.location.href) {
        navigator.clipboard.writeText(window.location.href);
        alert('Passport link copied to clipboard!');
      } else {
        alert('Sharing traveler passport...');
      }
    });
  }

  // Auth Mode Toggle (Login vs Register)
  const toggleAuthBtn = document.getElementById('btn-toggle-auth-mode');
  if (toggleAuthBtn) {
    toggleAuthBtn.addEventListener('click', () => {
      authMode = (authMode === 'login') ? 'register' : 'login';
      const groupFullname = document.getElementById('group-fullname');
      const authTitle = document.getElementById('auth-title');
      const authSubtitle = document.getElementById('auth-subtitle');
      const btnSubmit = document.getElementById('btn-auth-submit');

      if (authMode === 'register') {
        if (groupFullname) groupFullname.style.display = 'block';
        if (authTitle) authTitle.textContent = 'Create Traveler Passport';
        if (authSubtitle) authSubtitle.textContent = 'Join AtlasEcho to drop memory echoes around the world.';
        if (btnSubmit) btnSubmit.textContent = 'Create Passport 🧭';
        toggleAuthBtn.textContent = 'Already have a passport? Sign In';
      } else {
        if (groupFullname) groupFullname.style.display = 'none';
        if (authTitle) authTitle.textContent = 'Welcome Back, Traveler';
        if (authSubtitle) authSubtitle.textContent = 'Your field journal is waiting for the next memory.';
        if (btnSubmit) btnSubmit.textContent = 'Begin Journey 🧭';
        toggleAuthBtn.textContent = 'New to the expedition? Join AtlasEcho';
      }
    });
  }

  // Search input filter listener
  const searchInput = document.getElementById('map-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      filterAndRenderEchoes();
    });
  }

  // Filter Modal Toggle
  const btnMapFilter = document.getElementById('btn-map-filter');
  if (btnMapFilter) {
    btnMapFilter.addEventListener('click', () => {
      openFilterModal();
    });
  }

  // Type filter buttons
  const typeBtns = document.querySelectorAll('.filter-type-btn');
  typeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      typeBtns.forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      activeFilters.type = e.currentTarget.dataset.type || 'all';
    });
  });

  // Radius filter buttons
  const radiusBtns = document.querySelectorAll('.filter-radius-btn');
  radiusBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      radiusBtns.forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      activeFilters.radius = e.currentTarget.dataset.radius || '5';
    });
  });

  // Filter Form Submit
  const formFilter = document.getElementById('form-filter-echoes');
  if (formFilter) {
    formFilter.addEventListener('submit', (e) => {
      e.preventDefault();
      const sortSelect = document.getElementById('filter-sort-select');
      if (sortSelect) activeFilters.sort = sortSelect.value;
      filterAndRenderEchoes();
      closeFilterModal();
    });
  }

  // Reset Filters
  const btnResetFilters = document.getElementById('btn-reset-filters');
  if (btnResetFilters) {
    btnResetFilters.addEventListener('click', () => {
      showAllDiscovery = false;
      activeFilters = { type: 'all', radius: '5', sort: 'recent', searchQuery: '' };
      typeBtns.forEach(b => b.classList.toggle('active', b.dataset.type === 'all'));
      radiusBtns.forEach(b => b.classList.toggle('active', b.dataset.radius === '5'));
      const sortSelect = document.getElementById('filter-sort-select');
      if (sortSelect) sortSelect.value = 'recent';
      if (searchInput) searchInput.value = '';
      const btnViewAll = document.getElementById('btn-view-all-nearby');
      if (btnViewAll) btnViewAll.textContent = 'View All';
      filterAndRenderEchoes();
      closeFilterModal();
    });
  }

  // View All Nearby Button
  const btnViewAll = document.getElementById('btn-view-all-nearby');
  if (btnViewAll) {
    btnViewAll.addEventListener('click', () => {
      showAllDiscovery = !showAllDiscovery;
      if (showAllDiscovery) {
        activeFilters.radius = 'all';
        radiusBtns.forEach(b => b.classList.toggle('active', b.dataset.radius === 'all'));
        if (searchInput) searchInput.value = '';
        btnViewAll.textContent = 'Show Top 5';
      } else {
        btnViewAll.textContent = 'View All';
      }
      filterAndRenderEchoes();
    });
  }

  // Photo Picker Event Listeners
  const btnTakePhoto = document.getElementById('btn-take-photo');
  const btnChooseGallery = document.getElementById('btn-choose-gallery');
  const inputCamera = document.getElementById('input-photo-camera');
  const inputGallery = document.getElementById('input-photo-gallery');
  const imageUrlHidden = document.getElementById('create-image-url');
  const photoPreviewBox = document.getElementById('photo-preview-box');
  const photoPreviewImg = document.getElementById('photo-preview-img');
  const btnRemovePhoto = document.getElementById('btn-remove-photo');

  if (btnTakePhoto && inputCamera) {
    btnTakePhoto.addEventListener('click', () => inputCamera.click());
  }

  if (btnChooseGallery && inputGallery) {
    btnChooseGallery.addEventListener('click', () => inputGallery.click());
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        if (imageUrlHidden) imageUrlHidden.value = dataUrl;
        if (photoPreviewImg) photoPreviewImg.src = dataUrl;
        if (photoPreviewBox) photoPreviewBox.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  };

  if (inputCamera) inputCamera.addEventListener('change', handleFileSelect);
  if (inputGallery) inputGallery.addEventListener('change', handleFileSelect);

  if (btnRemovePhoto) {
    btnRemovePhoto.addEventListener('click', () => {
      if (imageUrlHidden) imageUrlHidden.value = '';
      if (photoPreviewImg) photoPreviewImg.src = '';
      if (photoPreviewBox) photoPreviewBox.style.display = 'none';
      if (inputCamera) inputCamera.value = '';
      if (inputGallery) inputGallery.value = '';
    });
  }

  // Time Capsule toggle listener
  const capsuleToggle = document.getElementById('create-is-capsule');
  const unlockGroup = document.getElementById('group-unlock-date');
  if (capsuleToggle && unlockGroup) {
    capsuleToggle.addEventListener('change', (e) => {
      if (e.target.checked) {
        unlockGroup.style.display = 'block';
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 7);
        const dateInput = document.getElementById('create-unlock-date');
        if (dateInput && !dateInput.value) {
          dateInput.value = defaultDate.toISOString().split('T')[0];
        }
      } else {
        unlockGroup.style.display = 'none';
      }
    });
  }

  // Create Echo Form Submission
  const createForm = document.getElementById('form-create-echo');
  if (createForm) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = document.getElementById('create-title').value;
      const locationName = document.getElementById('create-location').value;
      const content = document.getElementById('create-content').value;
      const imageUrl = document.getElementById('create-image-url').value;
      const isTimeCapsule = document.getElementById('create-is-capsule').checked;
      const unlockDate = document.getElementById('create-unlock-date').value;
      const tags = document.getElementById('create-tags').value;

      try {
        const res = await fetch('/api/echoes', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            title,
            locationName,
            content,
            imageUrl,
            latitude: userLocation.lat,
            longitude: userLocation.lng,
            weatherTemp: currentFetchedWeather.temp || '34°F',
            weatherCondition: currentFetchedWeather.condition || 'Snowing',
            weatherIcon: currentFetchedWeather.icon || 'snowflake',
            isTimeCapsule,
            unlockDate: isTimeCapsule ? unlockDate : null,
            tags
          })
        });

        if (res.ok) {
          closeCreateModal();
          createForm.reset();
          if (unlockGroup) unlockGroup.style.display = 'none';
          await refreshAllData();
        }
      } catch (err) {
        console.error('Error dropping echo:', err);
      }
    });
  }

  // Auto-fetch weather button
  const weatherBtn = document.getElementById('btn-fetch-live-weather');
  if (weatherBtn) {
    weatherBtn.addEventListener('click', async () => {
      weatherBtn.textContent = 'Fetching...';
      try {
        const res = await fetch(`/api/weather?lat=${userLocation.lat}&lng=${userLocation.lng}&unit=${selectedTempUnit}`);
        if (res.ok) {
          const w = await res.json();
          currentFetchedWeather = {
            temp: w.temperature || (selectedTempUnit === 'Celsius' ? '22°C' : '72°F'),
            condition: w.condition || 'Sunny',
            icon: w.icon || 'sun'
          };
          document.getElementById('create-weather-text').textContent = `${formatTemp(currentFetchedWeather.temp, selectedTempUnit)} ${currentFetchedWeather.condition}`;
          document.getElementById('create-weather-icon').textContent = getWeatherEmoji(currentFetchedWeather.icon);
        }
      } catch (err) {
        console.error('Weather fetch error:', err);
      } finally {
        weatherBtn.textContent = 'Auto-Fetch Weather';
      }
    });
  }

  // Close modals when backdrop is clicked
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  });

  // Add Comment Form Submission
  const addCommentForm = document.getElementById('form-add-comment');
  if (addCommentForm) {
    addCommentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const textInput = document.getElementById('input-comment-text');
      const content = textInput.value;

      if (!content || !activeEchoIdForDiscussion) return;

      try {
        const res = await fetch(`/api/echoes/${activeEchoIdForDiscussion}/comments`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ content })
        });

        if (res.ok) {
          textInput.value = '';
          
          // Update cache commentCount
          const cached = echoesCache.find(e => e.id === activeEchoIdForDiscussion);
          if (cached) {
            cached.commentCount = (cached.commentCount || 0) + 1;
          }

          // Update comment count badges in DOM
          const countEls = document.querySelectorAll(`.comment-count[data-echo-id="${activeEchoIdForDiscussion}"]`);
          countEls.forEach(el => {
            const count = cached ? cached.commentCount : 1;
            el.textContent = `${count} Echoes`;
          });

          openEchoDiscussion(activeEchoIdForDiscussion);
        }
      } catch (err) {
        console.error('Error posting comment:', err);
      }
    });
  }

  // Header Avatar button -> Profile
  const avatarHeaderBtn = document.getElementById('btn-header-avatar');
  if (avatarHeaderBtn) avatarHeaderBtn.addEventListener('click', () => switchNav('profile'));

  // Header Notifs button -> Notifications
  const notifHeaderBtn = document.getElementById('btn-header-notifs');
  if (notifHeaderBtn) notifHeaderBtn.addEventListener('click', () => switchNav('notifications'));

  // Auth Form (Login or Register)
  const authForm = document.getElementById('auth-form');
  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('auth-email').value;
      const password = document.getElementById('auth-password').value;
      const fullName = document.getElementById('auth-fullname')?.value || '';

      const endpoint = (authMode === 'register') ? '/api/auth/register' : '/api/auth/login';
      const body = (authMode === 'register') ? { email, password, fullName } : { email, password };

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        const data = await res.json();
        if (res.ok) {
          authToken = data.token;
          localStorage.setItem('atlasecho_token', authToken);
          currentUser = data.user;
          updateProfileUI();
          switchNav('discovery');
          refreshAllData();
        } else {
          alert(data.error || 'Authentication failed');
        }
      } catch (err) {
        console.error('Auth error:', err);
        alert('Error connecting to authentication service.');
      }
    });
  }

  // Settings Modal handlers
  const openSettingsBtn = document.getElementById('btn-open-settings');
  if (openSettingsBtn) openSettingsBtn.addEventListener('click', openSettingsModal);

  // Avatar & Banner upload handlers
  const btnUploadAvatar = document.getElementById('btn-upload-avatar');
  const avatarFileInput = document.getElementById('setting-avatar-file');
  const btnRemoveAvatar = document.getElementById('btn-remove-avatar');

  if (btnUploadAvatar && avatarFileInput) {
    btnUploadAvatar.addEventListener('click', () => avatarFileInput.click());
  }

  if (avatarFileInput) {
    avatarFileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target.result;
          const hiddenInput = document.getElementById('setting-avatarurl');
          if (hiddenInput) hiddenInput.value = dataUrl;
          const previewImg = document.getElementById('setting-avatar-preview');
          if (previewImg) previewImg.src = dataUrl;
          if (btnRemoveAvatar) btnRemoveAvatar.style.display = 'inline-block';
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (btnRemoveAvatar) {
    btnRemoveAvatar.addEventListener('click', () => {
      const hiddenInput = document.getElementById('setting-avatarurl');
      if (hiddenInput) hiddenInput.value = '';
      const previewImg = document.getElementById('setting-avatar-preview');
      if (previewImg) previewImg.src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80';
      if (avatarFileInput) avatarFileInput.value = '';
      btnRemoveAvatar.style.display = 'none';
    });
  }

  const btnUploadBanner = document.getElementById('btn-upload-banner');
  const bannerFileInput = document.getElementById('setting-banner-file');
  const btnRemoveBanner = document.getElementById('btn-remove-banner');

  if (btnUploadBanner && bannerFileInput) {
    btnUploadBanner.addEventListener('click', () => bannerFileInput.click());
  }

  if (bannerFileInput) {
    bannerFileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target.result;
          const hiddenInput = document.getElementById('setting-bannerurl');
          if (hiddenInput) hiddenInput.value = dataUrl;
          const previewImg = document.getElementById('setting-banner-preview');
          if (previewImg) previewImg.src = dataUrl;
          if (btnRemoveBanner) btnRemoveBanner.style.display = 'inline-block';
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (btnRemoveBanner) {
    btnRemoveBanner.addEventListener('click', () => {
      const hiddenInput = document.getElementById('setting-bannerurl');
      if (hiddenInput) hiddenInput.value = '';
      const previewImg = document.getElementById('setting-banner-preview');
      if (previewImg) previewImg.src = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80';
      if (bannerFileInput) bannerFileInput.value = '';
      btnRemoveBanner.style.display = 'none';
    });
  }

  const passportForm = document.getElementById('form-passport-settings');
  if (passportForm) {
    passportForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const btnSave = document.getElementById('btn-save-passport-settings');
      if (btnSave) {
        btnSave.disabled = true;
        btnSave.textContent = 'Saving Profile...';
      }

      const payload = {
        username: document.getElementById('setting-username')?.value,
        fullName: document.getElementById('setting-fullname')?.value,
        displayName: document.getElementById('setting-displayname')?.value,
        bio: document.getElementById('setting-bio')?.value,
        avatarUrl: document.getElementById('setting-avatarurl')?.value,
        bannerUrl: document.getElementById('setting-bannerurl')?.value,
        badges: document.getElementById('setting-badges')?.value,
        publicVisibility: document.getElementById('setting-visibility')?.checked,
        distanceUnits: selectedDistanceUnit,
        temperatureUnits: selectedTempUnit
      };

      try {
        const res = await fetch('/api/auth/me', {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok) {
          currentUser = { ...currentUser, ...data.user };
          updateProfileUI();
          closeSettingsModal();
        } else {
          alert(data.error || 'Failed to update profile settings');
        }
      } catch (err) {
        console.error('Error saving profile settings:', err);
        alert('Network error saving settings');
      } finally {
        if (btnSave) {
          btnSave.disabled = false;
          btnSave.textContent = 'Save Profile Settings';
        }
      }
    });
  }

  const signoutBtn = document.getElementById('btn-signout');
  if (signoutBtn) {
    signoutBtn.addEventListener('click', () => {
      localStorage.removeItem('atlasecho_token');
      authToken = null;
      currentUser = null;
      closeSettingsModal();
      switchNav('auth');
    });
  }

  // FAB button
  const fabBtn = document.getElementById('btn-open-create-modal');
  if (fabBtn) fabBtn.addEventListener('click', openCreateModal);
}

function openSettingsModal() {
  const modal = document.getElementById('modal-settings');
  if (modal && currentUser) {
    const usernameInput = document.getElementById('setting-username');
    if (usernameInput) usernameInput.value = currentUser.username || '';

    const fullNameInput = document.getElementById('setting-fullname');
    if (fullNameInput) fullNameInput.value = currentUser.fullName || '';

    const displayNameInput = document.getElementById('setting-displayname');
    if (displayNameInput) displayNameInput.value = currentUser.displayName || currentUser.fullName || '';

    const bioInput = document.getElementById('setting-bio');
    if (bioInput) bioInput.value = currentUser.bio || '';

    const avatarUrlInput = document.getElementById('setting-avatarurl');
    if (avatarUrlInput) avatarUrlInput.value = currentUser.avatarUrl || '';

    const avatarPreviewImg = document.getElementById('setting-avatar-preview');
    if (avatarPreviewImg) avatarPreviewImg.src = currentUser.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80';

    const btnRemoveAvatar = document.getElementById('btn-remove-avatar');
    if (btnRemoveAvatar) btnRemoveAvatar.style.display = currentUser.avatarUrl ? 'inline-block' : 'none';

    const bannerUrlInput = document.getElementById('setting-bannerurl');
    if (bannerUrlInput) bannerUrlInput.value = currentUser.bannerUrl || '';

    const bannerPreviewImg = document.getElementById('setting-banner-preview');
    if (bannerPreviewImg) bannerPreviewImg.src = currentUser.bannerUrl || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80';

    const btnRemoveBanner = document.getElementById('btn-remove-banner');
    if (btnRemoveBanner) btnRemoveBanner.style.display = currentUser.bannerUrl ? 'inline-block' : 'none';

    const badgesInput = document.getElementById('setting-badges');
    if (badgesInput) badgesInput.value = currentUser.badges || '';

    const visSwitch = document.getElementById('setting-visibility');
    if (visSwitch) visSwitch.checked = currentUser.publicVisibility !== false;

    if (currentUser.distanceUnits === 'Kilometers') {
      setUnits('Kilometers');
    } else {
      setUnits('Miles');
    }

    if (currentUser.temperatureUnits === 'Fahrenheit') {
      setTempUnits('Fahrenheit');
    } else {
      setTempUnits('Celsius');
    }

    modal.classList.add('active');
  }
}

function closeSettingsModal() {
  const modal = document.getElementById('modal-settings');
  if (modal) modal.classList.remove('active');
}

function setUnits(unit) {
  selectedDistanceUnit = unit;
  const milesBtn = document.getElementById('unit-miles');
  const kmBtn = document.getElementById('unit-km');
  if (milesBtn && kmBtn) {
    milesBtn.classList.toggle('active', unit === 'Miles');
    kmBtn.classList.toggle('active', unit === 'Kilometers');
  }
  localStorage.setItem('preferred_units', unit);
}

function setTempUnits(unit) {
  selectedTempUnit = unit;
  const cBtn = document.getElementById('temp-unit-c');
  const fBtn = document.getElementById('temp-unit-f');
  if (cBtn && fBtn) {
    cBtn.classList.toggle('active', unit === 'Celsius');
    fBtn.classList.toggle('active', unit === 'Fahrenheit');
  }
  localStorage.setItem('preferred_temp_unit', unit);

  if (currentFetchedWeather && currentFetchedWeather.temp) {
    const weatherText = document.getElementById('create-weather-text');
    if (weatherText) weatherText.textContent = `${formatTemp(currentFetchedWeather.temp, selectedTempUnit)} ${currentFetchedWeather.condition}`;
  }

  if (echoesCache && echoesCache.length > 0) {
    renderNearbyEchoes(echoesCache);
    renderFeedEchoes(echoesCache);
    renderTravelogue(echoesCache);
  }
}

/* Navigation switching */
function switchNav(viewName) {
  document.querySelectorAll('.page-view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const viewEl = document.getElementById(`view-${viewName}`);
  if (viewEl) viewEl.classList.add('active');

  const isAuthView = viewName === 'auth';
  const headerBar = document.querySelector('.header-bar');
  const bottomNav = document.querySelector('.bottom-nav');
  if (headerBar) headerBar.style.display = isAuthView ? 'none' : 'flex';
  if (bottomNav) bottomNav.style.display = isAuthView ? 'none' : 'flex';

  const appContainer = document.getElementById('app-container');
  if (appContainer) appContainer.classList.toggle('auth-active', isAuthView);

  // Activate nav icon
  const navBtns = document.querySelectorAll('.nav-item');
  if (viewName === 'discovery') navBtns[0]?.classList.add('active');
  if (viewName === 'feed') navBtns[1]?.classList.add('active');
  if (viewName === 'profile') navBtns[2]?.classList.add('active');

  // FAB button should not show in profile or auth views
  const fab = document.getElementById('btn-open-create-modal');
  if (fab) {
    fab.style.display = (viewName === 'profile' || viewName === 'auth') ? 'none' : 'flex';
  }

  // Trigger leaflet map resize if switching to discovery
  if (viewName === 'discovery' && map) {
    setTimeout(() => map.invalidateSize(), 200);
  }
}

function switchFeedTab(tab) {
  currentFeedTab = tab;
  document.getElementById('tab-feed-local')?.classList.toggle('active', tab === 'local');
  document.getElementById('tab-feed-following')?.classList.toggle('active', tab === 'following');
  fetchEchoes();
}

function switchTravelogueMode(mode) {
  travelogueMode = mode;
  document.getElementById('tab-mode-grid')?.classList.toggle('active', mode === 'grid');
  document.getElementById('tab-mode-timeline')?.classList.toggle('active', mode === 'timeline');
  renderTravelogue(echoesCache);
}

async function openCreateModal() {
  const modal = document.getElementById('modal-create-echo');
  if (modal) modal.classList.add('active');

  await autoFetchCurrentLocationAndWeather();
}

async function autoFetchCurrentLocationAndWeather() {
  const locationInput = document.getElementById('create-location');
  const weatherText = document.getElementById('create-weather-text');

  if (weatherText) weatherText.textContent = 'Locating & fetching weather...';

  const updateLocationDetails = async (lat, lng) => {
    userLocation = { lat, lng };
    if (map) {
      map.setView([lat, lng], 13);
      renderUserLocationMarker();
    }

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const place = addr.city || addr.town || addr.village || addr.suburb || addr.municipality || addr.county || 'Current Location';
        const country = addr.country || '';
        const fullLocation = country ? `${place}, ${country}` : place;
        if (locationInput) {
          locationInput.value = fullLocation;
        }
      }
    } catch (err) {
      console.log('Reverse geocode note:', err.message);
    }

    try {
      const wRes = await fetch(`/api/weather?lat=${lat}&lng=${lng}&unit=${selectedTempUnit}`);
      if (wRes.ok) {
        const w = await wRes.json();
        currentFetchedWeather = {
          temp: w.temperature || (selectedTempUnit === 'Celsius' ? '22°C' : '72°F'),
          condition: w.condition || 'Sunny',
          icon: w.icon || 'sun'
        };
        const weatherIcon = document.getElementById('create-weather-icon');
        if (weatherText) weatherText.textContent = `${formatTemp(currentFetchedWeather.temp, selectedTempUnit)} ${currentFetchedWeather.condition}`;
        if (weatherIcon) weatherIcon.textContent = getWeatherEmoji(currentFetchedWeather.icon);
      }
    } catch (err) {
      console.log('Weather fetch note:', err.message);
    }
  };

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => updateLocationDetails(pos.coords.latitude, pos.coords.longitude),
      (err) => updateLocationDetails(userLocation.lat, userLocation.lng),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  } else {
    updateLocationDetails(userLocation.lat, userLocation.lng);
  }
}

function closeCreateModal() {
  const modal = document.getElementById('modal-create-echo');
  if (modal) modal.classList.remove('active');
}

function shareEcho(echoId, title) {
  if (navigator.clipboard && window.location.href) {
    navigator.clipboard.writeText(`${window.location.origin}/?echo=${echoId}`);
    alert(`Echo link for "${title}" copied to clipboard!`);
  } else {
    alert(`Sharing echo "${title}"...`);
  }
}

// Helpers
function formatTimeAgo(dateStr) {
  const diffSec = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function getWeatherEmoji(icon) {
  if (icon === 'snowflake') return '❄️';
  if (icon === 'cloud-rain') return '🌧️';
  if (icon === 'cloud') return '☁️';
  return '☀️';
}
