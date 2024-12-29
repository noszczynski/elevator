export class ElevatorDoors {
  private doorStatus: 'open' | 'closed' | 'pending';
  private readonly doorDelay: number = 1500; // Time for doors to open/close

  constructor() {
    this.doorStatus = 'closed';
  }

  getStatus(): 'open' | 'closed' | 'pending' {
    return this.doorStatus;
  }

  async open(): Promise<void> {
    if (this.doorStatus === 'open' || this.doorStatus === 'pending') return;
    
    this.doorStatus = 'pending';
    await new Promise(resolve => setTimeout(resolve, this.doorDelay));
    this.doorStatus = 'open';
  }

  async close(): Promise<void> {
    if (this.doorStatus === 'closed' || this.doorStatus === 'pending') return;
    
    this.doorStatus = 'pending';
    await new Promise(resolve => setTimeout(resolve, this.doorDelay));
    this.doorStatus = 'closed';
  }
} 