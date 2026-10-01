import express from 'express';
import { prisma } from '../prismaClient.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Haversine formula for distance in miles
function getDistanceMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Radius of earth in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// GET all echoes (support search, feed mode 'local' or 'following', tags, location radius)
router.get('/', optionalAuthMiddleware, async (req, res) => {
  try {
    const { search, feed = 'local', lat, lng, radius, tag, authorId } = req.query;

    let where = {};

    // Filter by tag
    if (tag) {
      where.tags = { contains: tag };
    }

    // Filter by author
    if (authorId) {
      where.authorId = authorId;
    }

    // Filter by search term
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
        { locationName: { contains: search } },
        { tags: { contains: search } }
      ];
    }

    // Fetch followed IDs for req.user if authenticated
    let followingIds = [];
    if (req.user) {
      const follows = await prisma.follow.findMany({
        where: { followerId: req.user.id },
        select: { followingId: true }
      });
      followingIds = follows.map(f => f.followingId);
    }

    // Following feed
    if (feed === 'following') {
      if (req.user) {
        where.authorId = { in: [...followingIds, req.user.id] };
      } else {
        return res.json([]);
      }
    }

    let echoes = await prisma.echo.findMany({
      where,
      include: {
        author: {
          select: { id: true, username: true, fullName: true, displayName: true, avatarUrl: true, badges: true }
        },
        likes: { select: { userId: true } },
        _count: { select: { comments: true, likes: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Handle radius filtering if lat & lng provided
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);

      echoes = echoes.map(echo => {
        const dist = getDistanceMiles(userLat, userLng, echo.latitude, echo.longitude);
        return {
          ...echo,
          distanceMiles: Math.round(dist * 10) / 10
        };
      });

      if (radius && radius !== 'all') {
        const maxDist = parseFloat(radius);
        echoes = echoes.filter(echo => echo.distanceMiles <= maxDist);
      }
    }

    // Process time capsule lock state & countdowns
    const now = new Date();

    // Format output with isLiked flag and time capsule processing
    const formatted = echoes.map(echo => {
      const isLiked = req.user ? echo.likes.some(l => l.userId === req.user.id) : false;
      const isFollowingAuthor = req.user ? followingIds.includes(echo.authorId) : false;
      const { likes, ...rest } = echo;

      let isLocked = false;
      let countdown = null;

      if (echo.isTimeCapsule) {
        if (echo.unlockDate && new Date(echo.unlockDate) > now) {
          isLocked = true;
          const diffMs = new Date(echo.unlockDate) - now;
          const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          countdown = { days, hours, mins };
        } else {
          isLocked = false;
        }
      }

      // If time capsule is locked and requester is not the author, hide content
      const isAuthor = req.user && req.user.id === echo.authorId;
      const content = (isLocked && !isAuthor) 
        ? "🔒 [Time Capsule Sealed - Content locked until " + new Date(echo.unlockDate).toLocaleDateString() + "]" 
        : echo.content;

      return {
        ...rest,
        content,
        isLocked,
        countdown,
        isLiked,
        isFollowingAuthor,
        likeCount: echo._count.likes,
        commentCount: echo._count.comments
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Get echoes error:', error);
    res.status(500).json({ error: 'Failed to fetch echoes' });
  }
});

// GET single echo by ID
router.get('/:id', optionalAuthMiddleware, async (req, res) => {
  try {
    const echo = await prisma.echo.findUnique({
      where: { id: req.params.id },
      include: {
        author: {
          select: { id: true, username: true, fullName: true, displayName: true, avatarUrl: true, badges: true }
        },
        likes: { select: { userId: true } },
        comments: {
          include: {
            author: { select: { id: true, username: true, fullName: true, displayName: true, avatarUrl: true } }
          },
          orderBy: { createdAt: 'asc' }
        },
        _count: { select: { comments: true, likes: true } }
      }
    });

    if (!echo) {
      return res.status(404).json({ error: 'Echo not found' });
    }

    const isLiked = req.user ? echo.likes.some(l => l.userId === req.user.id) : false;
    const { likes, ...rest } = echo;

    const now = new Date();
    let isLocked = false;
    let countdown = null;

    if (echo.isTimeCapsule) {
      if (echo.unlockDate && new Date(echo.unlockDate) > now) {
        isLocked = true;
        const diffMs = new Date(echo.unlockDate) - now;
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        countdown = { days, hours, mins };
      } else {
        isLocked = false;
      }
    }

    const isAuthor = req.user && req.user.id === echo.authorId;
    const content = (isLocked && !isAuthor) 
      ? "🔒 [Time Capsule Sealed - Content locked until " + new Date(echo.unlockDate).toLocaleDateString() + "]" 
      : echo.content;

    res.json({
      ...rest,
      content,
      isLocked,
      countdown,
      isLiked,
      likeCount: echo._count.likes,
      commentCount: echo._count.comments
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching echo' });
  }
});

// POST drop new echo memory / time capsule
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      title,
      content,
      locationName,
      latitude,
      longitude,
      imageUrl,
      weatherTemp = '70°F',
      weatherCondition = 'Sunny',
      weatherIcon = 'sun',
      isTimeCapsule = false,
      unlockDate,
      tags = '#AtlasEcho'
    } = req.body;

    if (!title || !content || !locationName || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Title, story content, location name, and coordinates required' });
    }

    // Calculate distance from previous echo if available
    const lastEcho = await prisma.echo.findFirst({
      where: { authorId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });

    let milesToAdd = 0;
    if (lastEcho) {
      milesToAdd = getDistanceMiles(lastEcho.latitude, lastEcho.longitude, parseFloat(latitude), parseFloat(longitude));
    }

    const echo = await prisma.echo.create({
      data: {
        title,
        content,
        locationName,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1000&q=80',
        weatherTemp,
        weatherCondition,
        weatherIcon,
        isTimeCapsule: Boolean(isTimeCapsule),
        isLocked: Boolean(isTimeCapsule),
        unlockDate: unlockDate ? new Date(unlockDate) : null,
        tags,
        authorId: req.user.id
      },
      include: {
        author: {
          select: { id: true, fullName: true, displayName: true, avatarUrl: true, badges: true }
        }
      }
    });

    if (milesToAdd > 0) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { totalMiles: { increment: Math.round(milesToAdd * 10) / 10 } }
      });
    }

    res.status(201).json({ message: 'Echo dropped into physical space!', echo });
  } catch (error) {
    console.error('Drop echo error:', error);
    res.status(500).json({ error: 'Failed to drop echo memory' });
  }
});

