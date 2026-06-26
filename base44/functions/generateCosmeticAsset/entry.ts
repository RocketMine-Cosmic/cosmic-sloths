// Admin-only authoring tool: generates a cosmetic asset image via Hugging Face
// Inference, uploads it to file storage, returns the static URL.
//
// Designed for OFFLINE authoring only — called by an admin from the cosmetic
// studio, NOT by app users at runtime. Players see the static URL, never HF.
//
// Body: { model_id, prompt, negative_prompt?, width?, height? }
// Returns: { url, model_id, prompt }

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

        const { model_id, prompt, negative_prompt, width, height } = await req.json();
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

        return Response.json({ url, model_id, prompt });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});