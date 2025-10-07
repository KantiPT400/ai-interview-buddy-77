import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

interface WelcomeBackModalProps {
  open: boolean;
  candidateName: string;
  onContinue: () => void;
  onStartNew: () => void;
}

export const WelcomeBackModal = ({
  open,
  candidateName,
  onContinue,
  onStartNew,
}: WelcomeBackModalProps) => {
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-6 h-6 text-primary" />
            <DialogTitle>Welcome Back!</DialogTitle>
          </div>
          <DialogDescription>
            {candidateName
              ? `Hi ${candidateName}! You have an interview in progress.`
              : 'You have an interview in progress.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Would you like to continue where you left off, or start a new interview?
          </p>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={onStartNew} className="flex-1">
            Start New
          </Button>
          <Button onClick={onContinue} className="flex-1">
            Continue Interview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
