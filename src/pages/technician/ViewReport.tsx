import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate } from '@/utils/dateUtils';
import { ArrowLeft, Building2, User, Calendar, FileText, Image as ImageIcon, MessageSquare, Send } from 'lucide-react';
import type { ServiceReport, AdminComment } from '@/types';
import { useAuthStore } from '@/stores/authStore';

export default function ViewReport() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuthStore();
  const [report, setReport] = useState<ServiceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  
  // Detect if we're in admin or technician view
  const isAdminView = window.location.pathname.includes('/admin/');
  const backPath = isAdminView ? '/admin/reports' : '/technician/history';
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';

  useEffect(() => {
    if (reportId) {
      loadReport();
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

      {/* Form Data - Compact View */}
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

          {/* Additional Notes - Compact */}
          {report.form_data.additional_notes && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-700 line-clamp-2">
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

      {/* Admin Comments Section - Only visible to admins */}
      {isAdmin && (
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-primary-600" />
              <h2 className="text-sm font-semibold text-gray-900">Admin Comments</h2>
              <span className="text-xs text-gray-500">({comments.length})</span>
            </div>

            {/* New Comment Input */}
            <div className="mb-6">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add an internal note or comment..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-sm"
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-500">
                  Only visible to admins. Your name and timestamp will be recorded.
                </p>
                <Button
                  onClick={addComment}
                  disabled={!newComment.trim() || submittingComment}
                  size="sm"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {submittingComment ? 'Adding...' : 'Add Comment'}
                </Button>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-3">
              {comments.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No comments yet. Add the first one above.
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {comment.user?.full_name || 'Unknown Admin'}
                        </p>
                        <p className="text-xs text-gray-500">{comment.user?.email}</p>
                      </div>
                      <p className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(comment.created_at, 'PPp')}
                      </p>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
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
