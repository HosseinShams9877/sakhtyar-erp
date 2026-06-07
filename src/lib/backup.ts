
// توابع جایگزین خالی برای جلوگیری از خطا
export async function GET() {
  return new Response(JSON.stringify({ error: 'Backup API disabled on Cloudflare' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST() {
  return new Response(JSON.stringify({ error: 'Backup API disabled on Cloudflare' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function DELETE() {
  return new Response(JSON.stringify({ error: 'Backup API disabled on Cloudflare' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}