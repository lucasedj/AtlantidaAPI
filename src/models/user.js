import mongoose from "mongoose";
import { validateEmail, validateBirthDate } from "./validation.js";

const { Schema } = mongoose;

const userSchema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true, validate: validateEmail },
  password: { type: String, required: true },
  birthDate: { type: Date, required: true, validate: validateBirthDate },

  profilePicture: { data: Buffer, contentType: String },
  createdDate: { type: Date, default: Date.now },
  cep: { type: String, required: true },
  country: { type: String, required: true },
  state: { type: String, required: true },
  city: { type: String, required: true },
  district: { type: String, required: true },
  street: { type: String, required: true },
  number: { type: String, required: true },
  complement: { type: String, required: true },
  profilePicture: { data: Buffer, contentType: String },
  createdDate: { type: Date, default: Date.now },
});

userSchema.set('toJSON', {
  transform: function(doc, ret, options) {
     delete ret.password;
     return ret;
  }
});

const User = mongoose.model('users', userSchema);

export default User;
