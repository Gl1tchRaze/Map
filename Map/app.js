import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, setDoc, deleteDoc, onSnapshot, collection, addDoc, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCiUtZj7Hit_IwUBDpd7f2Wmk_iy5kXCjs",
  authDomain: "friend-map-37021.firebaseapp.com",
  projectId: "friend-map-37021",
  storageBucket: "friend-map-37021.firebasestorage.app",
  messagingSenderId: "742437106864",
  appId: "1:742437106864:web:b6c568aa1f8490e8a8b775"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const colors = ["#534AB7", "#0F6E56", "#993C1D", "#993556", "#185FA5"];
let markers = {};
let myUserId = localStorage.getItem("myUserId");
if (!myUserId) {
  myUserId = "user_" + Math.random().toString(36).substr(2, 9);
  localStorage.setItem("myUserId", myUserId);
}
let myName = "";
let map;
let myCurrentLat = null;
let myCurrentLng = null;
let allFriendsData = [];
let alreadyNotified = {};
let expireHours = null;

// ── Notification toast ──────────────────────────────
function showNotification(message) {
  let notif = document.getElementById("notification");
  notif.textContent = message;
  notif.classList.add("show");
  setTimeout(function () {
    notif.classList.remove("show");
  }, 3000);
}

// ── Distance calculator ─────────────────────────────
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Browser notification ────────────────────────────
async function requestNotificationPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

function sendNearbyNotification(friendName, distanceMeters) {
  if (Notification.permission !== "granted") return;
  const dist =
    distanceMeters < 1000
      ? Math.round(distanceMeters) + "m"
      : (distanceMeters / 1000).toFixed(1) + "km";
  new Notification("Friend nearby!", {
    body: friendName + " is " + dist + " away and is FREE!",
    icon: "/icons/icon-192.png"
  });
}

// ── Nearby check ────────────────────────────────────
function startNearbyCheck() {
  setInterval(function () {
    if (!myCurrentLat || !myCurrentLng) return;
    allFriendsData.forEach(function (friend) {
      if (!friend.lat || !friend.lng) return;
      if (friend.status !== "free") return;
      const dist = getDistance(myCurrentLat, myCurrentLng, friend.lat, friend.lng);
      if (dist <= 500) {
        if (!alreadyNotified[friend.id]) {
          alreadyNotified[friend.id] = true;
          sendNearbyNotification(friend.name, dist);
          showNotification(friend.name + " is nearby and free!");
        }
      } else {
        alreadyNotified[friend.id] = false;
      }
    });
  }, 30000);
}

// ── Privacy / fuzzy location ────────────────────────
function applyPrivacy(lat, lng) {
  const privacy = document.getElementById("privacy-select").value;
  if (privacy === "fuzzy") {
    const offset = 0.004;
    return {
      lat: lat + (Math.random() - 0.5) * offset,
      lng: lng + (Math.random() - 0.5) * offset
    };
  }
  return { lat, lng };
}

// ── Favorite spots ───────────────────────────────────
let favSpots = JSON.parse(localStorage.getItem("favSpots") || "[]");
let favMarkers = [];

function saveFavSpots() {
  localStorage.setItem("favSpots", JSON.stringify(favSpots));
}

function renderFavList() {
  const favList = document.getElementById("fav-list");
  favList.innerHTML = "";
  favMarkers.forEach(m => map.removeLayer(m));
  favMarkers = [];

  if (favSpots.length === 0) {
    favList.innerHTML = '<div style="font-size:12px;color:#bbb;padding:4px 0">No favorites yet</div>';
    return;
  }

  favSpots.forEach(function (spot, index) {
    const marker = L.marker([spot.lat, spot.lng], {
      icon: L.divIcon({
        className: "",
        html: '<div style="font-size:22px">⭐</div>',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      })
    }).addTo(map);
    marker.bindPopup("<b>⭐ " + spot.name + "</b>");
    favMarkers.push(marker);

    const item = document.createElement("div");
    item.className = "fav-item";
    item.innerHTML =
      '<span class="fav-name">⭐ ' + spot.name + "</span>" +
      '<div class="fav-actions">' +
        '<button class="fav-go" data-index="' + index + '">Go</button>' +
        '<button class="fav-del" data-index="' + index + '">✕</button>' +
      "</div>";

    item.querySelector(".fav-go").addEventListener("click", function () {
      map.setView([spot.lat, spot.lng], 17);
      marker.openPopup();
    });
    item.querySelector(".fav-del").addEventListener("click", function () {
      favSpots.splice(index, 1);
      saveFavSpots();
      renderFavList();
    });

    favList.appendChild(item);
  });
}

// ── Chat ─────────────────────────────────────────────
let chatOpen = false;

