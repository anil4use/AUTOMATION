import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRepository } from './auth.repository';
import { RegisterInput, LoginInput } from './auth.types';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/app.error';

export class AuthService {
  static async register(input: RegisterInput) {
    const existing = await AuthRepository.findByEmail(input.email);
    if (existing) throw new AppError('Email already registered', 400);

    const slug = (input.orgName || `${input.name}'s Org`).toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString().slice(-4);
    const org = await AuthRepository.createOrganization({
      name: input.orgName || `${input.name}'s Org`,
      slug,
      plan: 'free',
    });

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await AuthRepository.createUser({
      email: input.email,
      passwordHash,
      name: input.name,
      organizationId: org._id,
      role: 'admin',
    });

    const payload = { userId: user._id.toString(), organizationId: org._id.toString(), role: user.role, email: user.email };
    const token = jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as any });

    return {
      user: { id: user._id.toString(), email: user.email, name: user.name, organizationId: org._id.toString(), role: user.role },
      token,
    };
  }

  static async login(input: LoginInput) {
    const user = await AuthRepository.findByEmail(input.email);
    if (!user) throw new AppError('Invalid credentials', 401);

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) throw new AppError('Invalid credentials', 401);

    const payload = { userId: user._id.toString(), organizationId: user.organizationId.toString(), role: user.role, email: user.email };
    const token = jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as any });

    return {
      user: { id: user._id.toString(), email: user.email, name: user.name, organizationId: user.organizationId.toString(), role: user.role },
      token,
    };
  }
}
