import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate, formatRelativeTime } from '@/utils/dateUtils';
import { Clock, CheckCircle, FileText } from 'lucide-react';
import type { ReportSummary } from '@/types';

export default function ReportHistory() {
  const { userProfile } = useAuthStore();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, [userProfile]);

  async function loadReports() {
    try {
      setLoading(true);

      const { data: techData } = await supabase
        .from('technicians')
        .select('id')
        .eq('user_id', userProfile?.id)
        .single();

      if (!techData) return;

      const { data, error } = await supabase
        .from('report_summary')
        .select('*')
        .eq('technician_email', userProfile?.email)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <h1 className="text-2xl font-bold text-gray-900">Historial de Reportes</h1>

      {reports.length === 0 ? (
        <Card>
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No has creado reportes aún</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Card key={report.id}>
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{report.company_name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{report.form_name}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      report.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : report.status === 'reviewed'
                        ? 'bg-blue-100 text-blue-700'
                        : report.status === 'submitted'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {report.status === 'completed'
                      ? 'Completado'
                      : report.status === 'reviewed'
                      ? 'Revisado'
                      : report.status === 'submitted'
                      ? 'Enviado'
                      : 'Borrador'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>{formatRelativeTime(report.created_at)}</span>
                  </div>
                  {report.photo_count > 0 && (
                    <span className="text-xs">{report.photo_count} fotos</span>
                  )}
                </div>

                {report.submitted_at && (
                  <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                    Enviado: {formatDate(report.submitted_at, 'PPp')}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
