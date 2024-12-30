  export class EventEmitter<Events extends Record<string, any[]>> {
    private listeners: {
      [K in keyof Events]?: Array<(...args: Events[K]) => void>;
    } = {};
  
    public on<K extends keyof Events>(
      eventName: K,
      listener: (...args: Events[K]) => void
    ): void {
      if (!this.listeners[eventName]) {
        this.listeners[eventName] = [];
      }
      this.listeners[eventName]!.push(listener);
    }
  
    public off<K extends keyof Events>(
      eventName: K,
      listener: (...args: Events[K]) => void
    ): void {
      const eventListeners = this.listeners[eventName];
      if (eventListeners) {
        this.listeners[eventName] = eventListeners.filter(
          (l) => l !== listener
        );
      }
    }
  
    public emit<K extends keyof Events>(eventName: K, ...args: Events[K]): void {
      const eventListeners = this.listeners[eventName];
      if (eventListeners) {
        eventListeners.forEach((listener) => {
          listener(...args);
        });
      }
    }
  }
  