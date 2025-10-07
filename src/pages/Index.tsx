import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IntervieweeChat } from '@/components/IntervieweeChat';
import { InterviewerDashboard } from '@/components/InterviewerDashboard';
import { WelcomeBackModal } from '@/components/WelcomeBackModal';
import { getCurrentCandidate, loadState, saveState } from '@/lib/storage';
import { UserCircle, ClipboardList } from 'lucide-react';

const Index = () => {
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [candidateName, setCandidateName] = useState('');

  useEffect(() => {
    const candidate = getCurrentCandidate();
    if (candidate && candidate.status !== 'completed') {
      setCandidateName(candidate.name);
      setShowWelcomeBack(true);
    }
  }, []);

  const handleContinue = () => {
    setShowWelcomeBack(false);
  };

  const handleStartNew = () => {
    const state = loadState();
    state.currentCandidateId = null;
    saveState(state);
    setShowWelcomeBack(false);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background">
      <WelcomeBackModal
        open={showWelcomeBack}
        candidateName={candidateName}
        onContinue={handleContinue}
        onStartNew={handleStartNew}
      />

      <Tabs defaultValue="interviewee" className="w-full h-screen flex flex-col">
        <TabsList className="w-full rounded-none border-b h-14 bg-card">
          <TabsTrigger
            value="interviewee"
            className="flex-1 h-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground"
          >
            <UserCircle className="w-5 h-5 mr-2" />
            Interviewee
          </TabsTrigger>
          <TabsTrigger
            value="interviewer"
            className="flex-1 h-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground"
          >
            <ClipboardList className="w-5 h-5 mr-2" />
            Interviewer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="interviewee" className="flex-1 m-0">
          <IntervieweeChat />
        </TabsContent>

        <TabsContent value="interviewer" className="flex-1 m-0">
          <InterviewerDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
