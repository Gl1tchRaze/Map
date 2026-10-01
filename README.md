# Map

A web-based **map application** built with HTML, CSS, and JavaScript. It is set up as a **Progressive Web App (PWA)**, so it can be installed on a phone or desktop and keep working with limited connectivity. It is configured for deployment on **Firebase Hosting** and includes a separate **admin page** for managing content.

---

## Features

- **Interactive Map Interface**: the main user-facing page (`index.html`)
- **Admin Panel**: a dedicated page (`admin.html`) for managing map data
- **Installable PWA**: web app manifest and service worker for an app-like experience
- **Offline Support**: the service worker caches assets for faster loading
- **Custom 404 Page**: friendly error page for missing routes
- **Firebase Hosting Ready**: deployment configuration included

---

## Project Structure

```
Map/
├── icons/            # App icons used by the PWA
├── 404.html          # Custom "page not found" page
├── admin.html        # Admin interface
├── app.js            # Main application logic
├── firebase.json     # Firebase Hosting configuration
├── index.html        # Main page
├── manifest.json     # PWA manifest (name, icons, theme)
├── style.css         # Styling
└── sw.js             # Service worker (caching / offline)
```

| File | Purpose |
|---|---|
| `index.html` | Entry point of the application |
| `admin.html` | Admin page for managing content |
| `app.js` | Map logic and interaction handling |
| `style.css` | Layout and visual styling |
| `manifest.json` | Makes the app installable (name, icons, colors) |
| `sw.js` | Caches files so the app loads fast and works offline |
| `firebase.json` | Hosting settings for Firebase |
| `404.html` | Shown when a page is not found |
| `icons/` | Home-screen and app icons |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| App Type | Progressive Web App (PWA) |
| Hosting | Firebase Hosting |

---

## Getting Started

### Run Locally

1. **Clone the repository**

   ```bash
   git clone https://github.com/Gl1tchRaze/Map.git
   cd Map/Map
   ```

2. **Start a local server** (a service worker needs `http://localhost`, not `file://`):

   ```bash
   # Python
   python -m http.server 8000

   # or Node.js
   npx serve
   ```

3. **Open in your browser:**

   ```
   http://localhost:8000
   ```

### Deploy to Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase deploy
```

---

## Install as an App

Open the site in Chrome or Edge, then click the **Install** icon in the address bar (or **Add to Home Screen** on mobile).

---

## Security Notes

- Firebase web API keys are safe to expose, but protect your data with proper **Firebase security rules**
- Restrict access to `admin.html` using authentication before using it in production

---

## Future Improvements

- Search and filter locations
- User authentication for the admin page
- Marker categories and custom icons
- Dark mode
- Better offline caching of map data

---

## Author

**Gl1tchRaze**

---

## License

This project is for educational purposes.
