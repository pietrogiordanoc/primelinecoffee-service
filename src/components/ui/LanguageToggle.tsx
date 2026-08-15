import { useTranslation } from 'react-i18next';

export default function LanguageToggle() {
  const { i18n } = useTranslation();

  const currentLang = i18n.language;

  const toggleLanguage = () => {
    const newLang = currentLang === 'en' ? 'es' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition text-xs font-medium"
      title={currentLang === 'en' ? 'Cambiar a Español' : 'Switch to English'}
    >
      <span className="text-lg">{currentLang === 'en' ? '🇺🇸' : '🇪🇸'}</span>
      <span className="hidden sm:inline text-gray-700">
        {currentLang === 'en' ? 'EN' : 'ES'}
      </span>
    </button>
  );
}
