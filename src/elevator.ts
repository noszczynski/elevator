import { ElevatorDoors } from './elevator-doors';
import { ElevatorStatus } from './store/elevator/states';

// Define action types
const OPEN_DOOR = 'OPEN_DOOR';
const CLOSE_DOOR = 'CLOSE_DOOR';
const MOVE_TO_FLOOR = 'MOVE_TO_FLOOR';
const WAIT_ON_FLOOR = 'WAIT_ON_FLOOR';

// Define action interfaces
interface OpenDoorAction {
  type: typeof OPEN_DOOR;
  source: 'button' | 'arrival';
}

interface CloseDoorAction {
  type: typeof CLOSE_DOOR;
  source: 'button' | 'arrival';
}

interface MoveToFloorAction {
  type: typeof MOVE_TO_FLOOR;
  floor: number;
  source: 'button';
}

interface WaitOnFloorAction {
  type: typeof WAIT_ON_FLOOR;
  duration: number;  // Duration in milliseconds
}

// Union type for all actions
type ElevatorAction = OpenDoorAction | CloseDoorAction | MoveToFloorAction | WaitOnFloorAction;

// Action creators
const openDoor = (source: 'button' | 'arrival'): OpenDoorAction => ({
  type: OPEN_DOOR,
  source,
});

const closeDoor = (source: 'button' | 'arrival'): CloseDoorAction => ({
  type: CLOSE_DOOR,
  source,
});

const moveToFloor = (floor: number, source: 'button'): MoveToFloorAction => ({
  type: MOVE_TO_FLOOR,
  floor,
  source,
});

const waitOnFloor = (duration: number = 5000): WaitOnFloorAction => ({
  type: WAIT_ON_FLOOR,
  duration,
});

// Types and interfaces
interface ElevatorState {
    currentFloor: number;
    queue: ElevatorAction[];
    status: ElevatorStatus;
}

export class Elevator {
    private state: ElevatorState;
    private doors: ElevatorDoors;
    private readonly totalFloors: number;
    
    constructor({ floors }: { floors: number }) {
      this.totalFloors = floors;
      this.doors = new ElevatorDoors();
      this.state = { currentFloor: 1, queue: [], status: ElevatorStatus.Idle };
      
      this.initialize();
    }
  
    private initialize(): void {
      const appElement = document.getElementById('app');
      if (!appElement) throw new Error('App element not found');
  
      appElement.innerHTML = `
        <div class="elevator-system">
          <!-- Column 1: Elevator -->
          <div class="elevator-column">
            <h2>Elevator</h2>
            <div class="elevator-shaft">
              <div class="elevator-car" data-floor="${this.state.currentFloor}">
                <div class="floor-display">${this.state.currentFloor}</div>
                <img 
                  class="elevator-image" 
                  src="/elevator/elevator-${this.doors.getStatus()}.svg" 
                  alt="Elevator ${this.doors.getStatus()}"
                />
              </div>
            </div>
            <div class="elevator-controls">
              <button class="door-control" data-action="open">Open Door</button>
              <button class="door-control" data-action="close">Close Door</button>
            </div>
          </div>

          <!-- Column 2: Controls -->
          <div class="controls-column">
            <h2>Controls</h2>
            <div class="floor-buttons">
              ${this.createFloorButtons()}
            </div>
            <div class="status">
              <div class="door-status">Doors: ${this.doors.getStatus()}</div>
              <div class="movement-status">Status: ${this.state.status}</div>
            </div>
          </div>

          <!-- Column 3: Queue -->
          <div class="state-column">
            <h2>Event Queue</h2>
            <div class="queue-panel">
              <div class="queue-status">${this.formatQueueStatus()}</div>
            </div>
          </div>
        </div>
      `;
  
      this.attachEventListeners();
    }
  
    private createFloorButtons(): string {
      return Array.from({ length: this.totalFloors }, (_, i) => i + 1)
        .map(floor => `
          <button class="floor-button" data-floor="${floor}">
            Floor ${floor}
          </button>
        `).join('');
    }
  
