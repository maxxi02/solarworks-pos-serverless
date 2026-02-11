'use client';

import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning';
}

export default function AlertModal({ isOpen, onClose, title, message, type }: AlertModalProps) {
  if (!isOpen) return null;

  const icon = {
    success: <CheckCircle className="h-6 w-6 text-green-500" />,
    error: <XCircle className="h-6 w-6 text-red-500" />,
    warning: <AlertTriangle className="h-6 w-6 text-yellow-500" />
  };

  const bgColor = {
    success: 'bg-green-50',
    error: 'bg-red-50',
    warning: 'bg-yellow-50'
  };

  const borderColor = {
    success: 'border-green-200',
    error: 'border-red-200',
    warning: 'border-yellow-200'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`rounded-lg p-6 max-w-md w-full mx-4 ${bgColor[type]} border ${borderColor[type]}`}>
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            {icon[type]}
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-gray-700 mb-6">{message}</p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}