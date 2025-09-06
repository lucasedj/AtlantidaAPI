// src/middleware/autenticationMiddleware.js
import passport from './estrategias.js';

export function local(req, res, next) {
  passport.authenticate('local', { session: false }, (erro, user, info) => {
    if (erro?.name === 'InvalidArgumentError') {
      return res.status(400).json({ message: erro.message, code: 'INVALID_ARGUMENT' });
    }
    if (erro) {
      return res.status(500).json({ message: erro.message });
    }
    if (!user) {
      // mensagens vindas da LocalStrategy:
      // { message: 'Usuário não encontrado', code: 'USER_NOT_FOUND' }
      // { message: 'Senha incorreta',       code: 'INVALID_PASSWORD' }
      const msg  = info?.message || 'Credenciais inválidas';
      const code = info?.code || 'INVALID_CREDENTIALS';

      // se preferir 404 p/ USER_NOT_FOUND, troque a linha abaixo por:
      // const status = code === 'USER_NOT_FOUND' ? 404 : 401;
      // return res.status(status).json({ message: msg, code });

      return res.status(401).json({ message: msg, code });
    }

    req.user = user;
    return next();
  })(req, res, next);
}

export function bearer(req, res, next) {
  passport.authenticate('bearer', { session: false }, (erro, user, info) => {
    if (erro?.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token inválido' });
    }
    if (erro?.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado', expiradoEm: erro.expiredAt });
    }
    if (erro) {
      return res.status(500).json({ message: erro.message });
    }
    if (!user) {
      return res.status(401).json({ message: 'Token inválido' });
    }

    req.token = info?.token; // info é opcional
    req.user = user;
    return next();
  })(req, res, next);
}
