export class VoiceCommandCancellation {
  private controller: AbortController | undefined;

  public begin(): AbortSignal {
    this.cancel();
    this.controller = new AbortController();
    return this.controller.signal;
  }

  public cancel(): boolean {
    if (this.controller === undefined || this.controller.signal.aborted) return false;
    this.controller.abort();
    return true;
  }

  public complete(signal: AbortSignal): void {
    if (this.controller?.signal === signal) this.controller = undefined;
  }

  public get currentSignal(): AbortSignal | undefined {
    return this.controller?.signal;
  }
}
