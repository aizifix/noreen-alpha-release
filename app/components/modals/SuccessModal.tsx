import type { FC } from "react";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SuccessModalProps {
  message: string;
  onClose: () => void;
  actionLabel?: string;
  isOpen?: boolean;
}

const SuccessModal: FC<SuccessModalProps> = ({
  message,
  onClose,
  actionLabel = "Close",
  isOpen = true,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <Check className="rounded-full bg-brand-500 text-white h-10 w-10 p-2" />
          </div>
          <DialogTitle className="text-lg font-bold text-center">
            {message}
          </DialogTitle>
          <DialogDescription className="text-center">
            Your account has been created successfully! You can now log in to
            access your account.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            onClick={onClose}
            className="bg-brand-500 hover:bg-brand-600 text-white font-bold w-full"
          >
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SuccessModal;
