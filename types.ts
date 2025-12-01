export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface AudioVolumeState {
  inputVolume: number;
  outputVolume: number;
}

export interface TranscriptionMessage {
  id: string;
  text: string;
  sender: 'user' | 'model';
  timestamp: number;
}