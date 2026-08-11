import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { ServiceReport } from '@/types';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 9,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottom: 2,
    borderBottomColor: '#003f7f',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  logo: {
    width: 130,
    height: 130,
    objectFit: 'contain',
    marginRight: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#003f7f',
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 9,
    color: '#6b7280',
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 6,
    paddingBottom: 3,
    borderBottom: 1,
    borderBottomColor: '#e5e7eb',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  twoColumnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  column: {
    width: '48%',
  },
  label: {
    fontSize: 8,
    color: '#6b7280',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  value: {
    fontSize: 9,
    color: '#1f2937',
    marginBottom: 3,
  },
  valueStrong: {
    fontSize: 10,
    color: '#1f2937',
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#f9fafb',
    padding: 8,
    borderRadius: 4,
    borderLeft: 3,
    borderLeftColor: '#003f7f',
    marginBottom: 8,
  },
  equipmentBox: {
    backgroundColor: '#f9fafb',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  equipmentTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: 0.5,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 4,
  },
  tableLabel: {
    width: '35%',
    fontSize: 8,
    color: '#374151',
    fontWeight: 'bold',
  },
  tableValue: {
    width: '65%',
    fontSize: 9,
    color: '#1f2937',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 7,
    color: '#9ca3af',
    paddingTop: 6,
    borderTop: 0.5,
    borderTopColor: '#e5e7eb',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  photoItem: {
    width: '48%',
    marginBottom: 10,
  },
  photoThumb: {
    width: '100%',
    height: 120,
    objectFit: 'cover',
    borderRadius: 3,
    border: 0.5,
    borderColor: '#d1d5db',
  },
  photoCaption: {
    fontSize: 7,
    color: '#6b7280',
    marginTop: 2,
    textAlign: 'center',
  },
  badge: {
    backgroundColor: '#003f7f',
    color: '#ffffff',
    fontSize: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
    alignSelf: 'flex-start',
  },
});

interface ReportPDFProps {
  report: ServiceReport;
}

export default function ReportPDF({ report }: ReportPDFProps) {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image 
            src="https://primelinecoffee-service.netlify.app/logo.png" 
            style={styles.logo}
          />
          <View style={styles.headerRight}>
            <Text style={styles.title}>Service Report</Text>
            <Text style={styles.subtitle}>{report.form?.name}</Text>
            <Text style={styles.subtitle}>Report Code: {report.report_code || 'N/A'}</Text>
          </View>
        </View>

        {/* Report Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report Overview</Text>
          
          <View style={styles.twoColumnRow}>
            {/* Left Column */}
            <View style={styles.column}>
              <View style={styles.infoBox}>
                <View style={styles.row}>
                  <Text style={styles.label}>Company</Text>
                </View>
                <Text style={styles.valueStrong}>{report.company?.name}</Text>
                
                {report.company?.address && (
                  <>
                    <View style={styles.row}>
                      <Text style={styles.label}>Address</Text>
                    </View>
                    <Text style={styles.value}>
                      {report.company.address}
                      {report.company.city && `, ${report.company.city}`}
                      {report.company.state && `, ${report.company.state}`}
                    </Text>
                  </>
                )}
              </View>
            </View>

            {/* Right Column */}
            <View style={styles.column}>
              <View style={styles.infoBox}>
                <View style={styles.row}>
                  <Text style={styles.label}>Technician</Text>
                </View>
                <Text style={styles.valueStrong}>
                  {report.technician?.user?.full_name || 'N/A'}
                </Text>
                
                {report.sales_representative && (
                  <>
                    <View style={styles.row}>
                      <Text style={styles.label}>Sales Rep</Text>
                    </View>
                    <Text style={styles.valueStrong}>
                      {report.sales_representative.full_name}
                    </Text>
                  </>
                )}
                
                <View style={styles.row}>
                  <Text style={styles.label}>Submitted</Text>
                </View>
                <Text style={styles.value}>
                  {report.submitted_at 
                    ? new Date(report.submitted_at).toLocaleString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Not submitted yet'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Company Contact Info */}
        {(report.company?.contact_name || report.company?.contact_email || report.company?.contact_phone) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Contact Name:</Text>
              <Text style={styles.tableValue}>{report.company.contact_name || 'N/A'}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Email:</Text>
              <Text style={styles.tableValue}>{report.company.contact_email || 'N/A'}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Phone:</Text>
              <Text style={styles.tableValue}>{report.company.contact_phone || 'N/A'}</Text>
            </View>
          </View>
        )}

        {/* Service Details */}
        {report.form_data && Object.keys(report.form_data).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Details</Text>
            {Object.entries(report.form_data)
              .filter(([key]) => 
                key !== 'equipmentRecords' && 
                key !== 'summary' && 
                key !== 'technicianLocalTime' &&
                key !== 'technicianTimeZone'
              )
              .map(([key, value]) => (
                <View key={key} style={styles.tableRow}>
                  <Text style={styles.tableLabel}>{key}:</Text>
                  <Text style={styles.tableValue}>
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </Text>
                </View>
              ))}
          </View>
        )}

        {/* Equipment Records */}
        {report.form_data?.equipmentRecords && Array.isArray(report.form_data.equipmentRecords) && 
          (report.form_data.equipmentRecords as any[]).map((equipment, index) => (
            <View key={index} style={styles.section} wrap={false}>
              <Text style={styles.sectionTitle}>Equipment #{index + 1}</Text>
              <View style={styles.equipmentBox}>
                {equipment.brand && (
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Brand:</Text>
                    <Text style={styles.tableValue}>{equipment.brand}</Text>
                  </View>
                )}
                {equipment.model && (
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Model:</Text>
                    <Text style={styles.tableValue}>{equipment.model}</Text>
                  </View>
                )}
                {equipment.serial && (
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Serial Number:</Text>
                    <Text style={styles.tableValue}>{equipment.serial}</Text>
                  </View>
                )}
                {equipment.hours !== undefined && equipment.hours !== null && (
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Labor Hours:</Text>
                    <Text style={styles.tableValue}>{equipment.hours} {equipment.hours === 1 ? 'hour' : 'hours'}</Text>
                  </View>
                )}
                {equipment.problem && (
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Problem/Issue:</Text>
                    <Text style={styles.tableValue}>{equipment.problem}</Text>
                  </View>
                )}
                {equipment.work_performed && (
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Work Performed:</Text>
                    <Text style={styles.tableValue}>{equipment.work_performed}</Text>
                  </View>
                )}
                {equipment.parts_used && Array.isArray(equipment.parts_used) && equipment.parts_used.length > 0 && (
                  <>
                    <View style={styles.tableRow}>
                      <Text style={styles.tableLabel}>Parts Used:</Text>
                    </View>
                    {equipment.parts_used.map((part: any, partIndex: number) => (
                      <View key={partIndex} style={styles.tableRow}>
                        <Text style={styles.tableLabel}></Text>
                        <Text style={styles.tableValue}>
                          {part.name} x{part.quantity} - ${part.cost}
                        </Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
            </View>
          ))}

        {/* Photos with Thumbnails */}
        {report.photos && report.photos.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Photos ({report.photos.length})</Text>
            <View style={styles.photoGrid}>
              {report.photos.map((photo, index) => (
                <View key={photo.id || index} style={styles.photoItem}>
                  <Image 
                    src={photo.file_url}
                    style={styles.photoThumb}
                  />
                  <Text style={styles.photoCaption}>Photo {index + 1}</Text>
                </View>
              ))}
            </View>
            {report.photos.length > 6 && (
              <Text style={styles.value}>
                View all {report.photos.length} photos in the online report
              </Text>
            )}
          </View>
        )}

        {/* Notes */}
        {report.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Notes</Text>
            <Text style={styles.value}>{report.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Prime Line Coffee Service • Technical Service Report</Text>
          <Text>Generated on {currentDate}</Text>
        </View>
      </Page>
    </Document>
  );
}
