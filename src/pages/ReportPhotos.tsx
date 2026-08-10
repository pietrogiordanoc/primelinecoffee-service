import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { X, ChevronLeft, ChevronRight, Download, Calendar, Building2, User } from 'lucide-react';

interface Photo {
  id: string;
  file_url: string;
  file_name: string;
  thumbnail_url?: string;
  mime_type: string;
  order_index: number;
}

interface Report {
  id: string;
  report_code: string;
  created_at: string;
  company: {
    name: string;
  };
  technician: {
    user: {
      full_name: string;
    };
  };
  form: {
    name: string;
  };
}

export default function ReportPhotos() {
  const { reportId } = useParams<{ reportId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [signedUrls, setSignedUrls] = useState<string[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);

  useEffect(() => {
    loadReportPhotos();
  }, [reportId]);

  async function loadReportPhotos() {
    try {
      setLoading(true);
      setError(null);

      if (!reportId) {
        setError('Report ID is required');
        return;
      }

      // Load report details with simple joins
      const { data: reportData, error: reportError } = await supabase
        .from('service_reports')
        .select(`
          id,
          report_code,
          created_at,
          company_id,
          technician_id,
          form_id
        `)
        .eq('id', reportId)
        .single();

      if (reportError) throw reportError;

      // Load company
      const { data: companyData } = await supabase
        .from('companies')
        .select('name')
        .eq('id', reportData.company_id)
        .single();

      // Load technician and user
      const { data: technicianData } = await supabase
        .from('technicians')
        .select('user_id')
        .eq('id', reportData.technician_id)
        .single();

      const { data: userData } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', technicianData?.user_id)
        .single();

      // Load form
      const { data: formData } = await supabase
        .from('dynamic_forms')
        .select('name')
        .eq('id', reportData.form_id)
        .single();

      // Construct the report object
      const transformedReport: Report = {
        id: reportData.id,
        report_code: reportData.report_code,
        created_at: reportData.created_at,
        company: { name: companyData?.name || 'Unknown' },
        technician: {
          user: { full_name: userData?.full_name || 'Unknown' },
        },
        form: { name: formData?.name || 'Unknown' },
      };
      
      setReport(transformedReport);

      // Load photos
      const { data: photosData, error: photosError } = await supabase
        .from('report_photos')
        .select('*')
        .eq('report_id', reportId)
        .order('order_index');

      if (photosError) throw photosError;

      setPhotos(photosData || []);

      // Generate signed URLs for all photos (direct from Supabase Storage, 0 Netlify bandwidth)
      const urls: string[] = [];
      for (const photo of photosData || []) {
        const { data: signedData } = await supabase.storage
          .from('service-photos')
          .createSignedUrl(photo.file_name, 604800); // 7 days

        if (signedData?.signedUrl) {
          urls.push(signedData.signedUrl);
        }
      }
      setSignedUrls(urls);
    } catch (err: any) {
      console.error('Error loading photos:', err);
      setError(err.message || 'Failed to load photos');
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
    if (selectedPhoto !== null && selectedPhoto < signedUrls.length - 1) {
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
          <h1 className="text-xl font-bold text-gray-900 mb-2">Error Loading Photos</h1>
          <p className="text-gray-600">{error || 'Report not found'}</p>
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">No Photos Available</h1>
          <p className="text-gray-600">This report doesn't have any photos attached.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">
                {report.form.name} - {report.company.name}
              </h1>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {report.technician.user.full_name}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(report.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            {photos.length} {photos.length === 1 ? 'Photo' : 'Photos'} • Click to view full size
          </p>
        </div>
      </div>

      {/* Photo Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {signedUrls.map((url, index) => (
            <button
              key={photos[index].id}
              onClick={() => openLightbox(index)}
              className="relative aspect-square rounded-lg overflow-hidden bg-gray-200 hover:opacity-90 transition-opacity group"
            >
              <img
                src={url}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                <span className="text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  View
                </span>
              </div>
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                {index + 1}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {selectedPhoto !== null && (
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
            onClick={() => downloadPhoto(signedUrls[selectedPhoto], photos[selectedPhoto].file_name)}
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
          {selectedPhoto < signedUrls.length - 1 && (
            <button
              onClick={nextPhoto}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white bg-opacity-10 hover:bg-opacity-20 rounded-full flex items-center justify-center text-white transition-all"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Image */}
          <div className="max-w-7xl max-h-screen p-4 flex items-center justify-center">
            <img
              src={signedUrls[selectedPhoto]}
              alt={`Photo ${selectedPhoto + 1}`}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-60 text-white px-4 py-2 rounded-full text-sm font-medium">
            {selectedPhoto + 1} / {signedUrls.length}
          </div>
        </div>
      )}
    </div>
  );
}
