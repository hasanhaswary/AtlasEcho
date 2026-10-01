import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prismaClient.js';
import { authMiddleware, JWT_SECRET } from '../middleware/authMiddleware.js';

const router = express.Router();

// Register new traveler passport
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, username } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Full name, email, and password are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Traveler email already registered' });
    }

    let finalUsername = username ? username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') : '';
    if (!finalUsername) {
      finalUsername = fullName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.floor(100 + Math.random() * 900);
    }

    const existingUsername = await prisma.user.findUnique({ where: { username: finalUsername } });
    if (existingUsername) {
      return res.status(400).json({ error: 'Username is already taken by another traveler.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const displayName = fullName.split(' ')[0] + ' Echo';

    const user = await prisma.user.create({
      data: {
        username: finalUsername,
        email,
        password: hashedPassword,
        fullName,
        displayName,
        bio: 'Just joined the expedition. Exploring and dropping echoes around the world!',
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`,
      }
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({
      message: 'Passport created successfully',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error registering user' });
  }
});

// Login traveler
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    const { password: _, ...userWithoutPassword } = user;
    res.json({
      message: 'Welcome back, Traveler',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error logging in' });
  }
});

// Get Current User Profile
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        _count: {
          select: {
            echoes: true,
            followers: true,
            following: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json({
      user: {
        ...userWithoutPassword,
        followersCount: user._count.followers,
        followingCount: user._count.following,
        memoriesCount: user._count.echoes,
        echoesCount: user._count.echoes
      }
    });
  } catch (error) {
    console.error('Error fetching auth me profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update Passport / Profile Settings
const updateProfileHandler = async (req, res) => {
  try {
    const { username, fullName, displayName, bio, avatarUrl, bannerUrl, badges, publicVisibility, distanceUnits, temperatureUnits, mapStyle } = req.body;

    let formattedUsername = undefined;
    if (username !== undefined && username !== null) {
      formattedUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (!formattedUsername) {
        return res.status(400).json({ error: 'Username must contain valid letters, numbers, or underscores' });
      }
      if (formattedUsername !== req.user.username) {
        const existing = await prisma.user.findUnique({ where: { username: formattedUsername } });
        if (existing && existing.id !== req.user.id) {
          return res.status(400).json({ error: 'Username @' + formattedUsername + ' is already taken.' });
        }
      }
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(formattedUsername && { username: formattedUsername }),
        ...(fullName !== undefined && { fullName: fullName.trim() }),
        ...(displayName !== undefined && { displayName: displayName.trim() }),
        ...(bio !== undefined && { bio }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(bannerUrl !== undefined && { bannerUrl }),
        ...(badges !== undefined && { badges }),
        ...(publicVisibility !== undefined && { publicVisibility: Boolean(publicVisibility) }),
        ...(distanceUnits && { distanceUnits }),
        ...(temperatureUnits && { temperatureUnits }),
        ...(mapStyle && { mapStyle }),
      },
      include: {
        _count: {
          select: {
            echoes: true,
            followers: true,
            following: true
          }
        }
      }
    });

    const { password: _, ...userWithoutPassword } = updated;
    res.json({
      message: 'Profile settings updated successfully',
      user: {
        ...userWithoutPassword,
        followersCount: updated._count.followers,
        followingCount: updated._count.following,
        memoriesCount: updated._count.echoes,
        echoesCount: updated._count.echoes
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile settings' });
  }
};

router.put('/passport', authMiddleware, updateProfileHandler);
router.put('/me', authMiddleware, updateProfileHandler);

export default router;
