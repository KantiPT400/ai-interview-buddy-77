import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Send, Upload, Clock, AlertCircle } from 'lucide-react';

import { Candidate, ChatMessage } from '@/types/interview';
import { getCurrentCandidate, updateCandidate, addCandidate } from '@/lib/storage';
import { api } from "@/integrations/supabase/client";

const difficultyLevels = ["Easy", "Easy", "Medium", "Medium", "Hard", "Hard"];

export const IntervieweeChat = () => {
  const { toast } = useToast();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const existingCandidate = getCurrentCandidate();
    if (existingCandidate && existingCandidate.status !== 'completed') {
      setCandidate(existingCandidate);
    } else {
      initializeNewCandidate();
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [candidate?.chatHistory]);

  const initializeNewCandidate = () => {
    const newCandidate: Candidate = {
      id: `candidate_${Date.now()}`,
      name: '',
      email: '',
      phone: '',
      score: 0,
      status: 'collecting-info',
      chatHistory: [
        {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: 'Welcome! To begin the interview, please upload your resume (PDF format required).',
          timestamp: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalQuestions: 5,
      currentQuestion: 0,
    };
    addCandidate(newCandidate);
    setCandidate(newCandidate);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    if (uploadedFile.type !== 'application/pdf') {
      toast({
        title: 'Invalid File',
        description: 'Please upload a PDF file.',
        variant: 'destructive',
      });
      return;
    }

    setFile(uploadedFile);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      // Changed: Use api.post instead of supabase.functions.invoke
      const res = await api.post("/parse", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = res.data;

      const newMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `Resume uploaded successfully! I found:\nName: ${data.name || 'Not found'}\nEmail: ${data.email || 'Not found'}\nPhone: ${data.phone || 'Not found'}\n\n${
          !data.name || !data.email || !data.phone
            ? 'Please provide the missing information before we continue.'
            : "Great! Let's begin the interview. I'll ask you 5 questions. Are you ready?"
        }`,
        timestamp: new Date().toISOString(),
      };

      const updatedCandidate = {
        ...candidate!,
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        resumeText: data.fullText || '',
        chatHistory: [...candidate!.chatHistory, newMessage],
        status: (!data.name || !data.email || !data.phone) ? 'collecting-info' as const : 'in-progress' as const,
      };

      updateCandidate(candidate!.id, updatedCandidate);
      setCandidate(updatedCandidate);
    } catch (error) {
      console.error("Error parsing resume:", error);
      toast({
        title: 'Upload Failed',
        description: 'Could not process resume. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !candidate || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    const updatedHistory = [...candidate.chatHistory, userMessage];
    updateCandidate(candidate.id, { chatHistory: updatedHistory });
    setCandidate({ ...candidate, chatHistory: updatedHistory });
    setMessage('');
    setIsLoading(true);

    try {
      const res = await api.post("/ai/generate", {
        candidateId: candidate.id,
        message: message,
        chatHistory: updatedHistory,
        candidateInfo: {
          name: candidate.name,
          email: candidate.email,
          phone: candidate.phone,
        },
        status: candidate.status,
        currentQuestion: candidate.currentQuestion,
      });

      const data = res.data;

      const aiMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
      };

      const finalHistory = [...updatedHistory, aiMessage];
      const updates: Partial<Candidate> = {
        chatHistory: finalHistory,
        ...(data.score && { score: data.score }),
        ...(data.status && { status: data.status }),
        ...(data.currentQuestion && { currentQuestion: data.currentQuestion }),
        ...(data.summary && { aiSummary: data.summary }),
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email }),
        ...(data.phone && { phone: data.phone }),
      };

      if (data.status === 'completed') {
        updates.completedAt = new Date().toISOString();
      }

      updateCandidate(candidate.id, updates);
      setCandidate({ ...candidate, ...updates });
    } catch (error) {
      console.error('AI error:', error);
      toast({
        title: 'Error',
        description: 'Failed to get response. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextQuestion = async () => {
    const difficulty = difficultyLevels[questionIndex];
    setIsLoading(true);

    try {
      const res = await api.post("/ai/generate", { difficulty, qIndex: questionIndex });
      const botMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: "assistant",
        content: res.data.text,
        timestamp: new Date().toISOString(),
      };
      updateCandidate(candidate!.id, {
        chatHistory: [...candidate!.chatHistory, botMessage],
      });
      setCandidate({
        ...candidate!,
        chatHistory: [...candidate!.chatHistory, botMessage],
      });
      setQuestionIndex(questionIndex + 1);
    } catch (error) {
      console.error('Error fetching next question:', error);
      toast({
        title: 'Error',
        description: 'Failed to load next question. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!candidate) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="bg-gradient-to-r from-primary to-accent p-6 text-primary-foreground">
        <h2 className="text-2xl font-bold mb-2">AI Interview Assistant</h2>
        <div className="flex items-center gap-4 text-sm opacity-90">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Question {candidate.currentQuestion} of {candidate.totalQuestions}</span>
          </div>
          {candidate.status === 'in-progress' && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span>Interview in progress</span>
            </div>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 p-6" ref={scrollRef}>
        <div className="space-y-4 max-w-3xl mx-auto">
          {candidate.chatHistory.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <Card
                className={`max-w-[80%] p-4 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <p className="text-xs opacity-70 mt-2">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </p>
              </Card>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <Card className="max-w-[80%] p-4 bg-card">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce delay-100" />
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce delay-200" />
                </div>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t bg-card p-4">
        <div className="max-w-3xl mx-auto space-y-3">
          {candidate.status === 'collecting-info' && !candidate.resumeText && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <AlertCircle className="w-5 h-5 text-accent" />
              <p className="text-sm">Please upload your resume to begin</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="ml-auto"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Resume
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type your message..."
              disabled={isLoading || candidate.status === 'completed'}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={isLoading || !message.trim() || candidate.status === 'completed'}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          {candidate.status === 'in-progress' && candidate.currentQuestion < candidate.totalQuestions && (
            <div className="flex justify-end">
              <Button
                onClick={handleNextQuestion}
                disabled={isLoading}
                className="mt-2"
              >
                Next Question
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