    private attachEventListeners(): void {
      document.querySelectorAll('.floor-button').forEach(button => {
        button.addEventListener('click', (e) => {
          const floor = Number((e.target as HTMLElement).dataset.floor);
          this.requestFloor(floor);
        });
      });
  
      document.querySelectorAll('.door-control').forEach(button => {
        button.addEventListener('click', (e) => {
          const action = (e.target as HTMLElement).dataset.action as 'open' | 'close';
          if (action === 'open' && this.state.status !== ElevatorStatus.DoorOpen) {
            this.state.queue.push(openDoor('button'));
            this.updateUI();
            this.processQueue();
          }
          if (action === 'close') {
            this.state.queue.push(closeDoor('button'));
            this.updateUI();
            this.processQueue();
          }
        });
      });
    }
  
    private async requestFloor(floor: number): Promise<void> {
      if (floor === this.state.currentFloor || 
          this.state.status === ElevatorStatus.Moving || 
          this.state.status === ElevatorStatus.MovingDown) return;

      const hasFloorDestinations = this.state.queue.some(event => event.type === MOVE_TO_FLOOR);
      if (hasFloorDestinations) return;

      const newEvents: ElevatorAction[] = [];

      if (this.state.status === ElevatorStatus.DoorOpen || 
          this.state.status === ElevatorStatus.DoorOpening) {
          newEvents.push(closeDoor('button'));
      }

      newEvents.push(
          moveToFloor(floor, 'button'),
          openDoor('arrival'),
          waitOnFloor(5000),
          closeDoor('arrival')
      );

      this.state.queue.push(...newEvents);
      this.state.status = floor > this.state.currentFloor ? 
          ElevatorStatus.Moving : 
          ElevatorStatus.MovingDown;
      
      this.updateUI();
      if (this.state.status !== ElevatorStatus.Moving) this.processQueue();
    }
  
    private async processQueue(): Promise<void> {
      if (this.state.status !== ElevatorStatus.Moving) return;
  
      while (this.state.queue.length > 0) {
        const event = this.state.queue[0];
  
        if (event.type === OPEN_DOOR) {
          if (this.state.status === ElevatorStatus.Idle) {
              this.state.status = ElevatorStatus.DoorOpening;
              await this.doors.open();
              this.state.status = ElevatorStatus.DoorOpen;
          }
          this.state.queue.shift();
          this.updateUI();
        } else if (event.type === CLOSE_DOOR) {
          if (this.state.status === ElevatorStatus.DoorOpen) {
              this.state.status = ElevatorStatus.DoorClosing;
              await this.doors.close();
              this.state.status = ElevatorStatus.Idle;
          }
          this.state.queue.shift();
          this.updateUI();
        } else if (event.type === WAIT_ON_FLOOR) {
          await new Promise(resolve => setTimeout(resolve, event.duration));
          this.state.queue.shift();
          this.updateUI();
        } else if (event.type === MOVE_TO_FLOOR) {
          this.state.status = ElevatorStatus.Moving;
          
          this.updateUI();
          await this.moveToFloor(event.floor);
          
          this.state.status = ElevatorStatus.Idle;
          this.state.queue.shift();
          
          this.updateUI();
        }
      }
  
      this.state.status = ElevatorStatus.Idle;
      this.updateUI();
    }
  
