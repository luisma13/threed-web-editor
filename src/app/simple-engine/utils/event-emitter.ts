/**
 * Type for event listener functions
 */
type Listener<T> = (data: T) => void;

/**
 * Simple event emitter class that is framework independent
 */
export class SimpleEventEmitter<T> {
    private listeners: Listener<T>[] = [];

    /**
     * Subscribe to events
     * @param listener Function to call when event is emitted
     * @returns Function to unsubscribe
     */
    subscribe(listener: Listener<T>): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /**
     * Emit an event to all subscribers
     * @param data Data to emit
     */
    emit(data: T): void {
        this.listeners.forEach(listener => listener(data));
    }

    /**
     * Remove all listeners
     */
    clear(): void {
        this.listeners = [];
    }
} 