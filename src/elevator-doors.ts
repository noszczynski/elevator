import { ElevatorStatus } from "./store/elevator/states";

export class ElevatorDoors {
  private doorStatus: ElevatorStatus;
  private readonly doorDelay: number = 3000;
  private isProcessing: boolean = false;

  constructor() {
    this.doorStatus = ElevatorStatus.Idle;
  }

  getStatus(): string {
    switch (this.doorStatus) {
        case ElevatorStatus.DoorOpen:
            return 'open';
        case ElevatorStatus.DoorOpening:
        case ElevatorStatus.DoorClosing:
            return 'pending';
        case ElevatorStatus.Idle:
        case ElevatorStatus.Moving:
        case ElevatorStatus.MovingDown:
        default:
            return 'closed';
    }
  }

  async open(): Promise<void> {
    if (this.doorStatus === ElevatorStatus.DoorOpen || 
        this.doorStatus === ElevatorStatus.DoorOpening || 
        this.isProcessing) return;
    
    this.isProcessing = true;
    this.doorStatus = ElevatorStatus.DoorOpening;
  }

  async confirmOpen(): Promise<void> {
    this.doorStatus = ElevatorStatus.DoorOpen;
    this.isProcessing = false;
  }

  async close(): Promise<void> {
    if (this.doorStatus === ElevatorStatus.Idle || 
        this.doorStatus === ElevatorStatus.DoorClosing || 
        this.isProcessing) return;
    
    this.isProcessing = true;
    this.doorStatus = ElevatorStatus.DoorClosing;
  }

  async confirmClose(): Promise<void> {
    this.doorStatus = ElevatorStatus.Idle;
    this.isProcessing = false;
  }
} 
