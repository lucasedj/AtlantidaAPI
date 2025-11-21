import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import fs from 'fs';
import crypto from "crypto";
import bcryptjs from 'bcryptjs';
import sgMail from '@sendgrid/mail';
import UserRepository from '../repositories/userRepository.js';
import logger from '../utils/logger.js';
import User from '../models/user.js'; 

class UsersService {
  static async encryptPassword(password) {
    logger.info('UsersService.encryptPassword');
    const passwordEncrypted = await bcryptjs.hash(password, 12);
    return passwordEncrypted;
  }

  static async sendPasswordResetEmail(userEmail, newPassword) {
    logger.info('UsersService.sendPasswordResetEmail');
    sgMail.setApiKey(process.env.TOKEN_SENDGRID);

    return new Promise((resolve, reject) => {
      fs.readFile("./src/emails/emailRecoverPassword.html", "utf-8", (err, htmlContent) => {
        if (err) {
          console.error("Erro ao ler o arquivo HTML:", err);
          reject(err);
          return;
        }

        const personalizedHtmlContent = htmlContent.replace('{{newPassword}}', newPassword);
        const msg = {
          to: userEmail,
          from: "atlantidawebservice@gmail.com",
          subject: "Recuperação de Senha",
          text: `Sua nova senha é: ${newPassword}`,
          html: personalizedHtmlContent,
        };

        sgMail
          .send(msg)
          .then(() => {
            logger.info('Password reset email sent');
            resolve();
          })
          .catch((error) => {
            // Log detalhado
            console.error("Erro detalhado ao enviar email:", error.response?.body || error);
            logger.error(`Error sending email: ${error.message}`);
            reject(error);
          });
      });
    });
  }

  static async findUserByToken(id) {
    logger.info('UsersService.findUserByToken');
    return await UserRepository.findById(id);
  }

  static async findUserByEmail(email) {
    logger.info('UsersService.findUserByEmail');
    return await UserRepository.findOne({ email: email });
  }

  static async createUser(userData) {
    logger.info('UsersService.createUser');
    // userData.password = await this.encryptPassword(userData.password);
    return await UserRepository.createUser(userData);
  }

  static async recoverPassword(email) {
    logger.info('UsersService.recoverPassword');

    const user = await UserRepository.findOne({ email });
    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    const newPassword = crypto.randomBytes(5).toString('hex');
    const newPasswordEncrypted = await this.encryptPassword(newPassword);

    // Envia email com logs detalhados
    await this.sendPasswordResetEmail(user.email, newPassword);

    await UserRepository.findByIdAndUpdate(user._id, { password: newPasswordEncrypted });
  }

  static async updatePassword(id, currentPassword, newPassword) {
  logger.info('UsersService.updatePassword');

  if (!currentPassword || !newPassword) {
    throw new Error('Senha atual e nova senha são obrigatórias.');
  }

  // 🔑 Carrega o usuário trazendo o campo password (mesmo com select:false)
  const user = await User.findById(id).select('+password');

  if (!user) {
    throw new Error('Usuário não encontrado.');
  }

  if (!user.password) {
    // proteção extra contra o Illegal arguments
    throw new Error('Senha não encontrada para este usuário.');
  }

  const passwordMatch = await bcryptjs.compare(currentPassword, user.password);
  if (!passwordMatch) {
    logger.info('Error: Senha atual incorreta');
    throw new Error('Senha atual incorreta');
  }

  // 👉 Aqui usamos o hook pre('save') do model para hashear a nova senha
  user.password = newPassword;           // texto puro
  await user.save();                     // pre('save') vai fazer o hash

  logger.info('Success: senha atualizada');
}



  static async updateUser(id, userData) {
    logger.info('UsersService.updateUser');
    delete userData.password;
    return await UserRepository.findByIdAndUpdate(id, userData);
  }

  static async deleteUser(id) {
    logger.info('UsersService.deleteUser');
    return await UserRepository.findByIdAndDelete(id);
  }
}

export default UsersService;