    private async moveToFloor(targetFloor: number): Promise<void> {
      // Calculate total movement time based on floor distance
      const floorDifference = Math.abs(targetFloor - this.state.currentFloor);
      // Base time plus additional time per floor, with a maximum
      const baseTime = 1000; // 1 second base time
      const timePerFloor = 300; // 0.3 seconds per additional floor
      const totalMoveTime = Math.min(
          baseTime + (floorDifference - 1) * timePerFloor,
          3000 // Maximum 3 seconds for any trip
      );
      
      // Start movement
      const startFloor = this.state.currentFloor;
      const startTime = Date.now();
      
      // Animate movement
      const animate = () => {
          const elapsedTime = Date.now() - startTime;
          const progress = Math.min(elapsedTime / totalMoveTime, 1);
          
          // Use easing function for smoother acceleration/deceleration
          const easeProgress = easeInOutCubic(progress);
          
          if (progress < 1) {
              // Calculate intermediate position
              const elevatorCar = document.querySelector('.elevator-car') as HTMLElement;
              if (elevatorCar) {
                  const currentPosition = startFloor + (targetFloor - startFloor) * easeProgress;
                  const bottomPosition = ((currentPosition - 1) / (this.totalFloors - 1)) * 100;
                  elevatorCar.style.bottom = `${bottomPosition}%`;
              }
              requestAnimationFrame(animate);
          } else {
              // Movement complete, update final position
              this.state.currentFloor = targetFloor;
              this.updateUI();
          }
      };
      
      // Easing function for smooth acceleration/deceleration
      const easeInOutCubic = (x: number): number => {
          return x < 0.5
              ? 4 * x * x * x
              : 1 - Math.pow(-2 * x + 2, 3) / 2;
      };
      
      // Start animation
      requestAnimationFrame(animate);
      
      // Wait for movement to complete
      await new Promise(resolve => setTimeout(resolve, totalMoveTime));
    }
  
    private updateUI(): void {
      // Update floor display
      const floorDisplay = document.querySelector('.floor-display');
      if (floorDisplay) floorDisplay.textContent = String(this.state.currentFloor);
  
      // Update elevator car position and movement status
      const elevatorCar = document.querySelector('.elevator-car') as HTMLElement;
      if (elevatorCar) {
          elevatorCar.setAttribute('data-floor', String(this.state.currentFloor));
          elevatorCar.classList.toggle('moving', this.state.status === ElevatorStatus.Moving);
          
          // Only set bottom position if not animating
          if (this.state.status !== ElevatorStatus.Moving) {
              const bottomPosition = ((this.state.currentFloor - 1) / (this.totalFloors - 1)) * 100;
              elevatorCar.style.bottom = `${bottomPosition}%`;
          }
      }
  
      // Update door status
      const door = document.querySelector('.door');
      if (door) door.className = `door ${this.doors.getStatus()}`;
  
      // Update status indicators
      const doorStatus = document.querySelector('.door-status');
      if (doorStatus) doorStatus.textContent = `Doors: ${this.doors.getStatus()}`;
  
      const movementStatus = document.querySelector('.movement-status');
      if (movementStatus) {
          movementStatus.textContent = `Status: ${this.state.status}`;
      }
  
      // Update queue and events status
      const queueStatus = document.querySelector('.queue-status');
      if (queueStatus) {
        queueStatus.innerHTML = this.formatQueueStatus();
      }
  
      // Update elevator image based on door status
      const elevatorImage = document.querySelector('.elevator-image') as HTMLImageElement;
      if (elevatorImage) {
        elevatorImage.src = `/elevator/elevator-${this.doors.getStatus()}.svg`;
        elevatorImage.alt = `Elevator ${this.doors.getStatus()}`;
      }

      // Add machine state display
      const machineStateDisplay = document.querySelector('.movement-status');
      if (machineStateDisplay) {
          machineStateDisplay.textContent = `State: ${this.state.status}`;
      }
    }
  
    private formatQueueStatus(): string {
      return `
        <ul class="queue-list">
          ${this.state.queue.map(event => {
            if (event.type === OPEN_DOOR) {
                return `<li>Door open</li>`;
            } else if (event.type === CLOSE_DOOR) {
                return `<li>Door close</li>`;
            } else if (event.type === WAIT_ON_FLOOR) {
                return `<li>Wait ${event.duration/1000}s</li>`;
            } else {
                return `<li>Floor ${event.floor}</li>`;
            }
        }).join('') || '<li>Empty</li>'}
      </ul>
    `;
    }
  }