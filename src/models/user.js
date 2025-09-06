// src/models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { validateEmail, validateBirthDate } from "./validation.js";

const { Schema } = mongoose;

const userSchema = new Schema({
  firstName:  { type: String, required: true },
  lastName:   { type: String, required: true },
  email:      { type: String, required: true, unique: true, validate: validateEmail, index: true },
  password:   { type: String, required: true, select: false },
  birthDate:  { type: Date, required: true, validate: validateBirthDate },

  cep:        { type: String, required: true },
  country:    { type: String, required: true },
  state:      { type: String, required: true },
  city:       { type: String, required: true },
  district:   { type: String, required: true },
  street:     { type: String, required: true },
  number:     { type: String, required: true },
  complement: { type: String, required: true },

  profilePicture: { data: Buffer, contentType: String },
  createdDate:    { type: Date, default: Date.now },
}, { timestamps: true });

userSchema.pre('save', async function(next){
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.set('toJSON', {
  transform: (_doc, ret) => { delete ret.password; return ret; }
});

// 👇 evita OverwriteModelError:
const User = mongoose.models.users || mongoose.model('users', userSchema);
export default User;
