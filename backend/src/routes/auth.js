import bcrypt from 'bcryptjs';

/**
 * Auth Routes
 * POST /api/v1/auth/login
 * POST /api/v1/auth/logout
 * GET  /api/v1/auth/me
 */
export default async function authRoutes(fastify) {
  const { prisma } = fastify;

  // POST /login
  fastify.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
        },
      },
    },
  }, async (request, reply) => {
    const { email, password } = request.body;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { programme: true },
    });

    if (!user || !user.isActive) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const token = fastify.jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      { expiresIn: '8h' }
    );

    reply
      .setCookie('nm_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 8, // 8 hours
      })
      .send({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          programme: user.programme,
        },
        token,
      });
  });

  // POST /logout
  fastify.post('/logout', async (request, reply) => {
    reply
      .clearCookie('nm_token', { path: '/' })
      .send({ message: 'Logged out successfully' });
  });

  // GET /me
  fastify.get('/me', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: {
        id: true, name: true, email: true, role: true,
        staffId: true, programme: true, createdAt: true,
      },
    });

    if (!user) return reply.code(404).send({ error: 'User not found' });
    return user;
  });

  // POST /change-password
  fastify.post('/change-password', {
    onRequest: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string' },
          newPassword: { type: 'string', minLength: 6 },
        },
      },
    },
  }, async (request, reply) => {
    const { currentPassword, newPassword } = request.body;
    const user = await prisma.user.findUnique({ where: { id: request.user.id } });

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) return reply.code(400).send({ error: 'Current password is incorrect' });

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: request.user.id },
      data: { passwordHash: newHash },
    });

    return { message: 'Password changed successfully' };
  });
}
