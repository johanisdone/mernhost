import mongoose from 'mongoose';
import { STAGES, JOB_TYPES } from '../domain/stages.js';
import { Account, LoginSession } from './Account.js';

const historySchema = new mongoose.Schema({
  status: { type: String, enum: STAGES, required: true },
  changedAt: { type: Date, required: true, default: Date.now }
}, { _id: false });

const applicationSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, immutable: true },
  applicationId: { type: String, required: true, immutable: true },
  companyName: { type: String, required: true, maxlength: 120 },
  companyKey: { type: String, required: true, maxlength: 120 },
  jobRole: { type: String, required: true, maxlength: 120 },
  roleKey: { type: String, required: true, maxlength: 120 },
  jobType: { type: String, enum: JOB_TYPES, required: true },
  appliedDate: { type: String, required: true, immutable: true },
  expectedSalary: { type: Number, default: null, min: 0, max: 1000000000000 },
  notes: { type: String, default: '', maxlength: 3000 },
  followUpDate: { type: String, required: true, immutable: true },
  status: { type: String, enum: STAGES, required: true, default: 'Applied' },
  isActive: { type: Boolean, required: true, default: true },
  statusHistory: { type: [historySchema], required: true }
}, { timestamps: true });

applicationSchema.index({ owner: 1, applicationId: 1 }, { unique: true });
applicationSchema.index({ owner: 1, companyKey: 1, roleKey: 1 }, {
  unique: true,
  partialFilterExpression: { isActive: true },
  name: 'one_active_company_role_per_owner'
});
applicationSchema.index({ owner: 1, status: 1, createdAt: -1 });
applicationSchema.index({ owner: 1, createdAt: -1 });

export const Application = mongoose.model('Application', applicationSchema, 'private_applications');

const counterSchema = new mongoose.Schema({
  _id: { type: String },
  value: { type: Number, required: true, default: 0 }
}, { versionKey: false });
export const CompanyCounter = mongoose.model('CompanyCounter', counterSchema, 'private_company_counters');

export async function prepareIndexes() {
  await Promise.all([Application.init(), CompanyCounter.init(), Account.init(), LoginSession.init()]);
}
