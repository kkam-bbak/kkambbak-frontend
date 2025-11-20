import ContentSection from '@/components/layout/ContentSection/ContentSection';

import styles from './PersonalityContent.module.css';
import Button from '@/components/Button/Button';
import Select from '@/components/Select/Select';
import Textarea from '@/components/Textarea/Textarea';
import { useEffect, useState } from 'react';

const PERSONALITY = ['Energetic', 'Calm', 'Kind', 'Gentle', 'Cheerful'];
const IMAGE = ['Cute', 'Cool', 'Soft', 'Elegant', 'Natural'];
const MEANING = [
  'Light / Radiance',
  'Flower / Bloom',
  'Wisdom',
  'Strength / Will',
  'Peace / Calm',
  'Love / Affection',
  'Hope',
  'Dream',
  'Courage',
  'Harmony / Balance',
];

export const PERSONALITY_IMAGE_MAP: Record<string, Record<string, string>> = {
  Energetic: {
    Cute: 'I’m full of bright energy with a playful, charming vibe.',
    Cool: 'I’m energetic yet composed, leaving a confident and stylish impression.',
    Soft: 'I bring lively energy but always keep a gentle tone.',
    Elegant: 'My enthusiasm shines with refined elegance.',
    Natural:
      'I’m lively and expressive, but my energy feels effortlessly natural.',
  },
  Calm: {
    Cute: 'I’m calm and relaxed, with a soft, adorable charm.',
    Cool: 'My quiet confidence gives off a calm yet cool aura.',
    Soft: 'I have a peaceful heart and a voice as soft as a breeze.',
    Elegant: 'My calmness carries a graceful and elegant touch.',
    Natural: 'I stay true to myself, calm and naturally composed.',
  },
  Kind: {
    Cute: 'I’m kind and warm, with a sweet and friendly smile.',
    Cool: 'I show kindness with quiet strength and cool confidence.',
    Soft: 'I express warmth through gentle words and a soft tone.',
    Elegant: 'My kindness flows naturally with poise and elegance.',
    Natural: 'I’m kind and sincere, always keeping things natural.',
  },
  Gentle: {
    Cute: 'I speak softly and smile often, giving off a tender, cute feeling.',
    Cool: 'My gentle nature is balanced by calm, cool composure.',
    Soft: 'I have a soothing presence and a soft, caring voice.',
    Elegant: 'I carry myself with quiet gentleness and timeless elegance.',
    Natural: 'My gentle manner feels effortless and real.',
  },
  Cheerful: {
    Cute: 'I’m bubbly and cheerful, spreading joy wherever I go.',
    Cool: 'I’m upbeat and confident, brightening the mood with cool charm.',
    Soft: 'My cheerful heart shines through in a warm, soft way.',
    Elegant: 'I’m cheerful and positive, but always with a graceful air.',
    Natural: 'My joy is genuine — cheerful, easygoing, and natural.',
  },
};

export const MEANING_MAP: Record<string, string> = {
  'Light / Radiance':
    'My name means to shine brightly like light and bring warmth to others.',
  'Flower / Bloom':
    'My name means to bloom beautifully and share joy with the world.',
  Wisdom:
    'My name means to see clearly, think deeply, and guide others with wisdom.',
  'Strength / Will':
    'My name means to stand firm with strength and never give up.',
  'Peace / Calm': 'My name means to bring peace and calm to hearts around me.',
  'Love / Affection':
    'My name means to fill the world with love and gentle affection.',
  Hope: 'My name means to keep shining with hope, even in the darkest times.',
  Dream: 'My name means to dream endlessly and inspire others to believe.',
  Courage:
    'My name means to face challenges bravely and move forward with courage.',
  'Harmony / Balance':
    'My name means to create harmony and balance wherever I go.',
};

const DIRECT = 'direct';

function PersonalityContent() {
  const [personality, setPersonality] = useState('');
  const [image, setImage] = useState('');
  const [meaning, setMeaning] = useState('');
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');

  const handlePersonalityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    if (value === 'direct') {
      setImage('direct');
    }
    setPersonality(value);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    if (value === DIRECT) {
      setPersonality(DIRECT);
    }
    setImage(value);
  };

  const handleTopTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (personality === DIRECT && image === DIRECT) {
      setTopText(e.target.value);
    }
  };

  const handleBottomTextChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    if (meaning === DIRECT) {
      setBottomText(e.target.value);
    }
  };

  useEffect(() => {
    if (personality && image) {
      const result = PERSONALITY_IMAGE_MAP[personality]?.[image] ?? '';
      setTopText(result);
    }
  }, [personality, image]);

  useEffect(() => {
    if (meaning) {
      const result = MEANING_MAP[meaning] ?? '';
      setBottomText(result);
    }
  }, [meaning]);

  return (
    <ContentSection className={styles.section} color="blue">
      <div className={styles.container}>
        <div className={styles.info}>
          <div className={styles.area}>
            <span className={styles.title}>Personality or image *</span>
            <div className={styles.options}>
              <Select
                id="personality"
                isFull
                value={personality}
                onChange={handlePersonalityChange}
              >
                <option value="" disabled hidden>
                  Personality type
                </option>
                <option value={DIRECT}>Direct input</option>
                {PERSONALITY.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </Select>

              <Select
                id="image"
                isFull
                value={image}
                onChange={handleImageChange}
              >
                <option value="" disabled hidden>
                  Image type
                </option>
                <option value={DIRECT}>Direct input</option>
                {IMAGE.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </Select>
            </div>
            <Textarea
              placeholder="Enter Your Personality of image"
              value={topText}
              onChange={handleTopTextChange}
            />
          </div>

          <div className={styles.area}>
            <span className={styles.title}>Meaning of your name *</span>
            <div>
              <Select
                id="meaning"
                value={meaning}
                onChange={(e) => setMeaning(e.target.value)}
              >
                <option value="" disabled hidden>
                  Meaning type
                </option>
                <option value={DIRECT}>Direct input</option>
                {MEANING.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </Select>
            </div>
            <Textarea
              placeholder="Enter your meaning of your name"
              value={bottomText}
              onChange={handleBottomTextChange}
            />
          </div>
        </div>

        <Button>Next</Button>
      </div>
    </ContentSection>
  );
}

export default PersonalityContent;
