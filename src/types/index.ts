// Audio recording types
export interface AudioRecordingOptions {
  quality: 'low' | 'medium' | 'high';
  sampleRate: number;
  channels: number;
  bitRate: number;
}

export interface VUMeterData {
  level: number; // 0-1
  isActive: boolean;
}
