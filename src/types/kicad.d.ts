interface KiCadMessageChannel {
  postMessage(message: string): void;
}

declare global {
  interface Window {
    kicad?: KiCadMessageChannel;
  }
}