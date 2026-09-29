/**
 * Audio synthesis helper for simulating real hardware active buzzer acoustic output
 */
class BuzzerAudioEngine {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private isMuted: boolean = false;
  private isPlaying: boolean = false;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.isPlaying) {
      this.stop();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public play(frequency = 2700, type: OscillatorType = 'square') {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (this.isPlaying && this.osc) {
      this.osc.frequency.setTargetAtTime(frequency, this.ctx.currentTime, 0.02);
      return;
    }

    try {
      this.osc = this.ctx.createOscillator();
      this.gainNode = this.ctx.createGain();

      this.osc.type = type;
      this.osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

      // Low volume pleasant piezo buzzer simulation
      this.gainNode.gain.setValueAtTime(0.04, this.ctx.currentTime);

      this.osc.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);

      this.osc.start();
      this.isPlaying = true;
    } catch {}
  }

  public stop() {
    if (!this.isPlaying) return;
    try {
      if (this.gainNode && this.ctx) {
        this.gainNode.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
      }
      setTimeout(() => {
        if (this.osc) {
          try {
            this.osc.stop();
            this.osc.disconnect();
          } catch {}
          this.osc = null;
        }
        this.isPlaying = false;
      }, 40);
    } catch {
      this.isPlaying = false;
    }
  }
}

export const buzzerAudio = new BuzzerAudioEngine();
