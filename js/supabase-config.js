/* =====================================================
   OA Événementiel — Supabase Config
   1. Créez un projet sur https://supabase.com
   2. Dashboard → Settings → API
   3. Remplacez les valeurs ci-dessous
   ===================================================== */

const SUPABASE_URL  = 'https://hdzjdlckxrcwthxhirmp.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkempkbGNreHJjd3RoeGhpcm1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjQzNDEsImV4cCI6MjA5NTMwMDM0MX0.6VTs8Uq-921omQrbxKdEzY0Zs2F-K87ZA7lMRq3DIEk';

const { createClient } = window.supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);
