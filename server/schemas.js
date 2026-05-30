import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[A-Za-z0-9_-]+$/),
  password: z.string().min(8).max(200),
  language: z.enum(['en', 'ka']).default('en'),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

export const SchoolCreateSchema = z.object({
  type: z.enum(['beneficiary', 'volunteer']),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  region: z.string().max(120).optional(),
  city: z.string().max(120).optional(),
  address: z.string().max(300).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  photo_url: z.string().url().optional(),
  contact_email: z.string().email().optional(),
  opening_hours: z.string().max(200).optional(),
});

export const SchoolApproveSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  approval_note: z.string().max(500).optional(),
});

export const BookRequestSchema = z.object({
  school_id: z.string().uuid(),
  request_type: z.enum(['title', 'author', 'genre']),
  title: z.string().max(200).optional(),
  author: z.string().max(200).optional(),
  genre: z.string().max(120).optional(),
  quantity_needed: z.number().int().positive().max(10_000),
  notes: z.string().max(1000).optional(),
});

export const DonationCreateSchema = z.object({
  // A donation must always target a beneficiary school — otherwise it can never
  // reach a recipient and breaks tracking, notifications, and admin display.
  beneficiary_school_id: z.string().uuid(),
  volunteer_school_id: z.string().uuid().optional(),
  delivery_method: z.enum(['self', 'courier']),
  donor_address: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  items: z.array(z.object({
    matched_request_id: z.string().uuid().optional(),
    book_title: z.string().max(200).optional(),
    book_author: z.string().max(200).optional(),
    book_genre: z.string().max(120).optional(),
    quantity: z.number().int().positive().max(100),
  })).min(1).max(50),
});

export const DonationStatusUpdateSchema = z.object({
  status: z.enum(['pending', 'at_volunteer', 'in_transit', 'delivered', 'cancelled']),
  note: z.string().max(500).optional(),
  courier_tracking_id: z.string().max(120).optional(),
});

export const MonetaryDonationSchema = z.object({
  amount_minor: z.number().int().positive().max(10_000_000),
  currency: z.enum(['GEL', 'USD', 'EUR']).default('GEL'),
  donor_email_for_receipt: z.string().email().optional(),
  donor_name_for_receipt: z.string().max(200).optional(),
});

export const SearchSchema = z.object({
  q: z.string().min(1).max(120),
  type: z.enum(['all', 'beneficiary', 'volunteer', 'book']).default('all'),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

// Code-based reset: { email, token (6–10 digit OTP — Supabase default is 8), new_password }
export const ResetPasswordSchema = z.object({
  email: z.string().email(),
  token: z.string().regex(/^[0-9]{6,10}$/),
  new_password: z.string().min(8).max(200),
});

// Signup email verification (6–10 digit OTP)
export const VerifyOtpSchema = z.object({
  email: z.string().email(),
  token: z.string().regex(/^[0-9]{6,10}$/),
});

// Resend signup OTP (same payload as forgot-password)
export const ResendOtpSchema = z.object({
  email: z.string().email(),
});

export const SignedUploadSchema = z.object({
  bucket: z.enum(['school-photos', 'avatars', 'book-covers']),
  filename: z.string().min(1).max(200).regex(/^[a-zA-Z0-9._\-\/]+$/),
});

export const SiteContentUpsertSchema = z.object({
  key: z.string().min(1).max(120).regex(/^[a-z0-9_.\-]+$/i),
  value_en: z.string().max(20000).nullable().optional(),
  value_ka: z.string().max(20000).nullable().optional(),
});

export const AdminDonationsListSchema = z.object({
  status: z.enum(['pending', 'at_volunteer', 'in_transit', 'delivered', 'cancelled']).optional(),
  school_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export const NearestVolunteerSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  limit: z.coerce.number().int().min(1).max(20).default(5),
});
