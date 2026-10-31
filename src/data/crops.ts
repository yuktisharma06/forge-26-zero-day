import type { CropDefinition, CropId } from '../types/farm';

export const CROPS: CropDefinition[] = [
  {
    id: 'sugarcane',
    name: { hi: 'गन्ना', en: 'Sugarcane' },
    description: { hi: 'सहारनपुर की मुख्य नकदी फसल', en: 'A main cash crop in Saharanpur' },
    imageUrl: 'https://images.pexels.com/photos/36976806/pexels-photo-36976806.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    stages: [
      {
        id: 'germination',
        label: { hi: 'अंकुरण', en: 'Germination' },
        description: { hi: 'बुवाई के बाद नए पौधे निकलना', en: 'New shoots emerging after sowing' },
        imageUrl: 'https://images.pexels.com/photos/11678841/pexels-photo-11678841.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      },
      {
        id: 'tillering',
        label: { hi: 'कल्ले निकलना', en: 'Tillering' },
        description: { hi: 'पौधे से नए तने (कल्ले) बनना', en: 'New side shoots forming from the plant' },
        imageUrl: 'https://images.pexels.com/photos/771319/pexels-photo-771319.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      },
      {
        id: 'grand_growth',
        label: { hi: 'तेज़ बढ़वार', en: 'Grand Growth' },
        description: { hi: 'गन्ना तेज़ी से लंबा और मोटा होना', en: 'Cane growing fast in length and thickness' },
        imageUrl: 'https://images.pexels.com/photos/36976807/pexels-photo-36976807.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      },
      {
        id: 'maturity',
        label: { hi: 'पकना', en: 'Maturity / Ripening' },
        description: { hi: 'गन्ना पकने और कटाई की ओर बढ़ना', en: 'Cane ripening towards harvest' },
        imageUrl: 'https://images.pexels.com/photos/9622985/pexels-photo-9622985.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      },
    ],
  },
  {
    id: 'wheat',
    name: { hi: 'गेहूं', en: 'Wheat' },
    description: { hi: 'सर्दी की मुख्य फसल', en: 'The main winter crop' },
    imageUrl: 'https://images.pexels.com/photos/7891849/pexels-photo-7891849.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    stages: [
      {
        id: 'early_growth',
        label: { hi: 'शुरुआती बढ़वार', en: 'Early Growth' },
        description: { hi: 'अंकुरण और छोटे पौधे निकलना', en: 'Emergence and seedling stage' },
        imageUrl: 'https://images.pexels.com/photos/11678841/pexels-photo-11678841.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      },
      {
        id: 'crown_root',
        label: { hi: 'जड़ विकास (CRI)', en: 'Crown Root (CRI)' },
        description: { hi: 'जड़ों का मज़बूत होना', en: 'Crown roots developing' },
        imageUrl: 'https://images.pexels.com/photos/771319/pexels-photo-771319.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      },
      {
        id: 'vegetative',
        label: { hi: 'कल्ले निकलना', en: 'Vegetative (Tillering)' },
        description: { hi: 'पौधे में कल्ले और पत्तियां बढ़ना', en: 'More shoots and leaves forming' },
        imageUrl: 'https://images.pexels.com/photos/12150151/pexels-photo-12150151.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      },
      {
        id: 'reproductive',
        label: { hi: 'बालियां और फूल', en: 'Booting & Flowering' },
        description: { hi: 'बाली निकलना और फूल आना', en: 'Ear emerging and flowering' },
        imageUrl: 'https://images.pexels.com/photos/11288849/pexels-photo-11288849.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      },
      {
        id: 'grain_development',
        label: { hi: 'दाना भरना / पकना', en: 'Grain Filling / Maturity' },
        description: { hi: 'दाने बनना और फसल पकना', en: 'Grains filling and the crop maturing' },
        imageUrl: 'https://images.pexels.com/photos/33397323/pexels-photo-33397323.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      },
    ],
  },
];

export function getCrop(cropId: CropId): CropDefinition {
  const crop = CROPS.find((item) => item.id === cropId);
  if (!crop) {
    throw new Error(`Unknown crop: ${cropId}`);
  }
  return crop;
}

export function getStage(cropId: CropId, stageId: string) {
  return getCrop(cropId).stages.find((stage) => stage.id === stageId) ?? null;
}
