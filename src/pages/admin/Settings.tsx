import Card from '@/components/ui/Card';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-600 mt-1">Configura las opciones del sistema</p>
      </div>

      <Card>
        <div className="p-6">
          <p className="text-gray-500 text-center py-12">
            Módulo de configuración en desarrollo
          </p>
        </div>
      </Card>
    </div>
  );
}
