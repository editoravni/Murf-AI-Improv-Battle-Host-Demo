import { GoogleGenAI, LiveSession, Modality, LiveServerMessage } from '@google/genai';
import { createPcmBlob, base64ToUint8Array, decodeAudioData } from '../utils/audioUtils';
import { ConnectionStatus } from '../types';

export class LiveClient {
  private ai: GoogleGenAI | null = null;
  private session: LiveSession | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  
  public onStatusChange: (status: ConnectionStatus) => void = () => {};
  public onVolumeChange: (input: number, output: number) => void = () => {};
  public onTranscription: (text: string, sender: 'user' | 'model', isComplete: boolean) => void = () => {};

  constructor() {
    // Client initialized in connect to ensure latest API key is used
  }

  public async connect() {
    try {
      this.onStatusChange(ConnectionStatus.CONNECTING);
      
      const apiKey = process.env.API_KEY || '';
      this.ai = new GoogleGenAI({ apiKey });

      // Initialize Audio Contexts
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      // Request Microphone Access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Connect to Gemini Live API
      const sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: `You are Ananya, a witty, high-energy Indian female improv battle judge and partner. 
          You speak with a charming, authentic Indian English accent. 
          Your goal is to engage the user in a "Voice Improv Battle". 
          
          Battle Rules:
          1. Challenge the user to improv games (e.g., "Yes, And...", "Rhyme Time", "Dramatic Bollywood Monologue").
          2. Roast them playfully if they stumble or hesitate.
          3. Rate their performance out of 10 with funny commentary.
          4. Keep the energy fast-paced, use Indian slang occasionally (like "Arre yaar", "Chalo", "Bhai"), and be dramatic.
          
          Start by introducing yourself dramatically and challenging the user to a battle immediately.`,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            this.onStatusChange(ConnectionStatus.CONNECTED);
            this.setupAudioInput(stream, sessionPromise);
          },
          onmessage: (message: LiveServerMessage) => this.handleMessage(message),
          onclose: () => {
            this.onStatusChange(ConnectionStatus.DISCONNECTED);
            this.cleanup();
          },
          onerror: (err) => {
            console.error('Session error:', err);
            this.onStatusChange(ConnectionStatus.ERROR);
            this.cleanup();
          },
        },
      });
      
      this.session = await sessionPromise;

    } catch (error) {
      console.error('Connection failed:', error);
      this.onStatusChange(ConnectionStatus.ERROR);
      this.cleanup();
    }
  }

  public async disconnect() {
    if (this.session) {
      try {
        await this.session.close();
      } catch (e) {
        console.warn("Error closing session:", e);
      }
    }
    this.cleanup();
    this.onStatusChange(ConnectionStatus.DISCONNECTED);
  }

  private setupAudioInput(stream: MediaStream, sessionPromise: Promise<LiveSession>) {
    if (!this.inputAudioContext) return;

    this.inputSource = this.inputAudioContext.createMediaStreamSource(stream);
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate input volume for visualizer
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      this.onVolumeChange(rms, 0); // We only know input volume here accurately for now

      // Send to API
      const pcmBlob = createPcmBlob(inputData);
      sessionPromise.then((session) => {
          session.sendRealtimeInput({ media: pcmBlob });
      }).catch((e) => {
          console.error("sendRealtimeInput error", e);
      });
    };

    this.inputSource.connect(this.processor);
    
    // CRITICAL FIX: Connect to a silent GainNode instead of direct destination.
    // This keeps the processor alive without creating an audio feedback loop.
    const silence = this.inputAudioContext.createGain();
    silence.gain.value = 0;
    this.processor.connect(silence);
    silence.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage) {
    // 1. Handle Audio Output
    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (base64Audio && this.outputAudioContext) {
      try {
        // Handle output volume visualization estimation (simple heuristic based on chunk presence)
        this.onVolumeChange(0, 0.5); // Pulse output volume when receiving data

        this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
        
        const audioBytes = base64ToUint8Array(base64Audio);
        const audioBuffer = await decodeAudioData(
          audioBytes,
          this.outputAudioContext,
          24000,
          1
        );

        const source = this.outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.outputAudioContext.destination);
        
        source.addEventListener('ended', () => {
          this.sources.delete(source);
          this.onVolumeChange(0, 0); // Reset output volume
        });

        source.start(this.nextStartTime);
        this.nextStartTime += audioBuffer.duration;
        this.sources.add(source);
      } catch (e) {
        console.error("Error decoding audio", e);
      }
    }

    // 2. Handle Interruption
    if (message.serverContent?.interrupted) {
      this.sources.forEach((source) => source.stop());
      this.sources.clear();
      this.nextStartTime = 0;
    }

    // 3. Handle Transcription
    const outputTranscript = message.serverContent?.outputTranscription;
    if (outputTranscript?.text) {
      this.onTranscription(outputTranscript.text, 'model', false);
    }
    
    const inputTranscript = message.serverContent?.inputTranscription;
    if (inputTranscript?.text) {
      this.onTranscription(inputTranscript.text, 'user', false);
    }

    if (message.serverContent?.turnComplete) {
      // Signal turn complete if needed by UI
      this.onTranscription('', 'model', true); 
    }
  }

  private cleanup() {
    this.inputSource?.disconnect();
    this.processor?.disconnect();
    
    if (this.inputAudioContext?.state !== 'closed') {
      this.inputAudioContext?.close();
    }
    if (this.outputAudioContext?.state !== 'closed') {
      this.outputAudioContext?.close();
    }

    this.inputAudioContext = null;
    this.outputAudioContext = null;
    this.session = null;
    this.sources.clear();
    this.nextStartTime = 0;
  }
}