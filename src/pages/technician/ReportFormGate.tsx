import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import FillReport from './FillReport';
import FillReportCF105, { CF105_FORM_ID } from './FillReportCF105';

/**
 * Dispatcher that routes to the correct fill form based on the form_id.
 * If formId is in the route params, use it directly.
 * If reportId is in the route params (edit mode), look up its form_id first.
 */
export default function ReportFormGate() {
  const { formId, reportId } = useParams<{ formId?: string; reportId?: string }>();
  const [resolvedFormId, setResolvedFormId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function resolveFormId() {
      setLoading(true);

      try {
        if (formId) {
          // Creating a new report - use the formId from the route
          setResolvedFormId(formId);
        } else if (reportId) {
          // Editing an existing report - look up its form_id
          const { data, error } = await supabase
            .from('service_reports')
            .select('form_id')
            .eq('id', reportId)
            .single();

          if (error) {
            console.error('Error resolving form_id for report:', error);
            setResolvedFormId(null);
          } else {
            setResolvedFormId(data?.form_id || null);
          }
        } else {
          setResolvedFormId(null);
        }
      } catch (error) {
        console.error('Error in ReportFormGate:', error);
        setResolvedFormId(null);
      } finally {
        setLoading(false);
      }
    }

    resolveFormId();
  }, [formId, reportId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!resolvedFormId) {
    return (
      <div className="p-4">
        <div className="text-center text-red-600">Unable to determine form type</div>
      </div>
    );
  }

  // Route to the correct form component based on form_id
  if (resolvedFormId === CF105_FORM_ID) {
    return <FillReportCF105 />;
  }

  // Default to CF103 (original FillReport)
  return <FillReport />;
}
