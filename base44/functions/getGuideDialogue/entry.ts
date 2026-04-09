import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { hpPercent, time, level, isNGPlus } = await req.json();

        let prompt = `You are Commander Nova, the tactical AI guide for a space survivor game. 
The player is currently at Level ${level}, surviving for ${time} seconds, with ${hpPercent}% HP remaining.`;
        if (isNGPlus) prompt += " They are in New Game+ mode (very hard).";
        
        prompt += ` Provide a VERY SHORT (1-2 sentences max), punchy, context-sensitive tactical tip or encouraging remark. Return only the dialogue text, no quotes.`;
        
        if (hpPercent < 30) {
            prompt += " They are low on health, tell them to play defensively or look for health pickups.";
        } else if (level < 3) {
            prompt += " They just started, tell them to move around to gather XP gems.";
        } else if (time > 180) {
            prompt += " They have survived for a while, warn them about elites or bosses.";
        } else {
            prompt += " Give a generic encouraging tactical tip.";
        }

        const res = await base44.integrations.Core.InvokeLLM({
            prompt: prompt
        });

        return Response.json({ dialogue: res });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});