import basic from '@/assets/Character-Basic.png';
import shining from '@/assets/Character-Shining.png';
import cute from '@/assets/Character-Cute.png';
import smile from '@/assets/Character-Smile.png';
import thinking from '@/assets/Character-Thinking.png';
import gloomy from '@/assets/Character-Gloomy.png';
import wrong from '@/assets/Character-Wrong.png';
import jump from '@/assets/Character-Jump.png';
import styles from './Mascot.module.css';

export type MascotImage =
  | 'basic'
  | 'shining'
  | 'cute'
  | 'smile'
  | 'thinking'
  | 'gloomy'
  | 'wrong'
  | 'jump';

type MascotProps = {
  image: MascotImage;
  text: string;
};

const IMAGE_MAP: Record<MascotImage, string> = {
  basic,
  shining,
  cute,
  smile,
  thinking,
  gloomy,
  wrong,
  jump,
};

/**
 * @example 줄바꿈은 다음과 같이 사용해주세요.
 * <Mascot text={`Hi buddy!\nWelcome to korea!`}/>
 */
function Mascot({ image, text }: MascotProps) {
  return (
    <div className={styles.container}>
      <div className={styles.message}>
        <p className={styles.text}>{text}</p>
      </div>

      <img
        className={styles.image}
        src={IMAGE_MAP[image]}
        alt="마스코트 이미지"
      />
    </div>
  );
}

export default Mascot;