function setupChat() {
  const chatToggle = document.getElementById("chat-toggle");
  const chatPanel = document.getElementById("chat-panel");
  const chatInput = document.getElementById("chat-input");
  const chatSend = document.getElementById("chat-send");
  const chatMessages = document.getElementById("chat-messages");
  const chatClose = document.getElementById("chat-close");

  chatToggle.addEventListener("click", function () {
    chatOpen = !chatOpen;
    chatPanel.style.display = chatOpen ? "flex" : "none";
    if (chatOpen) {
      chatInput.focus();
      chatToggle.querySelector(".chat-badge").style.display = "none";
    }
  });

  chatClose.addEventListener("click", function () {
    chatOpen = false;
    chatPanel.style.display = "none";
  });

  function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = "";
    addDoc(collection(db, "messages"), {
      name: myName,
      text: text,
      userId: myUserId,
      sentAt: new Date().toISOString()
    });
  }

  chatSend.addEventListener("click", sendMessage);
  chatInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") sendMessage();
  });

  const messagesRef = query(
    collection(db, "messages"),
    orderBy("sentAt", "asc"),
    limit(50)
  );

  onSnapshot(messagesRef, function (snapshot) {
    chatMessages.innerHTML = "";
    let hasNew = false;

    snapshot.forEach(function (docSnap) {
      const data = docSnap.data();
      const isMe = data.userId === myUserId;

      const bubble = document.createElement("div");
      bubble.className = "chat-bubble " + (isMe ? "me" : "them");

      const time = data.sentAt
        ? new Date(data.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "";

      bubble.innerHTML =
        (!isMe ? '<div class="bubble-name">' + data.name + "</div>" : "") +
        '<div class="bubble-text">' + data.text + "</div>" +
        '<div class="bubble-time">' + time + "</div>";

      chatMessages.appendChild(bubble);
      hasNew = true;
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;

    if (hasNew && !chatOpen) {
      chatToggle.querySelector(".chat-badge").style.display = "flex";
    }
  });
}

// ── Main app start ───────────────────────────────────
function startApp() {
  document.getElementById("modal").style.display = "none";
  document.getElementById("main-app").style.display = "flex";
  document.getElementById("my-name").textContent = myName;
  document.getElementById("my-avatar").textContent = myName.charAt(0).toUpperCase();
  localStorage.setItem("myName", myName);

  requestNotificationPermission();

  map = L.map("map").setView([23.8103, 90.4125], 14);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "OpenStreetMap"
  }).addTo(map);

  map.on("contextmenu", function (e) {
    document.getElementById("fav-lat").value = e.latlng.lat;
    document.getElementById("fav-lng").value = e.latlng.lng;
    document.getElementById("fav-name-input").value = "";
    document.getElementById("fav-modal").style.display = "flex";
  });

  renderFavList();
  setupChat();

  // ── Firestore realtime listener ──
  const usersRef = collection(db, "users");
  onSnapshot(usersRef, function (snapshot) {
    const friendList = document.getElementById("friend-list");
    friendList.innerHTML = "";
    allFriendsData = [];

    snapshot.forEach(function (docSnap) {
      const data = docSnap.data();
      const userId = docSnap.id;

      if (userId === myUserId) return;
      if (!data.lat || !data.lng) return;
      if (data.privacy === "hidden") return;

      allFriendsData.push({
        id: userId,
        name: data.name,
        lat: data.lat,
        lng: data.lng,
        status: data.status
      });

      const isFree = data.status === "free";
      const dotColor = isFree ? "#1D9E75" : "#e74c3c";
      const colorIndex = Math.abs(userId.charCodeAt(0)) % colors.length;
      const avatarColor = colors[colorIndex];
      const initial = data.name ? data.name.charAt(0).toUpperCase() : "?";

      if (markers[userId]) {
        markers[userId].setLatLng([data.lat, data.lng]);
        markers[userId].setStyle({ fillColor: dotColor });
        markers[userId].setPopupContent("<b>" + data.name + "</b><br>Status: " + data.status);
      } else {
        const marker = L.circleMarker([data.lat, data.lng], {
          radius: 13,
          fillColor: dotColor,
          color: "white",
          weight: 2.5,
          fillOpacity: 0.9
        }).addTo(map);
        marker.bindPopup("<b>" + data.name + "</b><br>Status: " + data.status);
        markers[userId] = marker;
      }

      const card = document.createElement("div");
      card.className = "friend-card";
      const dotClass = isFree ? "green" : "red";
      const statusLabel = isFree ? "Free now" : "Busy";
      const statusClass = isFree ? "free" : "busy";

      card.innerHTML =
        '<div class="avatar" style="background:' + avatarColor + '">' + initial + "</div>" +
        '<div class="card-info">' +
          '<div class="card-name">' + data.name + "</div>" +
          '<div class="card-status ' + statusClass + '">' + statusLabel + "</div>" +
        "</div>" +
        '<span class="status-dot ' + dotClass + '"></span>';

      card.addEventListener("click", function () {
        map.setView([data.lat, data.lng], 16);
        markers[userId].openPopup();
      });

      friendList.appendChild(card);
    });
  });

  // ── Auto-expire buttons ──
  document.querySelectorAll(".expire-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".expire-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      expireHours = parseInt(btn.dataset.hours);
      showNotification("Auto-remove set to " + expireHours + " hour(s)");
    });
  });

  // ── I'm Free ──
  const freeBtn = document.getElementById("free-btn");
  const myStatusText = document.getElementById("my-status-text");
  const expirePanel = document.getElementById("expire-panel");

  freeBtn.addEventListener("click", function () {
    navigator.geolocation.getCurrentPosition(async function (position) {
      myCurrentLat = position.coords.latitude;
      myCurrentLng = position.coords.longitude;

      const privacy = document.getElementById("privacy-select").value;
      const loc = applyPrivacy(myCurrentLat, myCurrentLng);

      const data = {
        name: myName,
        lat: loc.lat,
        lng: loc.lng,
        status: "free",
        privacy: privacy,
        updatedAt: new Date().toISOString()
      };

      if (expireHours) {
        const expireAt = new Date();
        expireAt.setHours(expireAt.getHours() + expireHours);
        data.expireAt = expireAt.toISOString();
      }

      await setDoc(doc(db, "users", myUserId), data);
      map.setView([myCurrentLat, myCurrentLng], 15);
      myStatusText.textContent = "Free now";
      myStatusText.className = "friend-status free";
      expirePanel.style.display = "block";
      showNotification("Friends notified — you are free!");
      startNearbyCheck();
    });
  });

  // ── I'm Busy ──
  const busyBtn = document.getElementById("busy-btn");
  busyBtn.addEventListener("click", function () {
    navigator.geolocation.getCurrentPosition(async function (position) {
      myCurrentLat = position.coords.latitude;
      myCurrentLng = position.coords.longitude;

      const privacy = document.getElementById("privacy-select").value;
      const loc = applyPrivacy(myCurrentLat, myCurrentLng);

      await setDoc(doc(db, "users", myUserId), {
        name: myName,
        lat: loc.lat,
        lng: loc.lng,
        status: "busy",
        privacy: privacy,
        updatedAt: new Date().toISOString()
      });

      myStatusText.textContent = "Busy";
      myStatusText.className = "friend-status busy";
      expirePanel.style.display = "none";
      showNotification("Status updated — you are busy.");
    });
  });

  // ── Logout ──
  document.getElementById("logout-btn").addEventListener("click", function () {
    document.getElementById("logout-modal").style.display = "flex";
  });
  document.getElementById("logout-cancel").addEventListener("click", function () {
    document.getElementById("logout-modal").style.display = "none";
  });
  document.getElementById("logout-confirm").addEventListener("click", async function () {
    await deleteDoc(doc(db, "users", myUserId));
    localStorage.removeItem("myUserId");
    localStorage.removeItem("myName");
    location.reload();
  });

  // ── Favorite spot modal ──
  document.getElementById("fav-cancel-btn").addEventListener("click", function () {
    document.getElementById("fav-modal").style.display = "none";
  });
  document.getElementById("fav-save-btn").addEventListener("click", function () {
    const name = document.getElementById("fav-name-input").value.trim();
    if (!name) return;
    const lat = parseFloat(document.getElementById("fav-lat").value);
    const lng = parseFloat(document.getElementById("fav-lng").value);
    favSpots.push({ name, lat, lng });
    saveFavSpots();
    renderFavList();
    document.getElementById("fav-modal").style.display = "none";
    showNotification("Saved: " + name);
  });
  document.getElementById("fav-name-input").addEventListener("keydown", function (e) {
    if (e.key === "Enter") document.getElementById("fav-save-btn").click();
  });
}

// ── Auto login if name saved ─────────────────────────
const savedName = localStorage.getItem("myName");
if (savedName) {
  myName = savedName;
  startApp();
}

// ── Name modal ───────────────────────────────────────
document.getElementById("name-btn").addEventListener("click", function () {
  const input = document.getElementById("name-input").value.trim();
  if (input.length === 0) return;
  myName = input;
  startApp();
});
document.getElementById("name-input").addEventListener("keydown", function (e) {
  if (e.key === "Enter") document.getElementById("name-btn").click();
});