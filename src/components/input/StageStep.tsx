import { getCrop } from '../../data/crops';
import type { CropId } from '../../types/farm';
import OptionCard from './OptionCard';

interface StageStepProps {
  cropId: CropId;
  value: string | null;
  onChange: (stageId: string) => void;
}

export default function StageStep({ cropId, value, onChange }: StageStepProps) {
  const crop = getCrop(cropId);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {crop.stages.map((stage) => (
        <OptionCard
          key={stage.id}
          title={stage.label}
          description={stage.description}
          imageUrl={stage.imageUrl}
          selected={value === stage.id}
          onSelect={() => onChange(stage.id)}
        />
      ))}
    </div>
  );
}
