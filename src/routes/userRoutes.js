import express from 'express';
import { prisma } from '../prismaClient.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET user profile with stats & travelogue memories
router.get('/:id', optionalAuthMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: {
            echoes: true,
            followers: true,
            following: true
          }
        },
        echoes: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { likes: true, comments: true } }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Traveler not found' });
    }

    let isFollowing = false;
    if (req.user) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: req.user.id,
            followingId: user.id
          }
        }
      });
      isFollowing = Boolean(follow);
    }

    const { password, ...userWithoutPassword } = user;

    res.json({
      ...userWithoutPassword,
      isFollowing,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      memoriesCount: user._count.echoes
    });
  } catch (error) {
    console.error('Fetch user error:', error);
    res.status(500).json({ error: 'Error fetching traveler profile' });
  }
});

// Follow / Unfollow traveller
router.post('/:id/follow', authMiddleware, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user.id;

    if (targetUserId === currentUserId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: targetUserId
        }
      }
    });

    if (existingFollow) {
      await prisma.follow.delete({ where: { id: existingFollow.id } });
      const followersCount = await prisma.follow.count({ where: { followingId: targetUserId } });
      return res.json({ following: false, followersCount });
    } else {
      await prisma.follow.create({
        data: {
          followerId: currentUserId,
          followingId: targetUserId
        }
      });

      // Send notification
      await prisma.notification.create({
        data: {
          userId: targetUserId,
          type: 'follow',
          title: 'New Follower',
          message: `${req.user.fullName} is now following your journey.`
        }
      });

      const followersCount = await prisma.follow.count({ where: { followingId: targetUserId } });
      return res.json({ following: true, followersCount });
    }
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ error: 'Failed to process follow request' });
  }
});

// GET Notifications ("Incoming Echoes")
router.get('/notifications/all', authMiddleware, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching notifications' });
  }
});

// Mark notification as read
router.post('/notifications/:notifId/read', authMiddleware, async (req, res) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.notifId },
      data: { read: true }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error updating notification' });
  }
});

export default router;
