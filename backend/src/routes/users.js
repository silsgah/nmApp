import bcrypt from 'bcryptjs';

/**
 * User Management Routes (Admin only)
 * GET    /api/v1/users
 * POST   /api/v1/users
 * GET    /api/v1/users/:id
 * PATCH  /api/v1/users/:id
 * DELETE /api/v1/users/:id
 * POST   /api/v1/users/bulk-import
 */
export default async function userRoutes(fastify) {
  const { prisma } = fastify;
  const adminOnly = { onRequest: [fastify.requireRole('ADMIN')] };

  // GET /users — list users with filters
  fastify.get('/', adminOnly, async (request) => {
    const { role, programmeId, search, page = 1, limit = 50 } = request.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      ...(role && {
        role: role.includes(',') ? { in: role.split(',') } : role,
      }),
      ...(programmeId && { programmeId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { staffId: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, role: true,
          staffId: true, isActive: true, createdAt: true,
          profilePictureUrl: true,
          programme: { select: { id: true, name: true } },
        },
        orderBy: { name: 'asc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.user.count({ where }),
    ]);

    return { data: users, total, page: parseInt(page), limit: parseInt(limit) };
  });

  // POST /users — create user
  fastify.post('/', adminOnly, async (request, reply) => {
    const { name, email, password, role, programmeId, staffId, profilePictureUrl } = request.body;

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return reply.code(409).send({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password || 'NMPortal123!', 12);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role,
        programmeId: programmeId || null,
        staffId: staffId || null,
        profilePictureUrl: profilePictureUrl || null,
      },
      select: {
        id: true, name: true, email: true, role: true,
        staffId: true, isActive: true, createdAt: true,
        profilePictureUrl: true,
        programme: { select: { id: true, name: true } },
      },
    });

    return reply.code(201).send(user);
  });

  // POST /users/bulk-import — import students from CSV/JSON
  fastify.post('/bulk-import', adminOnly, async (request, reply) => {
    const { users, programmeId } = request.body; // users: [{ name, email, staffId? }]

    const results = { created: 0, skipped: 0, errors: [] };
    const defaultPassword = await bcrypt.hash('NMPortal123!', 12);

    for (const u of users) {
      try {
        const existing = await prisma.user.findUnique({ where: { email: u.email.toLowerCase() } });
        if (existing) { results.skipped++; continue; }

        await prisma.user.create({
          data: {
            name: u.name,
            email: u.email.toLowerCase(),
            passwordHash: defaultPassword,
            role: u.role || 'STUDENT',
            programmeId: programmeId || null,
            staffId: u.staffId || null,
          },
        });
        results.created++;
      } catch (err) {
        results.errors.push({ email: u.email, error: err.message });
      }
    }

    return results;
  });

  // PATCH /profile — self-service profile update (password and profilePictureUrl)
  fastify.patch('/profile', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const userId = request.user.id;
    const { password, profilePictureUrl } = request.body;

    const data = {};
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 12);
      data.mustChangePassword = false;
    }
    if (profilePictureUrl !== undefined) {
      data.profilePictureUrl = profilePictureUrl;
    }

    if (Object.keys(data).length === 0) {
      return reply.code(400).send({ error: 'No update data provided' });
    }

    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true, name: true, email: true, role: true,
          staffId: true, isActive: true, profilePictureUrl: true,
          programme: { select: { id: true, name: true } },
        },
      });
      return updatedUser;
    } catch (err) {
      fastify.log.error(err, 'Failed to update user profile');
      return reply.code(500).send({ error: 'Failed to update profile' });
    }
  });

  // GET /users/:id
  fastify.get('/:id', adminOnly, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.params.id },
      select: {
        id: true, name: true, email: true, role: true,
        staffId: true, isActive: true, createdAt: true,
        profilePictureUrl: true,
        programme: { select: { id: true, name: true, fullName: true } },
      },
    });
    if (!user) return reply.code(404).send({ error: 'User not found' });
    return user;
  });

  // PATCH /users/:id
  fastify.patch('/:id', adminOnly, async (request, reply) => {
    const { name, email, role, programmeId, staffId, isActive, password, profilePictureUrl } = request.body;

    const data = {
      ...(name && { name }),
      ...(email && { email: email.toLowerCase() }),
      ...(role && { role }),
      ...(programmeId !== undefined && { programmeId }),
      ...(staffId !== undefined && { staffId }),
      ...(isActive !== undefined && { isActive }),
      ...(profilePictureUrl !== undefined && { profilePictureUrl }),
    };

    if (password) {
      data.passwordHash = await bcrypt.hash(password, 12);
    }

    try {
      const user = await prisma.user.update({
        where: { id: request.params.id },
        data,
        select: {
          id: true, name: true, email: true, role: true,
          staffId: true, isActive: true,
          profilePictureUrl: true,
          programme: { select: { id: true, name: true } },
        },
      });
      return user;
    } catch {
      return reply.code(404).send({ error: 'User not found' });
    }
  });

  // DELETE /users/:id (soft delete)
  fastify.delete('/:id', adminOnly, async (request, reply) => {
    try {
      await prisma.user.update({
        where: { id: request.params.id },
        data: { isActive: false },
      });
      return { message: 'User deactivated' };
    } catch {
      return reply.code(404).send({ error: 'User not found' });
    }
  });
}
