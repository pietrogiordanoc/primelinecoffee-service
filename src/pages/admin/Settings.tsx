import Card from '@/components/ui/Card';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Configure system options</p>
      </div>

      <Card>
        <div className="p-6">
          <p className="text-gray-500 text-center py-12">
            Settings module under development
          </p>
        </div>
      </Card>
    </div>
  );
}
