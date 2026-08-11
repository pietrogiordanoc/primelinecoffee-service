import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate } from '@/utils/dateUtils';
import { X, ChevronLeft, ChevronRight, Download, Calendar, Building2, User, FileText, Image as ImageIcon } from 'lucide-react';
import type { ServiceReport } from '@/types';

export default function ReportPhotos() {
  const { reportId } = useParams<{ reportId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ServiceReport | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);

  useEffect(() => {
    loadReport();
  }, [reportId]);

  async function loadReport() {
    try {
      setLoading(true);
      setError(null);

      if (!reportId) {
        setError('Report ID is required');
        return;
      }

      // Load complete report with all relations
      const { data: reportData, error: reportError } = await supabase
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
        .maybeSingle();

      if (reportError) throw reportError;
      if (!reportData) {
        setError('Report not found');
        return;
      }

      // Transform the data to match ServiceReport interface
      const transformedReport: ServiceReport = {
        ...reportData,
        form: reportData.form,
        company: reportData.company,
        technician: reportData.technician,
        photos: reportData.photos || [],
      };

      setReport(transformedReport);
    } catch (err: any) {
      console.error('Error loading report:', err);
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }

  function openLightbox(index: number) {
    setSelectedPhoto(index);
  }

  function closeLightbox() {
    setSelectedPhoto(null);
  }

  function nextPhoto() {
    if (selectedPhoto !== null && report?.photos && selectedPhoto < report.photos.length - 1) {
      setSelectedPhoto(selectedPhoto + 1);
    }
  }

  function prevPhoto() {
    if (selectedPhoto !== null && selectedPhoto > 0) {
      setSelectedPhoto(selectedPhoto - 1);
    }
  }

  function downloadPhoto(url: string, fileName: string) {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (selectedPhoto === null) return;
      
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextPhoto();
      if (e.key === 'ArrowLeft') prevPhoto();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhoto]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Error Loading Report</h1>
          <p className="text-gray-600">{error || 'Report not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Sticky */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">
                Service Report
              </h1>
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
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
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

        {/* Service Details */}
        <Card>
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Service Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {report.form_data.serviceDate && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Service Date</p>
                  <p className="text-sm text-gray-900 font-medium">
                    {formatDate(report.form_data.serviceDate as string, 'PP')}
                  </p>
                </div>
              )}

              {report.form_data.property && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Property</p>
                  <p className="text-sm text-gray-900 font-medium truncate">{String(report.form_data.property)}</p>
                </div>
              )}

              {report.form_data.serviceType && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Service Type</p>
                  <p className="text-sm text-gray-900 font-medium truncate">{String(report.form_data.serviceType)}</p>
                </div>
              )}

              {report.form_data.customerName && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Customer</p>
                  <p className="text-sm text-gray-900 font-medium truncate">{String(report.form_data.customerName)}</p>
                </div>
              )}

              {/* Summary Stats */}
              {report.form_data.summary && typeof report.form_data.summary === 'object' && (
                <>
                  {(report.form_data.summary as any).equipmentCount !== undefined && (
                    <div className="bg-blue-50 rounded-lg p-2">
                      <p className="text-xs text-blue-600 mb-1">Equipment</p>
                      <p className="text-lg font-bold text-blue-900">{(report.form_data.summary as any).equipmentCount}</p>
                    </div>
                  )}
                  {(report.form_data.summary as any).totalHours !== undefined && (
                    <div className="bg-green-50 rounded-lg p-2">
                      <p className="text-xs text-green-600 mb-1">Hours</p>
                      <p className="text-lg font-bold text-green-900">{(report.form_data.summary as any).totalHours}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Additional Notes */}
            {report.form_data.additional_notes && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {String(report.form_data.additional_notes)}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Equipment Records */}
        {report.form_data.equipmentRecords && Array.isArray(report.form_data.equipmentRecords) && 
          (report.form_data.equipmentRecords as any[]).map((equipment, index) => (
            <Card key={index}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Equipment #{index + 1}</h3>
                  {equipment.photoCount > 0 && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      {equipment.photoCount} {equipment.photoCount === 1 ? 'photo' : 'photos'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
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
                </div>

                {equipment.problem && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Problem / Issue</p>
                    <p className="text-sm text-gray-900 bg-gray-50 rounded p-2">{equipment.problem}</p>
                  </div>
                )}

                {equipment.work_performed && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Work Performed</p>
                    <p className="text-sm text-gray-900 bg-gray-50 rounded p-2">{equipment.work_performed}</p>
                  </div>
                )}

                {equipment.parts_used && Array.isArray(equipment.parts_used) && equipment.parts_used.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Parts Used</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {equipment.parts_used.map((part: any, partIndex: number) => (
                        <div key={partIndex} className="text-sm text-gray-900 flex justify-between items-center bg-gray-50 rounded px-3 py-2">
                          <span>{part.name} <span className="text-gray-500">x{part.quantity}</span></span>
                          <span className="font-medium">${part.cost}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))
        }

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
                {report.photos.map((photo, index) => (
                  <div 
                    key={photo.id} 
                    className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => openLightbox(index)}
                  >
                    <img
                      src={photo.thumbnail_url || photo.file_url}
                      alt={photo.file_name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Expand indicator */}
                    <div className="absolute top-2 right-2 bg-black bg-opacity-60 rounded-full p-1.5">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                      </svg>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                      {index + 1}
                    </div>
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

      {/* Lightbox for Photos */}
      {selectedPhoto !== null && report.photos && report.photos[selectedPhoto] && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center">
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 w-12 h-12 bg-white bg-opacity-10 hover:bg-opacity-20 rounded-full flex items-center justify-center text-white transition-all z-10"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Download Button */}
          <button
            onClick={() => downloadPhoto(report.photos[selectedPhoto].file_url, report.photos[selectedPhoto].file_name)}
            className="absolute top-4 right-20 w-12 h-12 bg-white bg-opacity-10 hover:bg-opacity-20 rounded-full flex items-center justify-center text-white transition-all z-10"
          >
            <Download className="w-6 h-6" />
          </button>

          {/* Previous Button */}
          {selectedPhoto > 0 && (
            <button
              onClick={prevPhoto}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white bg-opacity-10 hover:bg-opacity-20 rounded-full flex items-center justify-center text-white transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Next Button */}
          {selectedPhoto < report.photos.length - 1 && (
            <button
              onClick={nextPhoto}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white bg-opacity-10 hover:bg-opacity-20 rounded-full flex items-center justify-center text-white transition-all"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Photo */}
          <div className="max-w-7xl max-h-screen p-4">
            <img
              src={report.photos[selectedPhoto].file_url}
              alt={report.photos[selectedPhoto].file_name}
              className="max-w-full max-h-screen object-contain"
            />
          </div>

          {/* Photo Info */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-60 text-white px-4 py-2 rounded-lg">
            Photo {selectedPhoto + 1} of {report.photos.length}
          </div>
        </div>
      )}
    </div>
  );
}
