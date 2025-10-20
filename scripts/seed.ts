// scripts/seed.ts
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../lib/supabase';

type Id = string | number;

const ADMIN_EMAIL = 'admin@ttse.local';
const ADMIN_PASSWORD = 'Admin@12345';

async function ensureAdmin() {
  console.log('Creating default admin user...');
  const { data: existing, error: findErr } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', ADMIN_EMAIL)
    .maybeSingle();

  if (findErr) console.warn('Admin lookup warning:', findErr.message);

  if (!existing) {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const { error: insertErr } = await supabaseAdmin
      .from('users')
      .insert({
        name: 'Admin User',
        email: ADMIN_EMAIL,
        password_hash: passwordHash,
        role: 'admin',
      });

    if (insertErr) throw new Error(`Failed to create admin: ${insertErr.message}`);
    console.log(`✓ Admin user created: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  } else {
    console.log('✓ Admin user already exists');
  }
}

async function ensureDistrict(name: string): Promise<Id> {
  console.log(`Creating district: ${name}...`);

  const { data, error } = await supabaseAdmin
    .from('districts')
    .upsert({ name }, { onConflict: 'name' as any }) // as any to quiet older type defs
    .select('id, name')
    .single();

  if (error || !data) throw new Error(`Failed to ensure district: ${error?.message ?? 'unknown error'}`);

  console.log(`✓ District ensured: ${data.name}`);
  return data.id as Id;
}

async function ensureSchool(name: string, districtId: Id) {
  console.log(`Creating school: ${name}...`);

  const { data: existing, error: findErr } = await supabaseAdmin
    .from('schools')
    .select('id')
    .eq('name', name)
    .eq('district_id', districtId)
    .maybeSingle();

  if (findErr) console.warn('School lookup warning:', findErr.message);

  if (!existing) {
    const { error: insertErr } = await supabaseAdmin
      .from('schools')
      .insert({
        name,
        district_id: districtId,
        // If your table DOESN'T have these columns, delete them:
        address: 'Sivasagar, Assam',
        medium: 'Both',
        status: 'active',
      } as any);

    if (insertErr) throw new Error(`Failed to create school: ${insertErr.message}`);
    console.log(`✓ School "${name}" created`);
  } else {
    console.log(`✓ School "${name}" already exists`);
  }
}

async function ensureExamYear(year: number) {
  console.log(`Creating exam year ${year}...`);

  const { data: existing, error: findErr } = await supabaseAdmin
    .from('exam_years')
    .select('id')
    .eq('year', year)
    .maybeSingle();

  if (findErr) console.warn('Exam year lookup warning:', findErr.message);

  if (!existing) {
    const { error: insertErr } = await supabaseAdmin
      .from('exam_years')
      .upsert(
        {
          year,
          registration_open_date: '2025-10-01',
          registration_close_date: '2025-10-28',
          exam_date: '2025-11-02',
          result_date: '2025-11-16',
          status: 'active',
        } as any,
        { onConflict: 'year' as any }
      );

    if (insertErr) throw new Error(`Failed to create exam year: ${insertErr.message}`);

    console.log('✓ Exam Year 2025 created');
    console.log('  - Registration: Oct 1 - Oct 28, 2025');
    console.log('  - Exam Date: Nov 2, 2025');
    console.log('  - Result Date: Nov 16, 2025');
  } else {
    console.log(`✓ Exam Year ${year} already exists`);
  }
}

async function seed() {
  try {
    console.log('Starting seed process...');
    await ensureAdmin();

    const districtId = await ensureDistrict('Sivasagar');
    await ensureSchool('Takenstar Partner School', districtId);

    await ensureExamYear(2025);

    console.log('\nSeed completed successfully! 🎉');
    console.log('\nLogin credentials:');
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
