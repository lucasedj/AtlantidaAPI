// src/middleware/estrategias.js
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as BearerStrategy } from 'passport-http-bearer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ⚠️ Use SEMPRE o mesmo caminho/grafia do model (padronize para "User.js")
import User from '../models/user.js';

import 'dotenv/config';
const JWT_SECRET = process.env.CHAVE_JWT || 'dev_secret';
const AUTH_DEBUG = process.env.AUTH_DEBUG === '1';

/**
 * LOCAL: email + password (via body)
 * - Busca com .select('+password')
 * - Compara com bcrypt
 * - Mensagens específicas:
 *    - Usuário não encontrado
 *    - Senha incorreta
 */
passport.use(new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password',
    session: false,
  },
  async (email, password, done) => {
    try {
      const normalizedEmail = String(email || '').trim().toLowerCase();
      const plainPassword   = String(password || '');

      if (!normalizedEmail || !plainPassword) {
        return done({ name: 'InvalidArgumentError', message: 'Email e senha são obrigatórios' });
      }

      const user = await User.findOne({ email: normalizedEmail }).select('+password');

      const hasUser = !!user;
      const hasPwd  = !!(user && typeof user.password === 'string' && user.password.length);
      let compareOk = null;

      if (!hasUser) {
        if (AUTH_DEBUG) console.log('LOCAL DEBUG =>', { normalizedEmail, hasUser, hasPwd, compareOk });
        // ← mensagem específica
        return done(null, false, { message: 'Usuário não encontrado', code: 'USER_NOT_FOUND' });
      }

      if (hasPwd) {
        compareOk = await bcrypt.compare(plainPassword, user.password);
      }

      if (AUTH_DEBUG) {
        console.log('LOCAL DEBUG =>', { normalizedEmail, hasUser, hasPwd, compareOk });
      }

      if (!hasPwd || !compareOk) {
        // ← mensagem específica
        return done(null, false, { message: 'Senha incorreta', code: 'INVALID_PASSWORD' });
      }

      const safeUser = user.toJSON();
      delete safeUser.password;

      return done(null, safeUser);
    } catch (err) {
      if (AUTH_DEBUG) console.error('LOCAL ERROR', err);
      return done(err);
    }
  }
));

/**
 * BEARER: Authorization: Bearer <token>
 * - verify NÃO usa expiresIn (isso é do sign)
 * - aceita sub || id || _id no payload
 * - envia { token } no "info" (seu middleware usa req.token)
 */
passport.use(new BearerStrategy(
  async (token, done) => {
    try {
      if (!token) return done(null, false);

      const payload = jwt.verify(token, JWT_SECRET);
      const userId = payload.sub || payload.id || payload._id;

      if (AUTH_DEBUG) {
        console.log('BEARER DEBUG =>', { hasToken: !!token, payload, userId });
      }

      if (!userId) return done(null, false);

      const user = await User.findById(userId);
      if (!user) return done(null, false);

      const safeUser = user.toJSON();
      delete safeUser.password;

      return done(null, safeUser, { token });
    } catch (err) {
      if (AUTH_DEBUG) console.error('BEARER ERROR', err);
      return done(err);
    }
  }
));

export default passport;
