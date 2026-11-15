import { cropById, crops } from '@/lib/catalog';

export type CropCategory = { id: string; icon: string; name: { 'pt-BR': string; en: string }; cropIds: string[] };

/**
 * Conversation-only presentation groups. IDs always point to the single catalog;
 * a crop belongs to one group here so a producer is never asked about it twice.
 */
const definitions: Array<Omit<CropCategory, 'cropIds'> & { cropIds: string[] }> = [
  { id: 'roots', icon: '🥔', name: { 'pt-BR': 'Tubérculos e raízes', en: 'Roots and tubers' }, cropIds: ['cassava', 'sweet_potato'] },
  { id: 'horticulture', icon: '🥬', name: { 'pt-BR': 'Verduras e hortaliças', en: 'Vegetables and horticulture' }, cropIds: ['pumpkin', 'lettuce', 'tomato', 'carrot', 'kale', 'onion', 'bell_pepper', 'okra'] },
  { id: 'fruit', icon: '🍉', name: { 'pt-BR': 'Frutas', en: 'Fruit crops' }, cropIds: ['watermelon'] },
  { id: 'grains', icon: '🌽', name: { 'pt-BR': 'Grãos e cereais', en: 'Grains and cereals' }, cropIds: ['maize', 'sorghum', 'upland_rice', 'pearl_millet'] },
  { id: 'legumes', icon: '🫘', name: { 'pt-BR': 'Leguminosas', en: 'Legumes' }, cropIds: ['soybean', 'cowpea', 'common_bean', 'peanut'] },
  { id: 'cover', icon: '🌿', name: { 'pt-BR': 'Cobertura e adubação verde', en: 'Cover and green-manure crops' }, cropIds: ['ruziziensis', 'sunn_hemp', 'pigeon_pea'] },
  { id: 'perennials', icon: '🌳', name: { 'pt-BR': 'Culturas perenes', en: 'Perennial crops' }, cropIds: ['coffee', 'banana', 'cacao', 'acai'] },
  { id: 'other-commercial', icon: '🌻', name: { 'pt-BR': 'Outras culturas comerciais', en: 'Other commercial crops' }, cropIds: ['sunflower', 'cotton'] },
];

export const cropCategories: CropCategory[] = definitions
  .map((group) => ({ ...group, cropIds: group.cropIds.filter((id) => cropById.has(id)) }))
  .filter((group) => group.cropIds.length > 0);

export const categoryById = new Map(cropCategories.map((group) => [group.id, group]));
export const categoryCrops = (categoryId: string) => (categoryById.get(categoryId)?.cropIds ?? []).map((id) => cropById.get(id)).filter((crop): crop is (typeof crops)[number] => Boolean(crop));
export const cropCategoryIds = (ids: string[]) => [...new Set(ids)].filter((id) => categoryById.has(id));
