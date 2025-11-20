import ContentSection from '@/components/layout/ContentSection/ContentSection';

import styles from './PersonalityContent.module.css';
import Button from '@/components/Button/Button';
import Select from '@/components/Select/Select';
import Textarea from '@/components/Textarea/Textarea';
import { useEffect, useState } from 'react';
import {
  IMAGE,
  MEANING,
  MEANING_MAP,
  PERSONALITY,
  PERSONALITY_IMAGE_MAP,
} from '@/constants/users';

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
