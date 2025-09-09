// controllers/diveLogsController.js
import DiveLogsService from '../services/diveLogsService.js';
import DivingSpotService from '../services/divingSpotService.js';
import TokenService from '../services/tokenService.js';

function getUserId(req) {
  // se o middleware bearer popular req.user
  const id = req.user?.id || req.user?._id;
  if (id) return String(id);

  // fallback via header (mantendo compatibilidade com seus métodos)
  if (typeof TokenService?.returnUserIdFromHeader === 'function') {
    return TokenService.returnUserIdFromHeader(req.headers.authorization || '');
  }
  if (typeof TokenService?.returnUserIdToToken === 'function') {
    return TokenService.returnUserIdToToken(req.headers.authorization || '');
  }
  return null;
}

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const mapDifficulty = (v) => {
  if (v == null) return undefined;
  if (typeof v === 'number') return v; // já numérico 1..5
  const s = String(v).toLowerCase();
  if (s.includes('pequena')) return 1;
  if (s.includes('média') || s.includes('media')) return 3;
  if (s.includes('grande')) return 5;
  return undefined;
};

/**
 * Resolve APENAS um divingSpotId existente:
 * - body.divingSpotId, OU
 * - pelo nome (place | locationName | spotName) já cadastrado.
 * NÃO cria automaticamente um novo spot.
 */
async function resolveDivingSpotIdFromPlace(body) {
  if (body.divingSpotId) return String(body.divingSpotId);

  const name =
    (body.place && String(body.place).trim()) ||
    (body.locationName && String(body.locationName).trim()) ||
    (body.spotName && String(body.spotName).trim());

  if (!name) return null;

  const spots = await DivingSpotService.findDivingSpotsByName(name);
  if (!Array.isArray(spots) || spots.length === 0) return null;

  const exact = spots.find((s) => (s.name || '').toLowerCase() === name.toLowerCase());
  return String((exact || spots[0])._id);
}

export default class DiveLogsController {
  static async findDiveLogById(req, res) {
    try {
      const foundDiveLog = await DiveLogsService.findDiveLogById(req.params.id);
      if (!foundDiveLog) {
        return res.status(404).json({ message: 'Registro de mergulho não encontrado' });
      }
      return res.status(200).json(foundDiveLog);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  static async findDiveLogsByToken(req, res) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: 'Não autenticado' });

      const diveLogs = await DiveLogsService.findDiveLogsByUserId(userId);
      return res.status(200).json(diveLogs);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  static async findDiveLogsByDateRange(req, res) {
    try {
      const { startDate, endDate } = req.body;
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: 'Não autenticado' });

      const diveLogs = await DiveLogsService.findDiveLogsByDateRange(startDate, endDate, userId);
      return res.status(200).json(diveLogs);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  static async findDiveLogsByTitle(req, res) {
    try {
      const { title } = req.params;
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: 'Não autenticado' });

      const diveLogs = await DiveLogsService.findDiveLogsByTitle(title, userId);
      return res.status(200).json(diveLogs);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  static async findDiveLogsByDate(req, res) {
    try {
      const { date } = req.body;
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: 'Não autenticado' });

      const diveLogs = await DiveLogsService.findDiveLogsByDate(date, userId);
      return res.status(200).json(diveLogs);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  static async findDiveLogsByLocationName(req, res) {
    try {
      const { locationName } = req.params;
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: 'Não autenticado' });

