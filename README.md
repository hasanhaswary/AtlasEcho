# 🗺️ AtlasEcho — Interactive Geo-Journal & Memory Mapper 📍✨

<p align="center">
  <img src="https://img.shields.io/badge/AtlasEcho-v1.0.0-6366f1?style=for-the-badge&logo=compass&logoColor=white" alt="AtlasEcho Version" />
  <img src="https://img.shields.io/badge/License-Apache_2.0-emerald?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/badge/Node.js-v18+-green?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Prisma-PostgreSQL-5a67d8?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Vibe-100%25%20Nostalgic%20Wanderlust-ff6b6b?style=for-the-badge" alt="Vibe" />
</p>

---

> 🚀 **Welcome to AtlasEcho!** Where your geographical memories come alive as pin-drop "Echoes" on an interactive map. Pin your journeys, lock futuristic time capsules, track your global stats, and connect with fellow explorers around the globe! 🌍💬✨

---

## 📸 App Showcase & Screenshots

<!-- ================================================================= -->
<!-- 📸 SCREENSHOT MARKERS & PLACEHOLDERS                              -->
<!-- Replace the placeholder image URLs below with your own app photos!  -->
<!-- Suggested folder location for images: docs/screenshots/          -->
<!-- ================================================================= -->

<p align="center">
  <!-- 📸 MARKER: MAIN MAP VIEW SCREENSHOT -->
  <a href="#-app-showcase--screenshots">
    <img src="https://placehold.co/1200x600/1e293b/6366f1?text=📸+PLACEHOLDER:+Interactive+Memory+Map+%26+Echo+Feed&font=sans" width="95%" alt="AtlasEcho Interactive Memory Map View" />
  </a>
  <br>
  <em>📍 <b>Interactive Memory Map</b> — Explore geo-tagged memory markers across the globe with custom map themes.</em>
</p>

<br>

<div align="center">
  <table>
    <tr>
      <td width="50%" align="center">
        <!-- 📸 MARKER: TIME CAPSULE FEATURE SCREENSHOT -->
        <img src="https://placehold.co/600x400/0f172a/38bdf8?text=📸+PLACEHOLDER:+Time+Capsule+Echoes&font=sans" width="100%" alt="Time Capsule Echoes" />
        <br>
        <em>⏳ <b>Time Capsules</b> — Lock memories to automatically unlock on a future date.</em>
      </td>
      <td width="50%" align="center">
        <!-- 📸 MARKER: TRAVELER PROFILE SCREENSHOT -->
        <img src="https://placehold.co/600x400/0f172a/ec4899?text=📸+PLACEHOLDER:+Traveler+Profile+%26+Stats&font=sans" width="100%" alt="Traveler Profile & Stats" />
        <br>
        <em>🏆 <b>Traveler Profile</b> — Total logged miles, country count, nostalgic map themes & badges.</em>
      </td>
    </tr>
  </table>
</div>

---

## ✨ Features That Make AtlasEcho Pop! 🌟

- 📍 **Spatial Echoes**: Pin detailed travel logs with precise latitude/longitude, photos, micro-weather metadata, and nostalgic tags.
- ⏳ **Digital Time Capsules**: Lock memories in time! Set future unlock dates for birthday surprises, trip anniversaries, or future-self notes.
- 🗺️ **Interactive Memory Map**: Pan & zoom across a stylish, responsive map populated with live spatial markers.
- 🌦️ **Micro-Weather Sync**: Capture real-time ambient weather conditions (temperature & conditions) with every Echo.
- 👥 **Traveler Social Network**: Follow fellow wandering souls, leave comments, drop likes, and receive real-time updates.
- 📊 **Explorer Dashboard & Stats**: Track your total miles traveled, countries visited, unlocked achievement badges, and preferred distance/temperature units.
- 🎨 **Nostalgic Custom Themes**: Personalize your map viewing experience with custom aesthetic map layers.

---

## 🔐 Demo Credentials (Test Explorers) 🎒

Want to jump right into testing without signing up? Use any of these pre-seeded explorer accounts:

| Explorer | Email | Password | Username | Bio & Wanderlust Stats |
| :--- | :--- | :--- | :--- | :--- |
| **Julian Thorne** 🌿 | `julian@atlas.com` | `password123` | `@julian_thorne` | 12,480 Miles • 14 Countries • `#MemoryKeeper` |
| **Amara Diallo** 🌍 | `amara@atlas.com` | `password123` | `@amara_explorer` | 9,420 Miles • 8 Countries • `#CapeTownLocal` |
| **Liam Botha** 🏔️ | `liam@atlas.com` | `password123` | `@liam_cape` | 14,200 Miles • 12 Countries • `#SummitSeeker` |
| **Maya Lin** ⛩️ | `maya@atlas.com` | `password123` | `@maya_wanderlust` | 18,500 Miles • 19 Countries • `#CultureSeeker` |
| **Mateo Silva** 🎨 | `mateo@atlas.com` | `password123` | `@mateo_voyages` | 11,300 Miles • 11 Countries • `#UrbanSketcher` |

