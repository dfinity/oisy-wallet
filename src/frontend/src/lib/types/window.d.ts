interface Window {
  sa_event: (eventName: string, metadata?: Record<string, unknown>, callback?: () => void) => void;
}