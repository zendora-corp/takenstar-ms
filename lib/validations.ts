import { z } from 'zod';

export const phoneRegex = /^[6-9]\d{9}$/;

export const registrationSchema = z.object({
  examYearId: z.number().int(), // ✅ Changed
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  gender: z.enum(['Male', 'Female', 'Other']),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').nullable().optional(),
  class: z.number().int().min(6).max(12),
  medium: z.enum(['Assamese', 'English']),
  districtId: z.number().int(), // ✅ Changed
  schoolId: z.number().int(),   // ✅ Changed
  schoolRollNo: z.string().min(1, 'School roll number is required').max(50),
  address: z.string().min(5, 'Address is required').max(500),
  studentMobile: z.string().regex(phoneRegex, 'Invalid Indian mobile number'),
  guardianMobile: z.string().regex(phoneRegex, 'Invalid Indian mobile number').nullable().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  paymentOption: z.enum(['Online', 'Offline']),
  transactionId: z.string().optional(),
  offlineReceiptNo: z.string().optional(),
}).refine((data) => {
  if (data.paymentOption === 'Online' && !data.transactionId) {
    return false;
  }
  return true;
}, {
  message: 'Transaction ID is required for online payments',
  path: ['transactionId'],
});

export const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email'),
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(200),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000),
});

export const districtSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const schoolSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  districtId: z.coerce.number().int().positive(),
  address: z.string().max(500).optional(),
  medium: z.enum(['Assamese', 'English', 'Both']).optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const examYearSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  registrationOpenDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  registrationCloseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  resultDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  status: z.enum(['active', 'archived']).default('active'),
});

export const paymentUpdateSchema = z.object({
  paymentStatus: z.enum(['Pending', 'Verified', 'Rejected']),
  transactionId: z.string().optional(),
  offlineReceiptNo: z.string().optional(),
  paymentNotes: z.string().max(500).optional(),
});

export const resultSchema = z.object({
  registrationId: z.number().int().positive('Invalid registration ID'),
  gk: z.number().int().min(0).max(100),
  science: z.number().int().min(0).max(100),
  mathematics: z.number().int().min(0).max(100),
  logicalReasoning: z.number().int().min(0).max(100),
  currentAffairs: z.number().int().min(0).max(100),
});

export const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'manager']),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});
