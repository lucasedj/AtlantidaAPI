// services/tokenService.js
import 'dotenv/config';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.CHAVE_JWT || 'dev_secret';
const EXPIRES_IN = '720h'; // 30 dias

class TokenService {
  /**
   * Cria token SEM consultar o banco.
   * Passe sempre { id, email } do usuário já autenticado (ex.: req.user).
   * Compatível com await (retorna string).
   */
  static createTokenJWT({ id, email }) {
    if (!id) throw new Error('ID do usuário ausente para assinar o token');
    const payload = { sub: id, email }; // padrão JWT
    return jwt.sign(payload, JWT_SECRET, { expiresIn: EXPIRES_IN });
  }

  /**
   * NOVO: cria novo token a partir do header Authorization.
   * Ex.: createNewTokenJWTFromHeader(req.headers.authorization)
   */
  static createNewTokenJWTFromHeader(authorizationHeader) {
    const userId = this.returnUserIdFromHeader(authorizationHeader);
    return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: EXPIRES_IN });
  }

  /**
   * Aceita "Bearer x.y.z" ou "x.y.z" (somente token).
   * Retorna o userId (sub || id || _id) do payload.
   */
  static returnUserIdFromHeader(authorizationHeader = '') {
    const maybeToken = authorizationHeader?.startsWith('Bearer ')
      ? authorizationHeader.slice(7)
      : authorizationHeader;

    return this.returnUserIdFromToken(maybeToken);
  }

  /**
   * Extrai o userId diretamente de um token JWT.
   */
  static returnUserIdFromToken(token = '') {
    if (!token) throw new Error('Token ausente');
    const decoded = jwt.verify(token, JWT_SECRET);

    // suporta sub (recomendado) e legado { id/_id }
    const userId = decoded.sub || decoded.id || decoded._id;
    if (!userId) throw new Error('ID do usuário não encontrado no token');
    return userId;
  }

  /* ============================
   *  ALIASES DE COMPATIBILIDADE
   *  ============================ */

  /**
   * ALIAS compatível com código legado:
   * - TokenService.returnUserIdToToken(headerOuToken)
   * Pode receber "Bearer x.y.z" OU "x.y.z".
   */
  static returnUserIdToToken(headerOrToken = '') {
    // Se vier um header "Bearer ...", delega para FromHeader; senão, trata como token puro
    return headerOrToken?.startsWith?.('Bearer ')
      ? this.returnUserIdFromHeader(headerOrToken)
      : this.returnUserIdFromToken(headerOrToken);
  }

  /**
   * ALIAS compatível:
   * - TokenService.createNewTokenJWT(req)  (legado)
   * - TokenService.createNewTokenJWT(authorizationHeader)
   */
  static createNewTokenJWT(input) {
    // se for req com headers.authorization
    const header =
      typeof input === 'string'
        ? input
        : input?.headers?.authorization;

    if (!header) throw new Error('Authorization ausente para gerar novo token');

    return this.createNewTokenJWTFromHeader(header);
  }
}

export default TokenService;