---

## 🛠️ Tech Stack & Architecture ⚙️

| Layer | Technologies Used |
| :--- | :--- |
| **Backend Engine** | Node.js, Express.js (`src/server.js`) |
| **Database & ORM** | PostgreSQL + Prisma ORM (`prisma/schema.prisma`) |
| **Auth & Security** | JWT (JSON Web Tokens) & `bcryptjs` password hashing |
| **Frontend UI** | HTML5, Modern Vanilla JavaScript, Custom CSS3 |
| **Styling & Icons** | Tailwind CSS / Vite build utilities & Lucide React Icons |
| **Tooling & Dev Engine** | `tsx` script runner, dotenv |

---

## 🚀 Quick Start Guide

Ready to get AtlasEcho running on your local setup? Follow these quick steps!

### 1. Prerequisites 📋
- **Node.js**: v18.0 or higher
- **PostgreSQL**: Local or cloud database instance (e.g. Neon, Supabase, local Postgres)
- **Package Manager**: `npm` (or `bun` / `yarn`)

### 2. Clone & Install 📦
```bash
git clone https://github.com/YOUR_USERNAME/atlasecho.git
cd atlasecho
npm install
```

### 3. Configure Environment (`.env`) 🔑
Create a `.env` file in the root directory (or copy `.env.example`):
```bash
cp .env.example .env
```
Fill in your database connection string:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/atlasecho?schema=public"
PORT=5300
```

### 4. Push Database Schema & Seed Data 🗄️
Push the Prisma schema to your PostgreSQL database and seed sample traveler profiles & Cape Town echoes:
```bash
# Push database schema via Prisma
npm run build

# Seed database with sample profiles & memories
npm run seed
```

### 5. Launch the Server! 🎉
```bash
npm run dev
```
Open **`http://localhost:5300`** in your browser and start exploring! 🗺️✨

---

## 📂 Project Structure

```
atlasecho/
├── prisma/
│   ├── schema.prisma        # Database schema models (User, Echo, Comment, Like, Follow, etc.)
│   └── seed.js              # Database seed script for test accounts & sample echoes
├── public/
│   ├── index.html           # Main SPA HTML structure
│   ├── style.css            # Custom glassmorphism & map styling
│   └── app.js               # Interactive frontend logic & API client
├── src/
│   ├── server.js            # Express server initialization & static file serving
│   ├── prismaClient.js      # Prisma ORM instance
│   ├── middleware/          # Auth JWT & validation middleware
│   └── routes/              # Express API route modules
│       ├── authRoutes.js    # Login, register, profile authentication
│       ├── echoRoutes.js    # Spatial Echo & Time Capsule CRUD operations
│       ├── commentRoutes.js # Echo comments & interactive likes
│       ├── userRoutes.js    # Explorer profiles, settings & follow relationships
│       └── weatherRoutes.js # Micro-weather lookup helpers
├── .env.example             # Template for required environment variables
├── .gitignore               # Git ignore rules
└── package.json             # NPM dependencies and run scripts
```

---

## 📡 API Reference 🔌

### 🔑 Authentication (`/api/auth`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new explorer account | Public |
| `POST` | `/api/auth/login` | Authenticate traveler & return JWT token | Public |
| `GET` | `/api/auth/me` | Fetch currently logged-in user profile | Private (JWT) |

### 📍 Spatial Echoes (`/api/echoes`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/echoes` | Retrieve public memory Echoes | Public |
| `POST` | `/api/echoes` | Create a new Echo or Time Capsule | Private (JWT) |
| `GET` | `/api/echoes/:id` | Get single Echo details & metadata | Public |
| `DELETE` | `/api/echoes/:id` | Delete an owned Echo | Private (JWT) |

### 💬 Social Interactions (`/api/echoes`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/echoes/:id/comments` | List comments for an Echo | Public |
| `POST` | `/api/echoes/:id/comments` | Add a comment to an Echo | Private (JWT) |
| `POST` | `/api/echoes/:id/like` | Toggle like status on an Echo | Private (JWT) |

### 👤 Explorers & Profiles (`/api/users`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users/profile` | Retrieve active traveler profile & stats | Private (JWT) |
| `PUT` | `/api/users/profile` | Update profile bio, preferences & map theme | Private (JWT) |
| `POST` | `/api/users/:username/follow` | Follow or unfollow another explorer | Private (JWT) |

### 🌦️ Weather Service (`/api/weather`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/weather/current` | Fetch micro-weather data for coordinates | Public |

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!  
Feel free to check out the [issues page](https://github.com/YOUR_USERNAME/atlasecho/issues). Give a ⭐️ if you like this project!

---

## 📜 License

Distributed under the **Apache 2.0 License**. See `LICENSE` for more information.

---

<p align="center">
  Made with ❤️ & wanderlust by <b>AtlasEcho Explorers</b> 🗺️✨
</p>

