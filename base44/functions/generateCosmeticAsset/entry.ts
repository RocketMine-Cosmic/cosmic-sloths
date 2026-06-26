// Admin-only authoring tool: generates a cosmetic asset image via Hugging Face
// Inference, uploads it to file storage, persists a CosmeticAsset row (so it
// shows up in the Cosmetic Studio gallery for review), returns the static URL.
//
// Designed for OFFLINE authoring only — called by an admin from the cosmetic
// studio, NOT by app users at runtime. Players see the static URL, never HF.
//
// Body: {
//   model_id, prompt, negative_prompt?, width?, height?,
//   cosmetic_id?, category?, rarity?, attempt?
// }
// Returns: { url, model_id, prompt, asset_id }

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALLOWED_MODELS = [
    'black-forest-labs/FLUX.1-schnell',
    'black-forest-labs/FLUX.1-dev',
    'stabilityai/sdxl-turbo',
    'stabilityai/stable-diffusion-xl-base-1.0',
    'playgroundai/playground-v2.5-1024px-aesthetic',
];

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

        const {
            model_id,
            prompt,
            negative_prompt,
            width,
            height,
            cosmetic_id,
            category,
            rarity,
            attempt,
        } = await req.json();

        if (!model_id || !prompt) {
            return Response.json({ error: 'model_id and prompt are required' }, { status: 400 });
        }
        if (!ALLOWED_MODELS.includes(model_id)) {
            return Response.json({ error: `Model ${model_id} not in allow-list` }, { status: 400 });
        }

        const { accessToken } = await base44.asServiceRole.connectors.getConnection('hugging_face');

        const hfRes = await fetch(`https://router.huggingface.co/hf-inference/models/${model_id}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'image/png',
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    ...(negative_prompt ? { negative_prompt } : {}),
                    ...(width ? { width } : {}),
                    ...(height ? { height } : {}),
                },
            }),
        });

        if (!hfRes.ok) {
            const text = await hfRes.text();
            return Response.json({ error: `HF Inference ${hfRes.status}: ${text.slice(0, 500)}` }, { status: 502 });
        }

        const imageBlob = await hfRes.blob();
        const file = new File([imageBlob], `cosmetic-${Date.now()}.png`, { type: 'image/png' });

        const uploadRes = await base44.asServiceRole.integrations.Core.UploadFile({ file });
        const url = uploadRes?.file_url || uploadRes?.data?.file_url;
        if (!url) return Response.json({ error: 'UploadFile returned no file_url', uploadRes }, { status: 500 });

        // Persist a CosmeticAsset row so the studio gallery can pick it up.
        // cosmetic_id is required by the schema — fall back to a generated id if the
        // caller didn't provide one (e.g. ad-hoc test generations) so we never lose
        // the asset to a missing-field error.
        let asset_id = null;
        try {
            const row = await base44.asServiceRole.entities.CosmeticAsset.create({
                cosmetic_id: cosmetic_id || `adhoc_${Date.now()}`,
                category: category || 'other',
                rarity: rarity || 'standard',
                url,
                model_id,
                prompt,
                negative_prompt: negative_prompt || '',
                width: width || null,
                height: height || null,
                status: 'pending_review',
                attempt: attempt || 1,
                generated_by: user.email || user.wallet_address || '',
            });
            asset_id = row?.id || null;
        } catch (persistErr) {
            // Don't fail the request if the row write fails — the file is already
            // uploaded and the URL is still useful. Log and continue.
            console.error('[generateCosmeticAsset] CosmeticAsset.create failed:', persistErr?.message);
        }

        return Response.json({ url, model_id, prompt, asset_id });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});