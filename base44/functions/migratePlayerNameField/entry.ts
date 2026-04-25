import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Fetch all PlayerSave records
    const allSaves = await base44.asServiceRole.entities.PlayerSave.list('', 1000);
    
    let updated = 0;
    
    // Migrate pilotName → player_name for each record
    for (const save of allSaves) {
      const saveData = save.save_data || {};
      
      // If pilotName exists and player_name doesn't, migrate it
      if (saveData.pilotName && !saveData.player_name) {
        saveData.player_name = saveData.pilotName;
        delete saveData.pilotName;
        
        await base44.asServiceRole.entities.PlayerSave.update(save.id, {
          save_data: saveData
        });
        updated++;
      }
    }

    return Response.json({ 
      success: true, 
      message: `Migrated ${updated} PlayerSave records`,
      totalProcessed: allSaves.length
    });
  } catch (error) {
    console.error('[migratePlayerNameField]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});