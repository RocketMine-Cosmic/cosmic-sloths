// vipChestProbe — THROWAWAY PROBE (21 Oct 2026). Delete once the real receiver is built.
//
// Question it answers: can a Base44 function receive Omen's VIP chest webhook body
// BYTE-FOR-BYTE, so an HMAC-SHA256 over `${timestamp}.${rawBody}` can be verified?
//
// It touches NO game data and NO entities. It uses a THROWAWAY test secret (below),
// never the real Omen signing secret. It always replies 200 with what it saw.

const PROBE_SECRET = 'whsec_probe_only_not_a_real_secret_0000000000000000000000000000';

async function hmacHex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(text: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const raw = await req.text();
    const ts = req.headers.get('x-omenx-webhook-timestamp') || '';
    const sigHeader = req.headers.get('x-omenx-webhook-signature') || '';
    const given = sigHeader.startsWith('sha256=') ? sigHeader.slice(7) : sigHeader;
    const expected = await hmacHex(PROBE_SECRET, `${ts}.${raw}`);
    const skew = ts ? Math.abs(Math.floor(Date.now() / 1000) - Number(ts)) : null;

    return Response.json({
      probe: 'vipChestProbe',
      method: req.method,
      contentType: req.headers.get('content-type'),
      rawLength: raw.length,
      rawSha256: await sha256Hex(raw),
      timestampHeader: ts || null,
      skewSeconds: skew,
      signatureValid: !!given && given === expected,
      headerNames: [...req.headers.keys()].sort(),
    });
  } catch (e) {
    return Response.json({ probe: 'vipChestProbe', error: String(e) }, { status: 200 });
  }
});
