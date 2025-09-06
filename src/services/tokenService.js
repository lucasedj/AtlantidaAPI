// services/tokenService.js
import 'dotenv/config';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.CHAVE_JWT || 'dev_secret';
const EXPIRES_IN = '720h'; // 30 dias

class TokenService {
  /**
   * Cria token **sem** consultar o banco.
   * Passe sempre o id (e opcionalmente email) do usuário já autenticado (req.user).
   */
  static createTokenJWT({ id, email }) {
    if (!id) throw new Error('ID do usuário ausente para assinar o token');
    const payload = { sub: id, email }; // ← padrão JWT
    return jwt.sign(payload, JWT_SECRET, { expiresIn: EXPIRES_IN });
  }

  static createNewTokenJWTFromHeader(authorizationHeader) {
    const userId = this.returnUserIdFromHeader(authorizationHeader);
    return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: EXPIRES_IN });
  }

  /** Aceita "Bearer x.y.z" ou "x.y.z" */
  static returnUserIdFromHeader(authorizationHeader = '') {
    const maybeToken = authorizationHeader?.startsWith('Bearer ')
      ? authorizationHeader.slice(7)
      : authorizationHeader;

    return this.returnUserIdFromToken(maybeToken);
  }

  static returnUserIdFromToken(token = '') {
    if (!token) throw new Error('Token ausente');
    const decoded = jwt.verify(token, JWT_SECRET);

    // suporta sub (recomendado) e seu legado { id }
    const userId = decoded.sub || decoded.id || decoded._id;
    if (!userId) throw new Error('ID do usuário não encontrado no token');
    return userId;
  }
}

export default TokenService;
