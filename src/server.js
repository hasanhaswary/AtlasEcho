import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

import authRoutes from './routes/authRoutes.js';
import echoRoutes from './routes/echoRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import userRoutes from './routes/userRoutes.js';
import weatherRoutes from './routes/weatherRoutes.js';
import { prisma } from './prismaClient.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5300;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static frontend files from /public
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/echoes', echoRoutes);
app.use('/api/echoes', commentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/weather', weatherRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'AtlasEcho API' });
});

// SPA fallback for HTML5 routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Auto seed check on server boot
async function initDatabase() {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log('Database empty. Running seed...');
      const { execSync } = await import('child_process');
      execSync('node prisma/seed.js', { stdio: 'inherit' });
    } else {
      console.log(`Database connected. Found ${userCount} travelers.`);
    }
  } catch (err) {
    console.warn('Auto seed check warning:', err.message);
  }
}

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`AtlasEcho server running on http://0.0.0.0:${PORT}`);
  await initDatabase();
});
