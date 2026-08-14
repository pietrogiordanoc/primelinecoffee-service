import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate } from '@/utils/dateUtils';
import { ArrowLeft, Building2, User, Calendar, FileText, Image as ImageIcon, MessageSquare, Send, Share2, Check, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ServiceReport, AdminComment } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { pdf } from '@react-pdf/renderer';
import ReportPDF from '@/components/pdf/ReportPDF';

export default function ViewReport() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuthStore();
  const [report, setReport] = useState<ServiceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [reportIds, setReportIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  
  // Detect if we're in admin or technician view
  const isAdminView = window.location.pathname.includes('/admin/');
  const backPath = isAdminView ? '/admin/reports' : '/technician/history';
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';

  useEffect(() => {
    if (reportId) {
      loadReport();
      loadReportIds();
      if (isAdmin) {
        loadComments();
      }
    }
  }, [reportId, isAdmin]);

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
          sales_representative:users!sales_representative_id(full_name, email),
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
        sales_representative: reportData.sales_representative,
        photos: reportData.photos || [],
      };

      setReport(transformedReport);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadReportIds() {
    try {
      let query = supabase
        .from('report_summary')
        .select('id')
        .order('created_at', { ascending: false });
      
      // Filter by technician if in technician view
      if (!isAdminView && userProfile?.email) {
        query = query.eq('technician_email', userProfile.email);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const ids = (data || []).map(r => r.id);
      setReportIds(ids);
      
      // Find current index
      const index = ids.indexOf(reportId!);
      setCurrentIndex(index);
    } catch (error) {
      console.error('Error loading report IDs:', error);
    }
  }

  async function loadComments() {
    try {
      const { data, error } = await supabase
        .from('admin_comments')
        .select(`
          *,
          user:users(full_name, email)
        `)
        .eq('report_id', reportId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  }

  function navigateToPrevious() {
    if (currentIndex > 0 && reportIds.length > 0) {
      const prevId = reportIds[currentIndex - 1];
      navigate(isAdminView ? `/admin/reports/${prevId}` : `/technician/reports/${prevId}`);
    }
  }

  function navigateToNext() {
    if (currentIndex < reportIds.length - 1 && reportIds.length > 0) {
      const nextId = reportIds[currentIndex + 1];
      navigate(isAdminView ? `/admin/reports/${nextId}` : `/technician/reports/${nextId}`);
    }
  }

  async function addComment() {
    if (!newComment.trim() || !reportId || !userProfile) return;

    try {
      setSubmittingComment(true);

      const { data, error } = await supabase
        .from('admin_comments')
        .insert({
          report_id: reportId,
          user_id: userProfile.id,
          comment: newComment.trim(),
        })
        .select(`
          *,
          user:users(full_name, email)
        `)
        .single();

      if (error) throw error;

      setComments([data, ...comments]);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Error adding comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  }

  function copyPublicLink() {
    const publicUrl = `${window.location.origin}/report-photos/${reportId}`;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }).catch(err => {
      console.error('Error copying link:', err);
      alert('Failed to copy link');
    });
  }

  async function exportToPDF() {
    if (!report) return;
    
    try {
      setGeneratingPDF(true);
      
      console.log('Starting PDF export with', report.photos?.length || 0, 'photos');
      
      // Convert images to JPEG base64 (WebP not supported by @react-pdf/renderer)
      const photosWithBase64 = await Promise.all(
        (report.photos || []).slice(0, 6).map(async (photo) => {
          try {
            let filename = photo.file_name;
            
            // Clean filename
            if (filename.includes('service-photos/')) {
              const parts = filename.split('service-photos/');
              filename = parts[parts.length - 1];
            }
            filename = filename.split('?')[0];
            
            // Construct public URL
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const publicUrl = `${supabaseUrl}/storage/v1/object/public/service-photos/${filename}`;
            
            console.log('Loading image:', filename);
            
            // Fetch image
            const response = await fetch(publicUrl);
            if (!response.ok) {
              throw new Error(`Failed to load image: ${response.status}`);
            }
            
            const blob = await response.blob();
            
            // Convert WebP/PNG to JPEG using Canvas (for @react-pdf/renderer compatibility)
            const imageBase64 = await new Promise<string>((resolve, reject) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              
              img.onload = () => {
                try {
                  // Calculate dimensions (max 800px width, maintain aspect ratio)
                  let width = img.width;
                  let height = img.height;
                  const maxWidth = 800;
                  
                  if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                  }
                  
                  // Create canvas with resized dimensions
                  const canvas = document.createElement('canvas');
                  canvas.width = width;
                  canvas.height = height;
                  
                  const ctx = canvas.getContext('2d');
                  if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                  }
                  
                  // Draw image on canvas (resized)
                  ctx.drawImage(img, 0, 0, width, height);
                  
                  // Convert to JPEG base64 (quality 0.85)
                  const jpegBase64 = canvas.toDataURL('image/jpeg', 0.85);
                  resolve(jpegBase64);
                } catch (err) {
                  reject(err);
                }
              };
              
              img.onerror = () => reject(new Error('Failed to load image'));
              
              // Load image from blob
              img.src = URL.createObjectURL(blob);
            });
            
            console.log('✓ Image converted:', filename, '-', Math.round(blob.size / 1024), 'KB -> JPEG');
            
            return {
              ...photo,
              file_url: imageBase64,
            };
          } catch (err) {
            console.error('✗ Failed to convert image:', photo.file_name, err);
            return null;
          }
        })
      );
      
      // Filter out failed conversions
      const validPhotos = photosWithBase64.filter(p => p !== null);
      console.log('Photos ready for PDF:', validPhotos.length, 'of', report.photos?.length || 0);
      
      if (validPhotos.length === 0 && report.photos && report.photos.length > 0) {
        console.warn('WARNING: No photos could be converted for PDF');
      }
      
      // Create report copy with JPEG base64 images
      const reportForPDF = {
        ...report,
        photos: validPhotos,
      };
      
      console.log('Generating PDF document...');
      
      // Generate PDF document
      const blob = await pdf(<ReportPDF report={reportForPDF} />).toBlob();
      
      console.log('✓ PDF generated successfully:', Math.round(blob.size / 1024), 'KB');
      
      // Open PDF in new tab instead of downloading
      const url = URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank');
      
      if (!newWindow) {
        // If popup blocked, fallback to download
        console.warn('Popup blocked, falling back to download');
        const link = document.createElement('a');
        link.href = url;
        link.download = `${report.report_code || 'report'}_${report.company?.name?.replace(/[^a-z0-9]/gi, '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      // Don't revoke URL immediately - let browser load it first
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60000); // Revoke after 1 minute
      
      console.log('PDF opened in new tab');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPDF(false);
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
    <div className="p-3 md:p-4 space-y-3 md:space-y-4 pb-24 max-w-6xl mx-auto">
      {/* Header - Optimizado para mobile */}
      <div className="space-y-2">
        {/* Primera fila: Back + Navigation + Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(backPath)}
            className="p-1.5 md:p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          {/* Navigation Arrows */}
          {reportIds.length > 0 && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={navigateToPrevious}
                disabled={currentIndex <= 0}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                title="Previous report"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <span className="text-xs text-gray-500 px-1 hidden sm:inline">
                {currentIndex + 1}/{reportIds.length}
              </span>
              <button
                onClick={navigateToNext}
                disabled={currentIndex >= reportIds.length - 1}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                title="Next report"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          )}
          
          {/* Spacer */}
          <div className="flex-1" />
          
          {/* Actions - Solo iconos en mobile */}
          <Button
            onClick={copyPublicLink}
            variant="secondary"
            size="sm"
            className="p-2"
            title={linkCopied ? 'Link Copied!' : 'Share Public Link'}
          >
            {linkCopied ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            <span className="ml-2 hidden md:inline">
              {linkCopied ? 'Copied!' : 'Share'}
            </span>
          </Button>
          <Button
            onClick={exportToPDF}
            variant="secondary"
            size="sm"
            className="p-2"
            disabled={generatingPDF}
            title={generatingPDF ? 'Generating...' : 'Export PDF'}
          >
            <Download className="w-4 h-4" />
            <span className="ml-2 hidden md:inline">
              {generatingPDF ? 'Generating...' : 'PDF'}
            </span>
          </Button>
          <span
            className={`px-2 md:px-3 py-1 text-xs font-medium rounded-full hidden sm:inline ${
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
        
        {/* Segunda fila: Title compacto - TODO en una línea en mobile */}
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-base md:text-xl font-bold text-gray-900">Report Details</h1>
          <span className="text-gray-400">·</span>
          <span className="text-sm md:text-base font-semibold text-primary-600">{report.report_code || 'N/A'}</span>
          <span className="text-gray-400 hidden sm:inline">·</span>
          <p className="text-xs md:text-sm text-gray-500 truncate">{report.form?.name}</p>
        </div>
      </div>

      {/* Company & Technician Info - Compacto para mobile */}
      <Card>
        <div className="p-2 md:p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
            <div className="flex items-start gap-2">
              <Building2 className="w-4 h-4 md:w-5 md:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] md:text-xs text-gray-500">Company</p>
                <p className="text-sm md:text-base font-medium text-gray-900 truncate">{report.company?.name}</p>
                {report.company?.address && (
                  <p className="text-[11px] md:text-sm text-gray-600 truncate md:whitespace-normal">
                    {report.company.address}
                    {report.company.city && `, ${report.company.city}`}
                    {report.company.state && `, ${report.company.state}`}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <User className="w-4 h-4 md:w-5 md:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] md:text-xs text-gray-500">Technician</p>
                <p className="text-sm md:text-base font-medium text-gray-900 truncate">{report.technician?.user?.full_name}</p>
                <p className="text-[11px] md:text-sm text-gray-600 truncate">{report.technician?.user?.email}</p>
              </div>
            </div>

            {report.sales_representative && (
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 md:w-5 md:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] md:text-xs text-gray-500">Sales Rep</p>
                  <p className="text-sm md:text-base font-medium text-gray-900 truncate">{report.sales_representative.full_name}</p>
                  <p className="text-[11px] md:text-sm text-gray-600 truncate">{report.sales_representative.email}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 md:w-5 md:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] md:text-xs text-gray-500">Submitted</p>
                <p className="text-sm md:text-base font-medium text-gray-900">
                  {report.submitted_at
                    ? formatDate(report.submitted_at, 'PPp')
                    : 'Not submitted yet'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Form Data - Compact View */}
      <Card>
        <div className="p-2 md:p-4">
          <h2 className="text-xs md:text-sm font-semibold text-gray-900 mb-2 md:mb-3">Service Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
            {report.form_data.serviceDate && (
              <div>
                <p className="text-[10px] md:text-xs text-gray-500 mb-0.5 md:mb-1">Service Date</p>
                <p className="text-xs md:text-sm text-gray-900 font-medium">
                  {formatDate(report.form_data.serviceDate as string, 'PP')}
                </p>
              </div>
            )}

            {report.form_data.property && (
              <div>
                <p className="text-[10px] md:text-xs text-gray-500 mb-0.5 md:mb-1">Property</p>
                <p className="text-xs md:text-sm text-gray-900 font-medium truncate">{String(report.form_data.property)}</p>
              </div>
            )}

            {report.form_data.serviceType && (
              <div>
                <p className="text-[10px] md:text-xs text-gray-500 mb-0.5 md:mb-1">Service Type</p>
                <p className="text-xs md:text-sm text-gray-900 font-medium truncate">{String(report.form_data.serviceType)}</p>
              </div>
            )}

            {report.form_data.customerName && (
              <div>
                <p className="text-[10px] md:text-xs text-gray-500 mb-0.5 md:mb-1">Customer</p>
                <p className="text-xs md:text-sm text-gray-900 font-medium truncate">{String(report.form_data.customerName)}</p>
              </div>
            )}

            {/* Summary Stats */}
            {report.form_data.summary && typeof report.form_data.summary === 'object' && (
              <>
                {(report.form_data.summary as any).equipmentCount !== undefined && (
                  <div className="bg-blue-50 rounded-lg p-1.5 md:p-2">
                    <p className="text-[10px] md:text-xs text-blue-600 mb-0.5 md:mb-1">Equipment</p>
                    <p className="text-base md:text-lg font-bold text-blue-900">{(report.form_data.summary as any).equipmentCount}</p>
                  </div>
                )}
                {(report.form_data.summary as any).totalHours !== undefined && (
                  <div className="bg-green-50 rounded-lg p-1.5 md:p-2">
                    <p className="text-[10px] md:text-xs text-green-600 mb-0.5 md:mb-1">Hours</p>
                    <p className="text-base md:text-lg font-bold text-green-900">{(report.form_data.summary as any).totalHours}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Additional Notes - Compact */}
          {report.form_data.additional_notes && (
            <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-gray-200">
              <p className="text-[10px] md:text-xs text-gray-500 mb-0.5 md:mb-1">Notes</p>
              <p className="text-xs md:text-sm text-gray-700 line-clamp-2">
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
            <div className="p-2 md:p-4">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <h3 className="text-xs md:text-sm font-semibold text-gray-900">Equipment #{index + 1}</h3>
                {equipment.photoCount > 0 && (
                  <span className="text-[10px] md:text-xs text-gray-500 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" />
                    {equipment.photoCount} {equipment.photoCount === 1 ? 'photo' : 'photos'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-2 md:mb-3">
                {equipment.brand && (
                  <div>
                    <p className="text-[10px] md:text-xs text-gray-500 mb-0.5 md:mb-1">Brand</p>
                    <p className="text-xs md:text-sm text-gray-900 font-medium">{equipment.brand}</p>
                  </div>
                )}

                {equipment.model && (
                  <div>
                    <p className="text-[10px] md:text-xs text-gray-500 mb-0.5 md:mb-1">Model</p>
                    <p className="text-xs md:text-sm text-gray-900 font-medium">{equipment.model}</p>
                  </div>
                )}

                {equipment.serial && (
                  <div>
                    <p className="text-[10px] md:text-xs text-gray-500 mb-0.5 md:mb-1">Serial Number</p>
                    <p className="text-xs md:text-sm text-gray-900 font-medium font-mono">{equipment.serial}</p>
                  </div>
                )}

                {equipment.hours !== undefined && equipment.hours !== null && (
                  <div>
                    <p className="text-[10px] md:text-xs text-gray-500 mb-0.5 md:mb-1">Labor Hours</p>
                    <p className="text-xs md:text-sm text-gray-900 font-medium">
                      {equipment.hours} {equipment.hours === 1 ? 'hour' : 'hours'}
                    </p>
                  </div>
                )}
              </div>

              {equipment.problem && (
                <div className="mb-2 md:mb-3">
                  <p className="text-[10px] md:text-xs text-gray-500 mb-0.5 md:mb-1">Problem / Issue</p>
                  <p className="text-xs md:text-sm text-gray-900 bg-gray-50 rounded p-1.5 md:p-2">{equipment.problem}</p>
                </div>
              )}

              {equipment.work_performed && (
                <div className="mb-2 md:mb-3">
                  <p className="text-[10px] md:text-xs text-gray-500 mb-0.5 md:mb-1">Work Performed</p>
                  <p className="text-xs md:text-sm text-gray-900 bg-gray-50 rounded p-1.5 md:p-2">{equipment.work_performed}</p>
                </div>
              )}

              {equipment.parts_used && Array.isArray(equipment.parts_used) && equipment.parts_used.length > 0 && (
                <div>
                  <p className="text-[10px] md:text-xs text-gray-500 mb-1.5 md:mb-2">Parts Used</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 md:gap-2">
                    {equipment.parts_used.map((part: any, partIndex: number) => (
                      <div key={partIndex} className="text-xs md:text-sm text-gray-900 bg-gray-50 rounded px-2 md:px-3 py-1.5 md:py-2">
                        {part.name} <span className="text-gray-500">x{part.quantity}</span>
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
          <div className="p-2 md:p-4">
            <div className="flex items-center gap-2 mb-2 md:mb-3">
              <ImageIcon className="w-4 h-4 text-gray-600" />
              <h2 className="text-xs md:text-sm font-semibold text-gray-900">
                Photos ({report.photos.length})
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
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
          <div className="p-2 md:p-4">
            <h2 className="text-xs md:text-sm font-semibold text-gray-900 mb-2 md:mb-3">Customer Signature</h2>
            <div className="border border-gray-200 rounded-lg p-2 md:p-3 bg-gray-50">
              <img
                src={report.signature_url}
                alt="Customer Signature"
                className="max-w-full md:max-w-[40%] h-auto"
              />
              {report.form_data.customerPrintName && (
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <p className="text-[10px] md:text-xs text-gray-500">Print Name:</p>
                  <p className="text-xs md:text-sm text-gray-900 font-medium">{String(report.form_data.customerPrintName)}</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Notes */}
      {report.notes && (
        <Card>
          <div className="p-2 md:p-4">
            <h2 className="text-xs md:text-sm font-semibold text-gray-900 mb-1.5 md:mb-2">Notes</h2>
            <p className="text-xs md:text-sm text-gray-700 whitespace-pre-wrap">{report.notes}</p>
          </div>
        </Card>
      )}

      {/* Admin Comments Section - Only visible to admins */}
      {isAdmin && (
        <Card>
          <div className="p-2 md:p-4">
            <div className="flex items-center gap-2 mb-3 md:mb-4">
              <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-primary-600" />
              <h2 className="text-xs md:text-sm font-semibold text-gray-900">Admin Comments</h2>
              <span className="text-[10px] md:text-xs text-gray-500">({comments.length})</span>
            </div>

            {/* New Comment Input */}
            <div className="mb-4 md:mb-6">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add an internal note or comment..."
                rows={3}
                className="w-full px-2 md:px-3 py-1.5 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-xs md:text-sm"
              />
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mt-2">
                <p className="text-[10px] md:text-xs text-gray-500">
                  Only visible to admins. Your name and timestamp will be recorded.
                </p>
                <Button
                  onClick={addComment}
                  disabled={!newComment.trim() || submittingComment}
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {submittingComment ? 'Adding...' : 'Add Comment'}
                </Button>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-2 md:space-y-3">
              {comments.length === 0 ? (
                <div className="text-center py-6 md:py-8 text-gray-500 text-xs md:text-sm">
                  No comments yet. Add the first one above.
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 rounded-lg p-2 md:p-3 border border-gray-200">
                    <div className="flex items-start justify-between gap-2 md:gap-3 mb-1.5 md:mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs md:text-sm font-semibold text-gray-900 truncate">
                          {comment.user?.full_name || 'Unknown Admin'}
                        </p>
                        <p className="text-[10px] md:text-xs text-gray-500 truncate">{comment.user?.email}</p>
                      </div>
                      <p className="text-[10px] md:text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                        {formatDate(comment.created_at, 'PPp')}
                      </p>
                    </div>
                    <p className="text-xs md:text-sm text-gray-700 whitespace-pre-wrap">
                      {comment.comment}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
