import CommentsService from "../services/commentsService.js";
import TokenService from "../services/tokenService.js";
import DivingSpot from "../models/divingSpot.js"; // 👈 importa o modelo do ponto

// Helper: converte nível textual em número
const mapLevelToNumber = (val) => {
  if (!val) return null;
  const v = String(val).toUpperCase();
  if (v === "BAIXO") return 1;
  if (v === "MODERADO") return 2;
  if (v === "ALTO") return 3;
  return null;
};

// Helper: recalcula as estatísticas do ponto de mergulho
async function recalcSpotStats(divingSpotId) {
  if (!divingSpotId) return;

  // Busca todos os comentários desse ponto
  const comments = await CommentsService.findCommentsByDivingSpotId(divingSpotId);
  const numberOfComments = comments.length;

  let sumRating = 0;
  let sumDifficulty = 0;
  let countDifficulty = 0;
  const visibilityCounts = {};

  for (const c of comments) {
    // média de rating
    if (typeof c.rating === "number") {
      sumRating += c.rating;
    }

    // média numérica de dificuldade
    const diffNum = mapLevelToNumber(c.difficultyLevel);
    if (diffNum != null) {
      sumDifficulty += diffNum;
      countDifficulty++;
    }

    // visibilidade mais frequente
    if (c.visibility) {
      const vis = String(c.visibility).toUpperCase();
      visibilityCounts[vis] = (visibilityCounts[vis] || 0) + 1;
    }
  }

  const averageRating = numberOfComments ? sumRating / numberOfComments : 0;
  const averageDifficulty = countDifficulty ? sumDifficulty / countDifficulty : 0;

  // pega a visibilidade mais frequente
  let bestVisibility = undefined;
  let bestCount = 0;
  for (const [vis, count] of Object.entries(visibilityCounts)) {
    if (count > bestCount) {
      bestCount = count;
      bestVisibility = vis;
    }
  }

  // Atualiza o DivingSpot
  await DivingSpot.findByIdAndUpdate(
    divingSpotId,
    {
      $set: {
        averageRating,
        averageDifficulty,
        visibility: bestVisibility,
        numberOfComments,
      },
    },
    { new: true }
  );
}

class CommentController {
  static async findCommentById(req, res) {
    try {
      const comment = await CommentsService.findCommentById(req.params.id);
      if (!comment) {
        return res.status(404).json({ message: "Comentário não encontrado" });
      }

      return res.status(200).json(comment);
    } catch (error) {
      return res.status(500).send({ message: error.message });
    }
  }

  static async findCommentsByDivingSpotId(req, res) {
    try {
      const comments = await CommentsService.findCommentsByDivingSpotId(
        req.params.divingSpotId
      );
      return res.status(200).send(comments);
    } catch (error) {
      return res.status(500).send({ message: error.message });
    }
  }

  static async findCommentsByUserToken(req, res) {
    try {
      const userId = await TokenService.returnUserIdToToken(
        req.headers.authorization
      );
      const comments = await CommentsService.findCommentsByUserId(userId);

      return res.status(200).send(comments);
    } catch (error) {
      return res.status(500).send({ message: error.message });
    }
  }

  static async createComment(req, res) {
    try {
      const userId = await TokenService.returnUserIdToToken(
        req.headers.authorization
      );

      // Garantimos quais campos vão para o create:
      const {
        rating,
        comment,
        photos,
        divingSpotId,
        visibility,
        difficultyLevel,
      } = req.body;

      const payload = {
        rating,
        comment,
        photos,
        divingSpotId,
        visibility,
        difficultyLevel,
        userId,
      };

      const newComment = await CommentsService.createComment(payload);

      // Recalcula as estatísticas do ponto
      try {
        await recalcSpotStats(newComment.divingSpotId);
      } catch (e) {
        console.error("Erro ao recalcular estatísticas do ponto:", e);
      }

      return res
        .status(201)
        .set("Location", `/api/comments/${newComment._id}`)
        .json(newComment);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  static async updateComment(req, res) {
    try {
      const userId = await TokenService.returnUserIdToToken(
        req.headers.authorization
      );
      const comment = await CommentsService.findCommentById(req.params.id);

      if (!comment) {
        return res
          .status(404)
          .json({ message: "Comentário não encontrado" });
      }

      if (comment.userId.toString() !== userId.toString()) {
        return res.status(403).json({
          message: "Usuário não autorizado a atualizar este comentário",
        });
      }

      const updatedComment = await CommentsService.updateComment(
        req.params.id,
        req.body
      );

      // Recalcula stats usando o ponto desse comentário
      try {
        await recalcSpotStats(comment.divingSpotId);
      } catch (e) {
        console.error("Erro ao recalcular estatísticas do ponto:", e);
      }

      return res.status(200).json(updatedComment);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  static async deleteComment(req, res) {
    try {
      const userId = await TokenService.returnUserIdToToken(
        req.headers.authorization
      );
      const comment = await CommentsService.findCommentById(req.params.id);

      if (!comment) {
        return res
          .status(404)
          .json({ message: "Comentário não encontrado" });
      }

      if (comment.userId.toString() !== userId.toString()) {
        return res.status(403).json({
          message: "Usuário não autorizado a deletar este comentário",
        });
      }

      await CommentsService.deleteComment(req.params.id);

      // Recalcula stats desse ponto depois da exclusão
      try {
        await recalcSpotStats(comment.divingSpotId);
      } catch (e) {
        console.error("Erro ao recalcular estatísticas do ponto:", e);
      }

      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
}

export default CommentController;
