import { CROPS } from '../../data/crops';
import type { CropId } from '../../types/farm';
import OptionCard from './OptionCard';

interface CropStepProps {
  value: CropId | null;
  onChange: (cropId: CropId) => void;
}

export default function CropStep({ value, onChange }: CropStepProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {CROPS.map((crop) => (
        <OptionCard
          key={crop.id}
          title={crop.name}
          description={crop.description}
          imageUrl={crop.imageUrl}
          selected={value === crop.id}
          onSelect={() => onChange(crop.id)}
        />
      ))}
    </div>
  );
}
