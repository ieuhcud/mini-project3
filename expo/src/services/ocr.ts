import { Platform } from 'react-native';

export async function recognizeReceipt(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    throw new Error('OCR ML Kit chạy trên Android/iOS; bản web vẫn cho nhập giao dịch thủ công.');
  }
  const { recognizeText } = await import('expo-mlkit-ocr');
  return (await recognizeText(uri)).text;
}
