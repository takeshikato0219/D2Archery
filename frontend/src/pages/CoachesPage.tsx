import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { api, getAssetUrl } from '../lib/api';
import type { Coach } from '../types';

export function CoachesPage() {
  const { t, i18n } = useTranslation();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getCoaches()
      .then(setCoaches)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {t('coaches.title')}
      </h1>
      <p className="text-gray-500 mb-6">{t('coaches.selectCoach')}</p>

      <div className="space-y-4">
        {coaches.map((coach) => (
          <Link
            key={coach.id}
            to={`/coaches/${coach.id}`}
            className="card p-4 flex items-start hover:shadow-soft transition-shadow block"
          >
            {getAssetUrl(coach.avatarUrl) ? (
              <img
                src={getAssetUrl(coach.avatarUrl)!}
                alt={i18n.language === 'ja' ? coach.name : coach.nameEn}
                className="w-14 h-14 rounded-full flex-shrink-0 object-cover mr-4"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xl font-bold mr-4"
                style={{ backgroundColor: coach.color }}
              >
                {(i18n.language === 'ja' ? coach.name : coach.nameEn).charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900">
                {i18n.language === 'ja' ? coach.name : coach.nameEn}
              </h3>
              <p className="text-sm text-primary-600 mb-1">
                {t('coaches.specialty')}: {i18n.language === 'ja' ? coach.specialty : coach.specialtyEn}
              </p>
              <p className="text-sm text-gray-500 line-clamp-2">
                {i18n.language === 'ja' ? coach.personality : coach.personalityEn}
              </p>
            </div>
            <MessageCircle className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
          </Link>
        ))}
      </div>
    </div>
  );
}
