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
    const { message, chatHistory, candidateInfo, status, currentQuestion } = await req.json();
    
    console.log('Interview AI request:', { status, currentQuestion, candidateInfo });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    let systemPrompt = '';
    let nextQuestion = currentQuestion;
    let newStatus = status;
    let score = 0;
    let summary = '';

    // Handle different interview stages
    if (status === 'collecting-info') {
      systemPrompt = `You are an AI interview assistant. The candidate has uploaded their resume but some information is missing.
Current info: Name: ${candidateInfo.name || 'missing'}, Email: ${candidateInfo.email || 'missing'}, Phone: ${candidateInfo.phone || 'missing'}

Your task is to collect any missing information in a friendly, conversational way. Once you have all the information (name, email, phone), confirm it with the candidate and let them know you're ready to start the interview.

If the user provides missing information, extract it from their message and respond with confirmation.
Format your response naturally and be encouraging.`;

      // Check if user is providing missing info
      const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/);
      const phoneMatch = message.match(/(\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}/);
      
      const updates: any = {};
      if (emailMatch && !candidateInfo.email) updates.email = emailMatch[0];
      if (phoneMatch && !candidateInfo.phone) updates.phone = phoneMatch[0];
      
      // Try to extract name if it's in a simple format
      if (!candidateInfo.name) {
        const nameMatch = message.match(/(?:my name is |i'm |i am )([A-Z][a-z]+ [A-Z][a-z]+)/i);
        if (nameMatch) updates.name = nameMatch[1];
      }

      // Check if we have everything now
      const hasAllInfo = (updates.name || candidateInfo.name) && 
                        (updates.email || candidateInfo.email) && 
                        (updates.phone || candidateInfo.phone);
      
      if (hasAllInfo && (message.toLowerCase().includes('yes') || message.toLowerCase().includes('ready') || message.toLowerCase().includes('start'))) {
        newStatus = 'in-progress';
        nextQuestion = 1;
        systemPrompt += '\n\nThe candidate is ready. Generate the first interview question. Make it relevant to their experience and engaging.';
      }

      return await generateResponse(systemPrompt, chatHistory, message, newStatus, nextQuestion, score, summary, updates);
    }

    if (status === 'in-progress') {
      if (currentQuestion === 0) {
        // First question
        systemPrompt = `You are conducting a professional interview. Generate an engaging first question that assesses the candidate's background and motivation. Be specific and thoughtful.`;
        nextQuestion = 1;
      } else if (currentQuestion < 5) {
        // Evaluate previous answer and ask next question
        systemPrompt = `You are an AI interviewer. The candidate just answered question ${currentQuestion}. 
        
1. Evaluate their answer (score 0-20 points based on clarity, relevance, depth)
2. Provide brief feedback
3. Ask the next question (question ${currentQuestion + 1} of 5)

Make questions progressively more challenging. Focus on: problem-solving, technical skills, communication, and cultural fit.

Format your response as:
[Score: X/20]
[Feedback on their answer]
[Next question]`;
        nextQuestion = currentQuestion + 1;
      } else {
        // Final evaluation
        systemPrompt = `You are completing the interview. The candidate just answered the final question.

1. Evaluate their last answer (score 0-20 points)
2. Calculate a total score out of 100 (estimate based on the overall conversation quality)
3. Provide a comprehensive summary of their performance
4. Thank them for their time

Format your response as:
[Final Score: X/100]
[Comprehensive Summary]
[Closing remarks]`;
        newStatus = 'completed';
        nextQuestion = 5;
      }

      const result = await generateResponse(systemPrompt, chatHistory, message, newStatus, nextQuestion, score, summary, {});
      
      // Extract score from response if present
      const scoreMatch = result.response.match(/\[(?:Final )?Score: (\d+)(?:\/(?:20|100))?\]/);
      if (scoreMatch) {
        score = parseInt(scoreMatch[1]);
        if (currentQuestion < 5) {
          // Convert 0-20 to cumulative score
          score = Math.round((currentQuestion / 5) * 100);
        }
      }

      // Extract summary if completing
      if (newStatus === 'completed') {
        const summaryMatch = result.response.match(/\[Comprehensive Summary\]([\s\S]+?)\[Closing/);
        if (summaryMatch) {
          summary = summaryMatch[1].trim();
        }
      }

      return new Response(
        JSON.stringify({
          ...result,
          score: score || 0,
          summary: summary || '',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return await generateResponse(systemPrompt, chatHistory, message, newStatus, nextQuestion, score, summary, {});

  } catch (error) {
    console.error('Interview AI error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateResponse(
  systemPrompt: string,
  chatHistory: any[],
  message: string,
  status: string,
  currentQuestion: number,
  score: number,
  summary: string,
  updates: any
) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatHistory.slice(-10).map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        })),
        { role: 'user', content: message },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('AI API error:', error);
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const aiResponse = data.choices[0].message.content;

  console.log('AI response generated:', { status, currentQuestion });

  return {
    response: aiResponse,
    status,
    currentQuestion,
    score,
    summary,
    ...updates,
  };
}
