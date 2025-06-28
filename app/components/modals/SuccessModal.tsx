import type { FC } from "react";

import { Check } from "lucide-react";

interface SuccessModalProps {
  message: string;
  onClose: () => void;
  actionLabel?: string;
}

const SuccessModal: FC<SuccessModalProps> = ({
  message,
  onClose,
  actionLabel = "Close",
}) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-md w-96">
        <div className="flex justify-center">
          <Check className="rounded-full bg-[#334746] text-[white] h-10 w-10 p-2" />
        </div>
        <p className="text-lg font-bold text-center mb-4">{message}</p>
        <p className="text-center">
          Your account has been created successfully! You can now log in to
          access your account.
        </p>
        <div className="flex justify-center mt-3">
          <button
            onClick={onClose}
            className="bg-[#334746] hover:bg-[#334746] text-white font-bold py-2 px-4 rounded w-full"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;
