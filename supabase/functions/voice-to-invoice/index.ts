// Needful Thingz - Voice to Invoice AI Pipeline
// This runs securely on Supabase servers, keeping your API keys completely hidden.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // 1. Handle CORS (This prevents the "Failed to fetch" browser error you saw earlier)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Unlock your API Key from the secure Supabase Vault
    const openAiKey = Deno.env.get('OPENAI_API_KEY');

    // 3. Receive the audio file sent from your frontend website
    const formData = await req.formData();
    const audioFile = formData.get('file');

    if (!audioFile) {
      return new Response(JSON.stringify({ error: 'No audio file provided' }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 4. Send the audio to OpenAI Whisper for transcription
    const whisperFormData = new FormData();
    whisperFormData.append('file', audioFile);
    whisperFormData.append('model', 'whisper-1');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`
      },
      body: whisperFormData
    });

    const whisperData = await whisperResponse.json();
    const transcript = whisperData.text;

    // 5. Send the raw text to GPT-4o with strict Property Management formatting rules
    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { type: "json_object" }, // Forces the AI to return code, not conversation
        messages: [
          {
            role: "system",
            content: `You are an expert property management and HVAC invoicing AI. The user will give you a raw voice transcription from a field technician. 
            Extract the data and return a JSON object with the following exact keys:
            - "property_unit": (string) the apartment or unit number.
            - "work_summary": (string) a professional, 1-sentence summary of the work done.
            - "parts_used": (array of strings) list of parts.
            - "labor_hours": (number) estimated hours.
            - "total_estimated_cost": (number) calculate a rough cost assuming labor is $100/hr.
            DO NOT include any other text, only the JSON object.`
          },
          { role: "user", content: transcript }
        ]
      })
    });

    const gptData = await gptResponse.json();
    const invoiceJson = JSON.parse(gptData.choices[0].message.content);

    // 6. Return the perfectly formatted JSON back to your frontend
    return new Response(
      JSON.stringify({ success: true, transcript: transcript, invoice: invoiceJson }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // If anything fails, return the error safely
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});