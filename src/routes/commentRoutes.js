import express from 'express';
import { prisma } from '../prismaClient.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router({ mergeParams: true });

// Get comments for an echo
router.get('/:echoId/comments', async (req, res) => {
  try {
    const { echoId } = req.params;
    const comments = await prisma.comment.findMany({
      where: { echoId },
      include: {
        author: { select: { id: true, fullName: true, displayName: true, avatarUrl: true } }
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Add comment or nested reply
router.post('/:echoId/comments', authMiddleware, async (req, res) => {
  try {
    const { echoId } = req.params;
    const { content, parentId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content cannot be empty' });
    }

    const echo = await prisma.echo.findUnique({ where: { id: echoId } });
    if (!echo) {
      return res.status(404).json({ error: 'Echo post not found' });
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        echoId,
        authorId: req.user.id,
        parentId: parentId || null
      },
      include: {
        author: { select: { id: true, fullName: true, displayName: true, avatarUrl: true } }
      }
    });

    // Notify post author if not self-comment
    if (echo.authorId !== req.user.id) {
      await prisma.notification.create({
        data: {
          userId: echo.authorId,
          type: 'highlight',
          title: 'New Echo Discussion',
          message: `${req.user.fullName} commented on your echo "${echo.title}".`,
          relatedEchoId: echoId
        }
      });
    }

    res.status(201).json(comment);
  } catch (error) {
    console.error('Comment creation error:', error);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

// Delete comment
const deleteCommentHandler = async (req, res) => {
  try {
    const commentId = req.params.id || req.params.commentId;
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    if (comment.authorId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete comment' });
    }

    await prisma.comment.delete({ where: { id: commentId } });
    res.json({ message: 'Comment deleted', echoId: comment.echoId });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting comment' });
  }
};

router.delete('/comments/:id', authMiddleware, deleteCommentHandler);
router.delete('/:echoId/comments/:id', authMiddleware, deleteCommentHandler);

export default router;

