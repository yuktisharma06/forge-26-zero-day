import { useEffect, useState } from 'react';
import { Pause, Volume2 } from 'lucide-react';
import { copy } from '../../i18n/copy';
import { useLanguage } from '../../i18n/LanguageContext';
import Button from './Button';

interface SpeakerButtonProps {
  text: string;
}

export default function SpeakerButton({ text }: SpeakerButtonProps) {
  const { lang, t } = useLanguage();
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  useEffect(() => {
    if (!supported) return;
    return () => window.speechSynthesis.cancel();
  }, [supported]);

  if (!supported) {
    return (
      <p className="text-sm text-neutral-600">{t(copy.listenUnavailable)}</p>
    );
  }

  function handleClick() {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  return (
    <Button
      variant="secondary"
      onClick={handleClick}
      aria-pressed={speaking}
      icon={speaking ? <Pause className="h-5 w-5" aria-hidden="true" /> : <Volume2 className="h-5 w-5" aria-hidden="true" />}
    >
      {speaking ? t(copy.stopListening) : t(copy.listen)}
    </Button>
  );
}
