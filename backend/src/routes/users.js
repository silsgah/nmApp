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

    if (role === 'STUDENT' && (!staffId || !staffId.trim())) {
      return reply.code(400).send({ error: 'Student Index Number is required' });
    }

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
        staffId: staffId ? staffId.trim() : null,
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

  // POST /users/bulk-import — import students from Excel/CSV/JSON
  fastify.post('/bulk-import', adminOnly, async (request, reply) => {
    const { users, programmeId } = request.body; // users: [{ name, email, staffId?, programmeId? }]

    if (!Array.isArray(users) || users.length === 0) {
      return reply.code(400).send({ error: 'No student records provided' });
    }

    const results = { created: 0, skipped: 0, errors: [] };
    const defaultPassword = await bcrypt.hash('NMPortal123!', 12);

    for (let i = 0; i < users.length; i++) {
      const u = users[i];
      const row = i + 1;

      // Validate required fields
      if (!u.name || !u.name.trim()) {
        results.errors.push({ row, email: u.email || '', reason: 'Missing full name' });
        continue;
      }
      if (!u.email || !u.email.trim()) {
        results.errors.push({ row, name: u.name, reason: 'Missing email address' });
        continue;
      }

      try {
        const existing = await prisma.user.findUnique({ where: { email: u.email.toLowerCase() } });
        if (existing) {
          results.skipped++;
          continue;
        }

        // Per-student programmeId takes priority, then fallback to global programmeId
        const studentProgrammeId = u.programmeId || programmeId || null;

        await prisma.user.create({
          data: {
            name: u.name.trim(),
            email: u.email.toLowerCase().trim(),
            passwordHash: defaultPassword,
            role: u.role || 'STUDENT',
            programmeId: studentProgrammeId,
            staffId: u.staffId ? u.staffId.trim() : null,
          },
        });
        results.created++;
      } catch (err) {
        results.errors.push({ row, email: u.email, reason: err.message });
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

    const existingUser = await prisma.user.findUnique({ where: { id: request.params.id } });
    if (!existingUser) return reply.code(404).send({ error: 'User not found' });

    const isStudent = (role || existingUser.role) === 'STUDENT';
    if (isStudent && staffId !== undefined && (!staffId || !staffId.trim())) {
      return reply.code(400).send({ error: 'Student Index Number is required' });
    }

    const data = {
      ...(name && { name }),
      ...(email && { email: email.toLowerCase() }),
      ...(role && { role }),
      ...(programmeId !== undefined && { programmeId }),
      ...(staffId !== undefined && { staffId: staffId ? staffId.trim() : null }),
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
