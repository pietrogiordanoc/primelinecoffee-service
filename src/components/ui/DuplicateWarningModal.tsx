import { AlertTriangle, Building2, MapPin, Phone, User, ArrowRight } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import type { DuplicateCheckResult } from '@/types';

interface DuplicateWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  duplicates: DuplicateCheckResult[];
  onCreateNew: () => void;
  onCreateBranch: (parentCompanyId: string) => void;
  onUseExisting: (company: DuplicateCheckResult) => void;
  customerName: string;
}

export default function DuplicateWarningModal({
  isOpen,
  onClose,
  duplicates,
  onCreateNew,
  onCreateBranch,
  onUseExisting,
  customerName,
}: DuplicateWarningModalProps) {
  if (!duplicates || duplicates.length === 0) return null;

  const topMatch = duplicates[0];
  const isHighConfidence = topMatch.similarity_score >= 0.9 || 
                          topMatch.match_reason.includes('Exact name');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="⚠️ Possible Duplicate Detected" size="lg">
      <div className="space-y-4">
        {/* Warning Message */}
        <div className={`p-4 rounded-lg border-2 ${
          isHighConfidence 
            ? 'bg-red-50 border-red-200' 
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              isHighConfidence ? 'text-red-600' : 'text-yellow-600'
            }`} />
            <div>
              <h3 className={`font-semibold text-sm mb-1 ${
                isHighConfidence ? 'text-red-900' : 'text-yellow-900'
              }`}>
                {isHighConfidence 
                  ? 'High Probability Duplicate' 
                  : 'Similar Customer Found'}
              </h3>
              <p className={`text-sm ${
                isHighConfidence ? 'text-red-700' : 'text-yellow-700'
              }`}>
                We found {duplicates.length} similar customer{duplicates.length > 1 ? 's' : ''} in the database.
                Please review before creating "{customerName}".
              </p>
            </div>
          </div>
        </div>

        {/* Existing Customers List */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">Matching Customers:</h4>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {duplicates.map((duplicate) => (
              <div
                key={duplicate.id}
                className="border border-gray-200 rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="text-sm font-semibold text-gray-900 truncate">
                          {duplicate.name}
                        </h5>
                        <span className="text-xs font-mono font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {duplicate.customer_code}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        {duplicate.address && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">
                              {duplicate.address}
                              {duplicate.city && `, ${duplicate.city}`}
                              {duplicate.state && `, ${duplicate.state}`}
                            </span>
                          </div>
                        )}
                        {duplicate.contact_phone && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <Phone className="w-3 h-3 flex-shrink-0" />
                            <span>{duplicate.contact_phone}</span>
                          </div>
                        )}
                        {duplicate.contact_name && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <User className="w-3 h-3 flex-shrink-0" />
                            <span>{duplicate.contact_name}</span>
                          </div>
                        )}
                      </div>

                      {/* Match Reason Badge */}
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          duplicate.similarity_score >= 0.9
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {duplicate.match_reason} ({Math.round(duplicate.similarity_score * 100)}% match)
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Use Existing Button */}
                  <Button
                    onClick={() => onUseExisting(duplicate)}
                    variant="secondary"
                    size="sm"
                    className="whitespace-nowrap"
                  >
                    Use This
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t pt-4 space-y-2">
          <p className="text-sm text-gray-700 font-medium mb-3">
            What would you like to do?
          </p>
          
          <div className="grid grid-cols-1 gap-2">
            {/* Create New Customer */}
            <button
              onClick={onCreateNew}
              className="flex items-center justify-between p-3 border-2 border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-sm text-gray-900">Create New Customer</div>
                  <div className="text-xs text-gray-500">This is a completely different customer</div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600" />
            </button>

            {/* Create Branch */}
            <button
              onClick={() => onCreateBranch(topMatch.id)}
              className="flex items-center justify-between p-3 border-2 border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-sm text-gray-900">Create as New Branch/Location</div>
                  <div className="text-xs text-gray-500">
                    Add as branch of "{topMatch.name}"
                  </div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" />
            </button>
          </div>

          {/* Cancel */}
          <div className="pt-2">
            <Button onClick={onClose} variant="secondary" className="w-full">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
