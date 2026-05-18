import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate } from '@/utils/dateUtils';
import { ArrowLeft, Building2, User, Calendar, FileText, Image as ImageIcon } from 'lucide-react';
import type { ServiceReport } from '@/types';

export default function ViewReport() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<ServiceReport | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Detect if we're in admin or technician view
  const isAdminView = window.location.pathname.includes('/admin/');
  const backPath = isAdminView ? '/admin/reports' : '/technician/history';

  useEffect(() => {
    if (reportId) {
      loadReport();
    }
  }, [reportId]);

  async function loadReport() {
    try {
      setLoading(true);

      const { data: reportData, error } = await supabase
        .from('service_reports')
        .select(`
          *,
          form:dynamic_forms(name),
          company:companies(name, address, city, state, contact_name, contact_email, contact_phone),
          technician:technicians!inner(
            user:users(full_name, email)
          ),
          photos:report_photos(*)
        `)
        .eq('id', reportId)
        .single();

      if (error) throw error;

      // Transform the data to match ServiceReport interface
      const transformedReport: ServiceReport = {
        ...reportData,
        form: reportData.form,
        company: reportData.company,
        technician: reportData.technician,
        photos: reportData.photos || [],
      };

      setReport(transformedReport);
    } catch (error) {
      console.error('Error loading report:', error);
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

  if (!report) {
    return (
      <div className="p-4">
        <Card>
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">Report not found</p>
            <Button onClick={() => navigate(backPath)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to {isAdminView ? 'Reports' : 'History'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate(backPath)}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Report Details</h1>
          <p className="text-sm text-gray-500">{report.form?.name}</p>
        </div>
        <span
          className={`px-3 py-1 text-xs font-medium rounded-full ${
            report.status === 'completed'
              ? 'bg-green-100 text-green-700'
              : report.status === 'reviewed'
              ? 'bg-blue-100 text-blue-700'
              : report.status === 'submitted'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
        </span>
      </div>

      {/* Company & Technician Info */}
      <Card>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Company</p>
                <p className="font-medium text-gray-900 truncate">{report.company?.name}</p>
                {report.company?.address && (
                  <p className="text-sm text-gray-600">
                    {report.company.address}
                    {report.company.city && `, ${report.company.city}`}
                    {report.company.state && `, ${report.company.state}`}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Technician</p>
                <p className="font-medium text-gray-900 truncate">{report.technician?.user?.full_name}</p>
                <p className="text-sm text-gray-600 truncate">{report.technician?.user?.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Submitted</p>
                <p className="font-medium text-gray-900">
                  {report.submitted_at
                    ? formatDate(report.submitted_at, 'PPp')
                    : 'Not submitted yet'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Form Data */}
      <Card>
        <div className="p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Form Data</h2>
          
          {/* Two-column layout for desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* General Information Column */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">General Information</h3>
              
              {report.form_data.serviceDate && (
                <div className="border-b border-gray-100 pb-2">
                  <p className="text-xs text-gray-500 mb-1">Service Date</p>
                  <p className="text-sm text-gray-900 font-medium">
                    {formatDate(report.form_data.serviceDate as string, 'PP')}
                  </p>
                </div>
              )}

              {report.form_data.property && (
                <div className="border-b border-gray-100 pb-2">
                  <p className="text-xs text-gray-500 mb-1">Property</p>
                  <p className="text-sm text-gray-900 font-medium">{String(report.form_data.property)}</p>
                </div>
              )}

              {report.form_data.serviceType && (
                <div className="border-b border-gray-100 pb-2">
                  <p className="text-xs text-gray-500 mb-1">Service Type</p>
                  <p className="text-sm text-gray-900 font-medium">{String(report.form_data.serviceType)}</p>
                </div>
              )}

              {report.form_data.customerName && (
                <div className="border-b border-gray-100 pb-2">
                  <p className="text-xs text-gray-500 mb-1">Customer Name</p>
                  <p className="text-sm text-gray-900 font-medium">{String(report.form_data.customerName)}</p>
                </div>
              )}

              {report.form_data.customerEmail && (
                <div className="border-b border-gray-100 pb-2">
                  <p className="text-xs text-gray-500 mb-1">Customer Email</p>
                  <p className="text-sm text-gray-900 font-medium">{String(report.form_data.customerEmail)}</p>
                </div>
              )}

              {report.form_data.technicianName && (
                <div className="border-b border-gray-100 pb-2">
                  <p className="text-xs text-gray-500 mb-1">Technician Name</p>
                  <p className="text-sm text-gray-900 font-medium">{String(report.form_data.technicianName)}</p>
                </div>
              )}

              {/* Summary Statistics */}
              {report.form_data.summary && typeof report.form_data.summary === 'object' && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">Summary</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {(report.form_data.summary as any).equipmentCount !== undefined && (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-xs text-blue-600 mb-1">Equipment</p>
                        <p className="text-lg font-bold text-blue-900">{(report.form_data.summary as any).equipmentCount}</p>
                      </div>
                    )}
                    {(report.form_data.summary as any).totalHours !== undefined && (
                      <div className="bg-green-50 rounded-lg p-3">
                        <p className="text-xs text-green-600 mb-1">Total Hours</p>
                        <p className="text-lg font-bold text-green-900">{(report.form_data.summary as any).totalHours}</p>
                      </div>
                    )}
                    {(report.form_data.summary as any).totalPartsCost !== undefined && (
                      <div className="bg-purple-50 rounded-lg p-3">
                        <p className="text-xs text-purple-600 mb-1">Parts Cost</p>
                        <p className="text-lg font-bold text-purple-900">${(report.form_data.summary as any).totalPartsCost}</p>
                      </div>
                    )}
                    {(report.form_data.summary as any).totalParts !== undefined && (
                      <div className="bg-amber-50 rounded-lg p-3">
                        <p className="text-xs text-amber-600 mb-1">Parts Used</p>
                        <p className="text-lg font-bold text-amber-900">{(report.form_data.summary as any).totalParts}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Equipment Records Column */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">Equipment Records</h3>
              
              {report.form_data.equipmentRecords && Array.isArray(report.form_data.equipmentRecords) && 
                (report.form_data.equipmentRecords as any[]).map((equipment, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">Equipment #{index + 1}</h4>
                      {equipment.photoCount > 0 && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          {equipment.photoCount} {equipment.photoCount === 1 ? 'photo' : 'photos'}
                        </span>
                      )}
                    </div>

                    {equipment.brand && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Brand</p>
                        <p className="text-sm text-gray-900 font-medium">{equipment.brand}</p>
                      </div>
                    )}

                    {equipment.model && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Model</p>
                        <p className="text-sm text-gray-900 font-medium">{equipment.model}</p>
                      </div>
                    )}

                    {equipment.serial && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Serial Number</p>
                        <p className="text-sm text-gray-900 font-medium font-mono">{equipment.serial}</p>
                      </div>
                    )}

                    {equipment.hours !== undefined && equipment.hours !== null && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Labor Hours</p>
                        <p className="text-sm text-gray-900 font-medium">
                          {equipment.hours} {equipment.hours === 1 ? 'hour' : 'hours'}
                        </p>
                      </div>
                    )}

                    {equipment.problem && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Problem / Issue</p>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{equipment.problem}</p>
                      </div>
                    )}

                    {equipment.work_performed && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Work Performed</p>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{equipment.work_performed}</p>
                      </div>
                    )}

                    {equipment.parts_used && Array.isArray(equipment.parts_used) && equipment.parts_used.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Parts Used</p>
                        <div className="space-y-1">
                          {equipment.parts_used.map((part: any, partIndex: number) => (
                            <div key={partIndex} className="text-sm text-gray-900 flex justify-between items-center bg-white rounded px-2 py-1">
                              <span>{part.name} <span className="text-gray-500">x{part.quantity}</span></span>
                              <span className="font-medium">${part.cost}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              }
            </div>
          </div>

          {/* Additional Notes - Full Width */}
          {report.form_data.additional_notes && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">Additional Notes</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {String(report.form_data.additional_notes)}
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Photos */}
      {report.photos && report.photos.length > 0 && (
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="w-4 h-4 text-gray-600" />
              <h2 className="text-sm font-semibold text-gray-900">
                Photos ({report.photos.length})
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {report.photos.map((photo) => (
                <div 
                  key={photo.id} 
                  className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(photo.file_url, '_blank')}
                >
                  <img
                    src={photo.thumbnail_url || photo.file_url}
                    alt={photo.file_name}
                    className="w-full h-full object-cover"
                  />
                  {/* Expand indicator */}
                  <div className="absolute top-2 right-2 bg-black bg-opacity-60 rounded-full p-1.5">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                    </svg>
                  </div>
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2">
                      {photo.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Signature */}
      {report.signature_url && (
        <Card>
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Signature</h2>
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <img
                src={report.signature_url}
                alt="Signature"
                className="max-w-full h-auto"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Notes */}
      {report.notes && (
        <Card>
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Notes</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{report.notes}</p>
          </div>
        </Card>
      )}
    </div>
  );
}
