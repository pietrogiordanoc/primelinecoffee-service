import { FileText, CheckCircle2 } from 'lucide-react';
import Card from '@/components/ui/Card';

// Hardcoded form reference - for viewing only
const FORMS_REFERENCE = [
  {
    id: 'cf103',
    name: 'CF103 - Equipment Service Report',
    description: 'Complete service report for coffee equipment maintenance and repair',
    category: 'Service Reports',
    fields: [
      { label: 'Service Date', type: 'date', required: true, note: 'Auto-populated from system' },
      { label: 'Technician Name', type: 'text', required: true, note: 'Auto-populated from login' },
      { label: 'Property', type: 'select', required: true, options: ['PLD', 'La Colombe', 'Owner'] },
      { label: 'Service Type', type: 'select', required: true, options: ['Delivery', 'Pick up', 'Service', 'Tune up', 'Training', 'Other'] },
      { label: 'Sales Representative', type: 'select', required: false, note: 'Who requested this service' },
      { label: '--- EQUIPMENT RECORDS ---', type: 'section', note: 'Repeatable section for multiple equipment' },
      { label: 'Equipment Brand', type: 'text', required: true },
      { label: 'Model', type: 'text', required: true },
      { label: 'Serial Number', type: 'text', required: false },
      { label: 'Problem / Issue Reported', type: 'textarea', required: true },
      { label: 'Work Performed / Solution', type: 'textarea', required: true },
      { label: 'Labor Hours', type: 'number', required: true, note: 'Increments of 0.25 (e.g., 1.5, 2.25)' },
      { label: 'Parts Used', type: 'table', required: false, note: 'Name, Quantity, Cost per part' },
      { label: 'Equipment Photos & Videos', type: 'file', required: false, note: 'Camera/gallery/video support' },
      { label: '--- FINAL SECTION ---', type: 'section' },
      { label: 'Additional Notes / Recommendations', type: 'textarea', required: false },
      { label: 'Technician Signature', type: 'text', required: true, note: 'Type full name to sign' },
      { label: 'Service Summary', type: 'summary', note: 'Auto-calculated: total hours, parts cost, equipment count' },
    ],
  },
  {
    id: 'cf105',
    name: 'CF105 - Quality Control',
    description: 'Quality control and evaluation form for coffee equipment parameters',
    category: 'Quality Control',
    fields: [
      { label: 'Account Name', type: 'text', required: true },
      { label: 'Street Address', type: 'text', required: true },
      { label: 'Street Address Line 2', type: 'text', required: false },
      { label: '--- MORE FIELDS ---', type: 'section', note: 'Additional CF105 fields to be reviewed' },
    ],
  },
];

export default function FormReference() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Form Reference</h1>
        <p className="text-gray-600 mt-1">
          View available forms and their fields (read-only reference)
        </p>
        <div className="mt-2 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <strong>Note:</strong> This is a reference guide only. Forms are hardcoded for reliability.
          To modify forms, contact technical support.
        </div>
      </div>

      {/* Forms List */}
      <div className="space-y-6">
        {FORMS_REFERENCE.map((form) => (
          <Card key={form.id}>
            <div className="p-6">
              {/* Form Header */}
              <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{form.name}</h2>
                    <p className="text-sm text-gray-600 mt-1">{form.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                        {form.category}
                      </span>
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                        {form.fields.length} fields
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
                        <CheckCircle2 className="w-3 h-3" />
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fields List */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Form Fields</h3>
                <div className="space-y-2">
                  {form.fields.map((field, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-3 p-3 rounded-lg ${
                        field.type === 'section'
                          ? 'bg-gray-100 border-l-4 border-gray-400'
                          : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-white rounded text-xs font-medium text-gray-600 border border-gray-200">
                        {field.type === 'section' ? '━' : index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-medium ${field.type === 'section' ? 'text-gray-700' : 'text-gray-900'}`}>
                            {field.label}
                          </span>
                          {field.required && (
                            <span className="text-xs text-red-600 font-medium">REQUIRED</span>
                          )}
                          <span className="inline-block px-2 py-0.5 text-xs font-mono bg-white border border-gray-300 text-gray-700 rounded">
                            {field.type}
                          </span>
                        </div>
                        {field.note && (
                          <p className="text-xs text-gray-600 mt-1">ℹ️ {field.note}</p>
                        )}
                        {field.options && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {field.options.map((opt, idx) => (
                              <span key={idx} className="inline-block px-2 py-0.5 text-xs bg-white border border-blue-200 text-blue-700 rounded">
                                {opt}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
