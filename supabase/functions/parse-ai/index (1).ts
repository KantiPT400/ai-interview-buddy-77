import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Parsing resume...');
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('No file provided');
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Simple PDF text extraction (basic implementation)
    const text = new TextDecoder().decode(uint8Array);
    
    // Extract information using regex patterns
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
    const phoneRegex = /(\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}/g;
    
    const emails = text.match(emailRegex);
    const phones = text.match(phoneRegex);
    
    // Try to find name (usually at the top of resume)
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    let name = '';
    
    // Look for a name in first few lines (simple heuristic)
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();
      // Skip lines with emails or phones
      if (!line.match(emailRegex) && !line.match(phoneRegex) && line.length > 5 && line.length < 50) {
        // Check if it looks like a name (2-4 words, capitalized)
        const words = line.split(/\s+/);
        if (words.length >= 2 && words.length <= 4 && words.every(w => /^[A-Z]/.test(w))) {
          name = line;
          break;
        }
      }
    }

    console.log('Extracted info:', { name, email: emails?.[0], phone: phones?.[0] });

    return new Response(
      JSON.stringify({
        name: name || '',
        email: emails?.[0] || '',
        phone: phones?.[0] || '',
        fullText: text.substring(0, 5000), // First 5000 chars for context
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error parsing resume:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