// Toggle Like on Echo
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const echoId = req.params.id;
    const userId = req.user.id;

    const existingLike = await prisma.like.findUnique({
      where: { userId_echoId: { userId, echoId } }
    });

    if (existingLike) {
      await prisma.like.delete({ where: { id: existingLike.id } });
      const count = await prisma.like.count({ where: { echoId } });
      return res.json({ liked: false, likeCount: count });
    } else {
      await prisma.like.create({
        data: { userId, echoId }
      });

      // Send notification to author if it's not self-like
      const echo = await prisma.echo.findUnique({ where: { id: echoId } });
      if (echo && echo.authorId !== userId) {
        await prisma.notification.create({
          data: {
            userId: echo.authorId,
            type: 'like',
            title: 'New Like',
            message: `${req.user.fullName} liked your echo: "${echo.title}".`,
            relatedEchoId: echoId
          }
        });
      }

      const count = await prisma.like.count({ where: { echoId } });
      return res.json({ liked: true, likeCount: count });
    }
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ error: 'Error toggling like' });
  }
});

// Delete echo memory
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const echo = await prisma.echo.findUnique({ where: { id: req.params.id } });
    if (!echo) return res.status(404).json({ error: 'Echo not found' });

    if (echo.authorId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this echo' });
    }

    await prisma.echo.delete({ where: { id: req.params.id } });
    res.json({ message: 'Echo erased from location' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting echo' });
  }
});

export default router;
