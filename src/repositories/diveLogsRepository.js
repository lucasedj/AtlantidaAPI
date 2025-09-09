// repositories/diveLogsRepository.js
import DiveLog from '../models/diveLog.js';

const POP = { path: 'divingSpotId', select: 'name waterBody location' };

class DiveLogsRepository {
  static async findById(id) {
    return DiveLog.findById(id).populate(POP).lean();
  }

  static async findByUserId(userId) {
    return DiveLog.find({ userId })
      .sort({ date: -1, _id: -1 })
      .populate(POP)
      .lean();
  }

  static async findByDivingSpotId(divingSpotId) {
    return DiveLog.find({ divingSpotId })
      .sort({ date: -1, _id: -1 })
      .populate(POP)
      .lean();
  }

  static async findByDateRange(startDate, endDate, userId) {
    const q = { userId };
    if (startDate || endDate) {
      q.date = {};
      if (startDate) q.date.$gte = new Date(startDate);
      if (endDate) {
        // inclui o fim do dia de endDate
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        q.date.$lt = end;
      }
    }

    return DiveLog.find(q)
      .sort({ date: -1, _id: -1 })
      .populate(POP)
      .lean();
  }

  static async findByTitle(title, userId) {
    const query = {
      userId,
      title: { $regex: title, $options: 'i' },
    };
    return DiveLog.find(query)
      .sort({ date: -1, _id: -1 })
      .populate(POP)
      .lean();
  }

  static async findByDate(date, userId) {
    const d0 = new Date(date);
    const d1 = new Date(d0);
    d1.setDate(d1.getDate() + 1);

    return DiveLog.find({
      userId,
      date: { $gte: d0, $lt: d1 },
    })
      .sort({ date: -1, _id: -1 })
      .populate(POP)
      .lean();
  }

  static async findByDivingSpotIdsAndUserId(divingSpotIds, userId) {
    return DiveLog.find({
      userId,
      divingSpotId: { $in: divingSpotIds },
    })
      .sort({ date: -1, _id: -1 })
      .populate(POP)
      .lean();
  }

  static async create(data) {
    const doc = await DiveLog.create(data);
    // retorna já populado
    return DiveLog.findById(doc._id).populate(POP).lean();
  }

  static async updateById(id, update) {
    return DiveLog.findByIdAndUpdate(id, { $set: update }, { new: true })
      .populate(POP)
      .lean();
  }

  static async deleteById(id) {
    return DiveLog.findByIdAndDelete(id);
  }
}

export default DiveLogsRepository;
