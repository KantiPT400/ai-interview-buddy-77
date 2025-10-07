import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { loadState } from '@/lib/storage';
import { Candidate } from '@/types/interview';
import { User, Mail, Phone, Award, Calendar, MessageSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const InterviewerDashboard = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  useEffect(() => {
    loadCandidates();
    const interval = setInterval(loadCandidates, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadCandidates = () => {
    const state = loadState();
    const sorted = [...state.candidates].sort((a, b) => b.score - a.score);
    setCandidates(sorted);
  };

  const getStatusBadge = (status: Candidate['status']) => {
    const variants = {
      'collecting-info': { label: 'Collecting Info', className: 'bg-muted' },
      'in-progress': { label: 'In Progress', className: 'bg-accent' },
      paused: { label: 'Paused', className: 'bg-muted-foreground' },
      completed: { label: 'Completed', className: 'bg-secondary' },
    };
    const config = variants[status];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-secondary';
    if (score >= 60) return 'text-accent';
    return 'text-muted-foreground';
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-gradient-to-r from-primary to-accent p-6 text-primary-foreground">
        <h2 className="text-2xl font-bold mb-2">Interviewer Dashboard</h2>
        <p className="text-sm opacity-90">{candidates.length} candidates tracked</p>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          {candidates.length === 0 ? (
            <Card className="p-12 text-center">
              <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Candidates Yet</h3>
              <p className="text-muted-foreground">
                Candidates will appear here once they start their interview
              </p>
            </Card>
          ) : (
            candidates.map((candidate) => (
              <Card
                key={candidate.id}
                className="p-6 hover:shadow-elevated transition-all cursor-pointer"
                onClick={() => setSelectedCandidate(candidate)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold">
                        {candidate.name || 'Anonymous Candidate'}
                      </h3>
                      {getStatusBadge(candidate.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {candidate.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          <span>{candidate.email}</span>
                        </div>
                      )}
                      {candidate.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          <span>{candidate.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(candidate.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MessageSquare className="w-4 h-4" />
                        <span>{candidate.chatHistory.length} messages</span>
                      </div>
                    </div>

                    {candidate.aiSummary && (
                      <p className="text-sm text-muted-foreground border-l-2 border-accent pl-3">
                        {candidate.aiSummary}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-center gap-2 ml-6">
                    <Award className={`w-8 h-8 ${getScoreColor(candidate.score)}`} />
                    <span className={`text-3xl font-bold ${getScoreColor(candidate.score)}`}>
                      {candidate.score}
                    </span>
                    <span className="text-xs text-muted-foreground">Score</span>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      <Dialog open={!!selectedCandidate} onOpenChange={() => setSelectedCandidate(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedCandidate?.name || 'Anonymous Candidate'} - Interview Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedCandidate && (
            <ScrollArea className="h-[60vh]">
              <div className="space-y-6">
                <Card className="p-4 bg-muted">
                  <h4 className="font-semibold mb-3">Candidate Information</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <p className="font-medium">{selectedCandidate.email || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Phone:</span>
                      <p className="font-medium">{selectedCandidate.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <p className="font-medium">{selectedCandidate.status}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Score:</span>
                      <p className={`font-bold text-lg ${getScoreColor(selectedCandidate.score)}`}>
                        {selectedCandidate.score}
                      </p>
                    </div>
                  </div>
                  {selectedCandidate.aiSummary && (
                    <div className="mt-4">
                      <span className="text-muted-foreground">AI Summary:</span>
                      <p className="font-medium mt-1">{selectedCandidate.aiSummary}</p>
                    </div>
                  )}
                </Card>

                <div>
                  <h4 className="font-semibold mb-3">Chat History</h4>
                  <div className="space-y-3">
                    {selectedCandidate.chatHistory.map((msg) => (
                      <Card
                        key={msg.id}
                        className={`p-3 ${
                          msg.role === 'user' ? 'bg-primary/10 ml-8' : 'bg-card mr-8'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-sm">
                            {msg.role === 'user' ? 'Candidate' : 'AI Interviewer'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
