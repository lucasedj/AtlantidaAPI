// scripts/seedUser.js
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import connectToDB from '../src/config/dbConnect.js';
import User from '../src/models/user.js';

(async () => {
  try {
    await connectToDB();

    const email = (process.argv[2] || 'admin@teste.com').toLowerCase();
    const plain = process.argv[3] || '123456';

    // remove anterior (idempotente)
    await User.deleteOne({ email });

    // 1) cria com senha em TEXTO PURO (se houver pre('save'), ele vai hashear)
    const created = await User.create({
      firstName: 'Admin',
      lastName: 'Teste',
      email,
      password: plain, // <- texto puro
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

    // 2) busca a senha salva
    let doc = await User.findById(created._id).select('+password');
    let stored = doc?.password || '';
    const looksHashed = /^\$2[aby]?\$/.test(stored);

    // 3) se NÃO estiver hasheado, hash agora (cobre o caso sem pre('save'))
    if (!looksHashed) {
      const hashed = await bcrypt.hash(plain, 10);
      await User.updateOne({ _id: created._id }, { $set: { password: hashed } });
      doc = await User.findById(created._id).select('+password');
      stored = doc?.password || '';
    }

    // 4) valida que a comparação funciona
    const compareOk = stored ? await bcrypt.compare(plain, stored) : false;

    console.log('✅ Usuário seed criado:', {
      id: created._id.toString(),
      email,
      compareOk,
      hashPreview: stored?.slice(0, 7) || null, // só pra ver que é hash ($2a/$2b)
    });
  } catch (err) {
    console.error('❌ Seed falhou:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
