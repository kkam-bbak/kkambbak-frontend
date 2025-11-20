import { Profile } from '@/stores/user';
import { http } from './http';

export async function getProfile(): Promise<Profile> {
  const response = await http.get('/users/profile');

  return response.data.body;
}

export type RegisterProfileInfo = {
  name: string;
  gender: string;
  country: string;
  profileImageFile?: File;
};

export async function registerProfile(info: RegisterProfileInfo) {
  const { country, gender, name, profileImageFile } = info;
  let imageURL: string | undefined;

  if (profileImageFile) {
    imageURL = await uploadImage(profileImageFile);
  }

  type Data = {
    name: string;
    gender: string;
    countryOfOrigin: string;
    profileImage?: string;
  };
  let data: Data = {
    name: name.trim(),
    gender,
    countryOfOrigin: country,
  };

  if (imageURL) {
    data = { ...data, profileImage: imageURL };
  }

  const response = await http.patch('/users/register', data);

  return response;
}

export async function uploadImage(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const uploadResponse = await http.post('/upload/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  const imageURL = uploadResponse.data?.body?.url;

  if (!imageURL) {
    throw new Error('Failed to get image URL from upload');
  }

  return imageURL;
}

type PersonalityInfo = {
  topText: string;
  bottomText: string;
};
export async function registerPersonality(info: PersonalityInfo) {
  const { topText, bottomText } = info;
  const data = {
    personalityOrImage: topText.trim(),
    preferredNameMeaning: bottomText.trim(),
  };
  const response = await http.post('/users/register-korean', data);

  return response;
}

type ResponseGenerateName = {
  historyId: number;
  remainingAttempts: number;
  generationOutput: {
    names: Array<{
      koreanName: string;
      romanization: string;
      poeticMeaning: string;
    }>;
  };
};

export async function generateName(): Promise<ResponseGenerateName> {
  // const response = await http.post('/name/generate');

  // return response.data.body;
  return {
    historyId: 1,
    remainingAttempts: 2,
    generationOutput: {
      names: [
        {
          koreanName: '이빛찬',
          romanization: 'Lee Bit Chan',
          poeticMeaning:
            'A bright light that radiates warmth and kindness, illuminating the hearts of those nearby ☀️',
        },
        {
          koreanName: '김상휘',
          romanization: 'Kim Sang Hwi',
          poeticMeaning:
            'A gentle flame that brings comfort and serenity, guiding others through the darkness 🔥',
        },
      ],
    },
  };
}

export type SelectedName = {
  historyId: number;
  name: string;
  meaning: string;
};
export async function createName(selected: SelectedName) {
  const { historyId, name, meaning } = selected;
  const data = { historyId, koreanName: name, meaningOfName: meaning };

  const response = await http.post('/name/select', data);

  return response;
}