      const diveLogs = await DiveLogsService.findDiveLogsByLocationName(locationName, userId);
      return res.status(200).json(diveLogs);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  static async createDiveLog(req, res) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: 'Não autenticado' });

      const b = req.body || {};

      // nome do local informado (se vier sem id)
      const placeName =
        (b.place && String(b.place).trim()) ||
        (b.locationName && String(b.locationName).trim()) ||
        (b.spotName && String(b.spotName).trim()) ||
        '';

      // valida obrigatórios básicos
      if (!b.title || !b.date || !b.type || b.depth == null || b.bottomTimeInMinutes == null) {
        return res.status(400).json({
          message:
            'Campos obrigatórios: title, divingSpotId (ou place), date, type, depth, bottomTimeInMinutes.',
        });
      }
      // pelo menos um: divingSpotId OU place
      if (!b.divingSpotId && !placeName) {
        return res.status(400).json({ message: 'Informe divingSpotId ou place.' });
      }

      // resolve/garante o divingSpotId (sem criar automaticamente)
      let divingSpotId = b.divingSpotId || null;
      if (!divingSpotId) {
        divingSpotId = await resolveDivingSpotIdFromPlace({ ...b, place: placeName });
      }
      if (!divingSpotId) {
        return res.status(400).json({
          message: `Local "${placeName}" não encontrado. Selecione um ponto existente ou envie o divingSpotId.`,
        });
      }

      // normalizações
      const dateObj = new Date(b.date);
      if (Number.isNaN(dateObj.getTime())) {
        return res.status(400).json({ message: 'Data inválida' });
      }

      const pIni = toNum(b?.cylinder?.initialPressure);
      const pFim = toNum(b?.cylinder?.finalPressure);
      const usedAmount =
        Number.isFinite(pIni) && Number.isFinite(pFim) && pIni >= pFim
          ? pIni - pFim
          : toNum(b?.cylinder?.usedAmount);

      const addEquip = Array.isArray(b.additionalEquipment) ? b.additionalEquipment.slice() : [];
      if (b.extrasOther?.trim()) addEquip.push(b.extrasOther.trim());

      // fotos base64 opcionais: [{ data, contentType }]
      const photos = Array.isArray(b.photos)
        ? b.photos.map((ph) => ({ data: ph?.data, contentType: ph?.contentType }))
        : [];

      const payload = {
        userId,
        title: b.title,
        divingSpotId,
        date: dateObj,
        type: b.type, // 'costa' | 'barco' | 'outros'
        depth: toNum(b.depth),
        bottomTimeInMinutes: toNum(b.bottomTimeInMinutes),

        waterType: b.waterType,
        waterBody: b.waterBody,
        weatherConditions: b.weatherConditions,
        temperature: {
          air: toNum(b.temperature?.air),
          surface: toNum(b.temperature?.surface),
          bottom: toNum(b.temperature?.bottom),
        },
        visibility: b.visibility,
        waves: b.waves,
        current: b.current,
        surge: b.surge,

        suit: b.suit,
        weight: b.weight,
        additionalEquipment: addEquip,

        cylinder: {
          type: b.cylinder?.type,
          size: toNum(b.cylinder?.size),
          gasMixture: b.cylinder?.gasMixture,
          initialPressure: pIni,
          finalPressure: pFim,
          usedAmount: toNum(usedAmount),
        },

        rating: toNum(b.rating),
        difficulty: mapDifficulty(b.difficulty),
        notes: b.notes,
        photos,
      };

      const newDiveLog = await DiveLogsService.createDiveLog(payload);
      return res
        .status(201)
        .set('Location', `/api/diveLogs/${newDiveLog._id}`)
        .json(newDiveLog);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  static async updateDiveLog(req, res) {
    try {
      const b = req.body || {};

      const pIni = toNum(b?.cylinder?.initialPressure);
      const pFim = toNum(b?.cylinder?.finalPressure);
      const usedAmount =
        Number.isFinite(pIni) && Number.isFinite(pFim) && pIni >= pFim
          ? pIni - pFim
          : toNum(b?.cylinder?.usedAmount);

      const patch = {
        ...b,
        ...(b.date ? { date: new Date(b.date) } : {}),
        ...(b.depth != null ? { depth: toNum(b.depth) } : {}),
        ...(b.bottomTimeInMinutes != null
          ? { bottomTimeInMinutes: toNum(b.bottomTimeInMinutes) }
          : {}),
        ...(b.temperature
          ? {
              temperature: {
                air: toNum(b.temperature?.air),
                surface: toNum(b.temperature?.surface),
                bottom: toNum(b.temperature?.bottom),
              },
            }
          : {}),
        ...(b.cylinder
          ? {
              cylinder: {
                type: b.cylinder?.type,
                size: toNum(b.cylinder?.size),
                gasMixture: b.cylinder?.gasMixture,
                initialPressure: pIni,
                finalPressure: pFim,
                usedAmount: toNum(usedAmount),
              },
            }
          : {}),
        ...(b.rating != null ? { rating: toNum(b.rating) } : {}),
        ...(b.difficulty != null ? { difficulty: mapDifficulty(b.difficulty) } : {}),
      };

      const updatedDiveLog = await DiveLogsService.updateDiveLog(
        req.params.id,
        patch
      );
      if (!updatedDiveLog) {
        return res.status(404).json({ message: 'Registro de mergulho não encontrado' });
      }

      return res.status(200).json(updatedDiveLog);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  static async deleteDiveLog(req, res) {
    try {
      await DiveLogsService.deleteDiveLog(req.params.id);
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
}
