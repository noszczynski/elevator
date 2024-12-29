export class ElevatorDoors {
  private doorStatus: 'open' | 'closed' | 'pending';
  private readonly doorDelay: number = 1500; // Time for doors to open/close
  private isProcessing: boolean = false;

  constructor() {
    this.doorStatus = 'closed';
  }

  getStatus(): 'open' | 'closed' | 'pending' {
    return this.doorStatus;
  }

  async open(): Promise<void> {
    if (this.doorStatus === 'open' || this.doorStatus === 'pending' || this.isProcessing) return;
    
    this.isProcessing = true;
    this.doorStatus = 'pending';
    await new Promise(resolve => setTimeout(resolve, this.doorDelay));
    this.doorStatus = 'open';
    this.isProcessing = false;
  }

  async close(): Promise<void> {
    if (this.doorStatus === 'closed' || this.doorStatus === 'pending' || this.isProcessing) return;
    
    this.isProcessing = true;
    this.doorStatus = 'pending';
    await new Promise(resolve => setTimeout(resolve, this.doorDelay));
    this.doorStatus = 'closed';
    this.isProcessing = false;
  }
} 