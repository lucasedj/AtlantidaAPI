// scripts/fixAuth.js
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import connectToDB from '../src/config/dbConnect.js';
import User from '../src/models/user.js';

// util para regex ^email$ escapado
function esc(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}

(async () => {
  try {
    await connectToDB();

    const rawEmail = (process.argv[2] || '').trim();
    const newPlain = process.argv[3] || '123456';

    if (!rawEmail) {
      console.error('Uso: node scripts/fixAuth.js <email> [novaSenha]');
      process.exit(1);
    }

    const lower = rawEmail.toLowerCase();
    const rx = new RegExp('^' + esc(rawEmail) + '$', 'i');

    // Ache TODOS os documentos com esse email (qualquer caixa)
    const docs = await User.find({ email: rx }).select('+password');
    console.log('Encontrados (case-insensitive):', docs.length);

    // Se não houver, cria um
    if (docs.length === 0) {
      const hashed = await bcrypt.hash(newPlain, 10);
      const created = await User.create({
        firstName: 'Admin',
        lastName: 'Teste',
        email: lower,
        password: hashed,
        birthDate: new Date('1990-01-01'),
        cep: '00000-000',
        country: 'BR',
        state: 'SP',
        city: 'Araras',
        district: 'Centro',
        street: 'Rua A',
        number: '100',
        complement: 'Sala 1',
      });
      console.log('✅ Criado:', { id: created._id.toString(), email: created.email });
      await mongoose.disconnect(); process.exit(0);
    }

    // Se houver 1+, mantenha o primeiro e apague duplicatas
    const keep = docs[0];
    const toDelete = docs.slice(1).map(d => d._id);
    if (toDelete.length) {
      await User.deleteMany({ _id: { $in: toDelete } });
      console.log('🧹 Removidas duplicatas:', toDelete.length);
    }

    // Ajusta email para minúsculas e garante senha hasheada que bate
    const hashed = await bcrypt.hash(newPlain, 10);
    await User.updateOne({ _id: keep._id }, { $set: { email: lower, password: hashed } });
    console.log('🔧 Atualizado:', { id: keep._id.toString(), email: lower });

    // Sanidade: verifique se o compare bate
    const check = await User.findById(keep._id).select('+password');
    const ok = await bcrypt.compare(newPlain, check.password);
    console.log('compareOk:', ok);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Fix falhou:', err.message);
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
  }
})();
