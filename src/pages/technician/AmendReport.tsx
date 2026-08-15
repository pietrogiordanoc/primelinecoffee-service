import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useConfirm } from '@/contexts/ConfirmContext';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { AlertTriangle, Edit, XCircle, FileText } from 'lucide-react';
import type { ServiceReport } from '@/types';
import { useTranslation } from 'react-i18next';

export default function AmendReport() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuthStore();
  const { alert } = useConfirm();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [report, setReport] = useState<ServiceReport | null>(null);
  const [amendmentType, setAmendmentType] = useState<'update' | 'void'>('update');
  const [reason, setReason] = useState('');

  useEffect(() => {
    loadReport();
  }, [reportId]);

  async function loadReport() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('service_reports')
        .select(`
          *,
          companies(name, contact_name, contact_email),
          dynamic_forms(name),
          technicians!inner(user_id)
        `)
        .eq('id', reportId)
        .single();

      if (error) throw error;

      // Verify the technician owns this report
      if (data.technicians.user_id !== userProfile?.id) {
        await alert({
          title: 'Access Denied',
          message: 'You can only amend your own reports.',
        });
        navigate('../history');
        return;
      }

      // Verify report is in submitted status
      if (data.status !== 'submitted') {
        await alert({
          title: 'Invalid Report',
          message: 'You can only amend submitted reports. Drafts can be edited directly.',
        });
        navigate('../history');
        return;
      }

      setReport(data);
    } catch (error) {
      console.error('Error loading report:', error);
      await alert({
        title: 'Error',
        message: 'Failed to load report. Please try again.',
      });
      navigate('../history');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitAmendment() {
    if (!reason.trim()) {
      await alert({
        title: 'Reason Required',
        message: 'Please provide a reason for this amendment.',
      });
      return;
    }

    if (!report || !reportId) return;

    try {
      setSubmitting(true);

      // Create the amendment record
      const { error: amendmentError } = await supabase
        .from('report_amendments')
        .insert({
          original_report_id: reportId,
          amendment_type: amendmentType,
          reason: reason.trim(),
          amended_by: userProfile?.id,
          amended_data: null, // For now, we're not storing changed data
        });

      if (amendmentError) throw amendmentError;

      // Update the report status and increment amendment_count
      const newStatus = amendmentType === 'void' ? 'voided' : 'submitted';
      const { error: updateError } = await supabase
        .from('service_reports')
        .update({
          status: newStatus,
          amendment_count: (report.amendment_count || 0) + 1,
        })
        .eq('id', reportId);

      if (updateError) throw updateError;

      const successMessage = amendmentType === 'void'
        ? 'Report has been voided successfully.'
        : 'Amendment has been recorded successfully.';

      await alert({
        title: 'Success',
        message: successMessage,
      });

      navigate('../history');
    } catch (error) {
      console.error('Error creating amendment:', error);
      await alert({
        title: 'Error',
        message: 'Failed to create amendment. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!report) {
    return (
      <Card>
        <div className="p-8 text-center text-red-600">
          Report not found
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Amend Report</h1>
        <p className="text-sm text-gray-600 mt-1">
          Create an amendment to modify or void this service report
        </p>
      </div>

      {/* Report Info */}
      <Card className="mb-4">
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-gray-700">Report Code:</span>
            <span className="text-gray-900">{report.report_code || 'N/A'}</span>
          </div>
          <div className="text-sm">
            <span className="font-semibold text-gray-700">Company:</span>
            <span className="text-gray-900 ml-2">{report.companies?.name}</span>
          </div>
          <div className="text-sm">
            <span className="font-semibold text-gray-700">Form:</span>
            <span className="text-gray-900 ml-2">{report.dynamic_forms?.name}</span>
          </div>
          <div className="text-sm">
            <span className="font-semibold text-gray-700">Submitted:</span>
            <span className="text-gray-900 ml-2">
              {report.submitted_at ? new Date(report.submitted_at).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          {(report.amendment_count || 0) > 0 && (
            <div className="text-sm">
              <span className="font-semibold text-gray-700">Previous Amendments:</span>
              <span className="text-amber-600 ml-2">{report.amendment_count}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Amendment Type Selection */}
      <Card className="mb-4">
        <div className="p-4">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Amendment Type
          </label>
          
          <div className="space-y-3">
            {/* Update Option */}
            <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition">
              <input
                type="radio"
                name="amendmentType"
                value="update"
                checked={amendmentType === 'update'}
                onChange={(e) => setAmendmentType(e.target.value as 'update')}
                className="mt-0.5 flex-shrink-0"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Edit className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-gray-900">Update Information</span>
                </div>
                <p className="text-xs text-gray-600">
                  Record a correction or update to the report information. The original report remains visible with the amendment noted.
                </p>
              </div>
            </label>

            {/* Void Option */}
            <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-red-50 transition border-red-200">
              <input
                type="radio"
                name="amendmentType"
                value="void"
                checked={amendmentType === 'void'}
                onChange={(e) => setAmendmentType(e.target.value as 'void')}
                className="mt-0.5 flex-shrink-0"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="font-medium text-gray-900 text-red-900">Void Report</span>
                </div>
                <p className="text-xs text-red-700">
                  Mark this report as invalid or cancelled. The report will be marked as voided but remain in the system for audit purposes.
                </p>
              </div>
            </label>
          </div>
        </div>
      </Card>

      {/* Reason Input */}
      <Card className="mb-4">
        <div className="p-4">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Reason for Amendment <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-600 mb-3">
            Provide a clear explanation for why this amendment is necessary. This will be part of the permanent record.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={5}
            placeholder={
              amendmentType === 'void'
                ? 'Example: Report was created in error, wrong company selected...'
                : 'Example: Correcting equipment serial number, updating service details...'
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          />
          <div className="text-right text-xs text-gray-500 mt-1">
            {reason.length} characters
          </div>
        </div>
      </Card>

      {/* Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-amber-900 mb-1">Important</p>
          <p className="text-amber-800">
            {amendmentType === 'void'
              ? 'Voiding a report is permanent and cannot be undone. The report will be marked as invalid.'
              : 'This amendment will be permanently recorded and visible to all users who can view this report.'}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={() => navigate('../history')}
          disabled={submitting}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          variant={amendmentType === 'void' ? 'danger' : 'primary'}
          onClick={handleSubmitAmendment}
          disabled={submitting || !reason.trim()}
          className="flex-1"
        >
          {submitting ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Processing...
            </>
          ) : amendmentType === 'void' ? (
            <>
              <XCircle className="w-4 h-4 mr-2" />
              Void Report
            </>
          ) : (
            <>
              <Edit className="w-4 h-4 mr-2" />
              Submit Amendment
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
