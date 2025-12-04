import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Filter } from 'lucide-react';
import { api } from '../lib/api';
import type { Equipment, EquipmentCategory } from '../types';

export function EquipmentPage() {
  const { t, i18n } = useTranslation();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getEquipmentCategories()
      .then(setCategories)
      .catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .getEquipment({
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        level: selectedLevel !== 'all' ? selectedLevel : undefined,
      })
      .then(setEquipment)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedCategory, selectedLevel]);

  const levels = [
    { id: 'all', name: t('common.all') },
    { id: 'beginner', name: t('equipment.levels.beginner') },
    { id: 'intermediate', name: t('equipment.levels.intermediate') },
    { id: 'advanced', name: t('equipment.levels.advanced') },
  ];

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-700';
      case 'intermediate':
        return 'bg-blue-100 text-blue-700';
      case 'advanced':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {t('equipment.title')}
      </h1>

      {/* Category Filter */}
      <div className="mb-4">
        <div className="flex space-x-2 overflow-x-auto hide-scrollbar pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {t('common.all')}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {i18n.language === 'ja' ? cat.name : cat.nameEn}
            </button>
          ))}
        </div>
      </div>

      {/* Level Filter */}
      <div className="mb-6">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <div className="flex space-x-2 overflow-x-auto hide-scrollbar">
            {levels.map((level) => (
              <button
                key={level.id}
                onClick={() => setSelectedLevel(level.id)}
                className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
                  selectedLevel === level.id
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {level.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Equipment List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      ) : equipment.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          該当する道具がありません
        </div>
      ) : (
        <div className="space-y-4">
          {equipment.map((item) => (
            <div key={item.id} className="card overflow-hidden">
              <div className="flex">
                {item.imageUrl ? (
                  <div className="w-24 h-24 bg-gray-100 flex-shrink-0">
                    <img
                      src={item.imageUrl}
                      alt={i18n.language === 'ja' ? item.name : item.nameEn}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://via.placeholder.com/96?text=No+Image';
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-400">
                    <span className="text-xs">No Image</span>
                  </div>
                )}
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      {item.brand && (
                        <span className="text-xs text-gray-500">
                          {item.brand}
                        </span>
                      )}
                      <h3 className="font-semibold text-gray-900">
                        {i18n.language === 'ja' ? item.name : item.nameEn}
                      </h3>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${getLevelColor(
                        item.level
                      )}`}
                    >
                      {t(`equipment.levels.${item.level}`)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                    {i18n.language === 'ja'
                      ? item.description
                      : item.descriptionEn}
                  </p>
                  <div className="flex items-center justify-between">
                    {item.priceRange && (
                      <span className="text-sm font-medium text-primary-600">
                        {item.priceRange}
                      </span>
                    )}
                    {item.purchaseLink && (
                      <a
                        href={item.purchaseLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary-600 flex items-center hover:underline"
                      >
                        {t('equipment.buyNow')}
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
