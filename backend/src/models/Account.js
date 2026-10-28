import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  name: { type: String, required: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false }
}, { timestamps: true });

const sessionSchema = new mongoose.Schema({
  _id: { type: String },
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
}, { timestamps: true, versionKey: false });

export const Account = mongoose.model('Account', accountSchema, 'private_accounts');
export const LoginSession = mongoose.model('LoginSession', sessionSchema, 'private_sessions');
export const publicAccount = account => ({ id: account._id.toString(), name: account.name, email: account.email });
