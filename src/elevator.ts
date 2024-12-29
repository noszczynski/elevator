import { ElevatorDoors } from './elevator-doors';
import { ElevatorStatus } from './store/elevator/states';
import StateMachine from './store/machine';
import transitions from './store/elevator/transitions';

// Define action types
const OPEN_DOOR = 'OPEN_DOOR';
const CLOSE_DOOR = 'CLOSE_DOOR';
const MOVE_TO_FLOOR = 'MOVE_TO_FLOOR';

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

// Union type for all actions
type ElevatorAction = OpenDoorAction | CloseDoorAction | MoveToFloorAction;

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

// Types and interfaces
interface ElevatorState {
    currentFloor: number;
    queue: ElevatorAction[];
    machineState: ElevatorStatus;
}

export class Elevator {
    private state: ElevatorState;
    private doors: ElevatorDoors;
    private readonly totalFloors: number;
    private machine: StateMachine;
    
    constructor({ floors }: { floors: number }) {
      this.totalFloors = floors;
      this.doors = new ElevatorDoors();
      
      // Initialize state machine
      this.machine = new StateMachine({
        initial: ElevatorStatus.Idle,
        states: ElevatorStatus,
        transitions: transitions,
      });

      // Subscribe to state machine updates
      this.machine.subscribe('update', (newState, data) => {
        this.handleStateChange(newState, data);
      });
      
      this.state = { 
        currentFloor: 1, 
        queue: [], 
        machineState: ElevatorStatus.Idle 
      };
      
      this.initialize();
    }

    private handleStateChange(newState: ElevatorStatus, data: any) {
      this.state.machineState = newState;
      this.updateUI();
    }

    private log() {
      console.dir(this.state, { depth: null });
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
              <div class="movement-status">Status: ${this.state.machineState}</div>
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
          if (action === 'open' && this.state.machineState !== ElevatorStatus.DoorOpen) {
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
      if (!this.canAddFloorRequest(floor)) return;

      const newEvents: ElevatorAction[] = [];

      newEvents.push(
        moveToFloor(floor, 'button'),
        openDoor('arrival'),
        closeDoor('arrival')
      );

      this.state.queue.push(...newEvents);
      this.updateUI();

      if (this.state.queue.length === newEvents.length) {
        await this.processQueue();
      }
    }
  
    private async processQueue(): Promise<void> {
      if (this.state.queue.length === 0) return;
      
      const event = this.state.queue[0];

      switch (event.type) {
        case MOVE_TO_FLOOR:
          if (this.state.machineState === ElevatorStatus.Idle) {
            await this.moveToFloor(event.floor);
            this.state.queue.shift();
            await this.processQueue();
          }
          break;

        case OPEN_DOOR:
          if (this.state.machineState !== ElevatorStatus.DoorOpen && 
              this.state.machineState !== ElevatorStatus.DoorOpening) {
            await this.machine.performTransition('openDoor');
            await this.doors.open();
            this.state.queue.shift();
            await this.processQueue();
          }
          break;

        case CLOSE_DOOR:
          if (this.state.machineState === ElevatorStatus.DoorOpen) {
            await this.machine.performTransition('closeDoor');
            await this.doors.close();
            this.state.queue.shift();
            await this.processQueue();
          }
          break;
      }

      this.updateUI();
    }
  
    private async moveToFloor(targetFloor: number): Promise<void> {
      await this.machine.performTransition('moveToFloor');
      
      const floorDifference = Math.abs(targetFloor - this.state.currentFloor);
      const baseTime = 1000;
      const timePerFloor = 300;
      const totalMoveTime = Math.min(
        baseTime + (floorDifference - 1) * timePerFloor,
        3000
      );
      
      const startFloor = this.state.currentFloor;
      const startTime = Date.now();
      
      const animate = () => {
          const elapsedTime = Date.now() - startTime;
          const progress = Math.min(elapsedTime / totalMoveTime, 1);
          
          const easeProgress = easeInOutCubic(progress);
          
          if (progress < 1) {
              const elevatorCar = document.querySelector('.elevator-car') as HTMLElement;
              if (elevatorCar) {
                  const currentPosition = startFloor + (targetFloor - startFloor) * easeProgress;
                  const bottomPosition = ((currentPosition - 1) / (this.totalFloors - 1)) * 100;
                  elevatorCar.style.bottom = `${bottomPosition}%`;
              }
              requestAnimationFrame(animate);
          } else {
              this.state.currentFloor = targetFloor;
              this.updateUI();
          }
      };
      
      const easeInOutCubic = (x: number): number => {
          return x < 0.5
              ? 4 * x * x * x
              : 1 - Math.pow(-2 * x + 2, 3) / 2;
      };
      
      requestAnimationFrame(animate);
      
      await new Promise(resolve => setTimeout(resolve, totalMoveTime));

      await this.machine.performTransition('arrive');
    }
  
    private updateUI(): void {
      const floorDisplay = document.querySelector('.floor-display');
      if (floorDisplay) floorDisplay.textContent = String(this.state.currentFloor);
  
      const elevatorCar = document.querySelector('.elevator-car') as HTMLElement;
      if (elevatorCar) {
          elevatorCar.setAttribute('data-floor', String(this.state.currentFloor));
          elevatorCar.classList.toggle('moving', this.state.machineState === ElevatorStatus.Moving);
          
          if (this.state.machineState !== ElevatorStatus.Moving) {
              const bottomPosition = ((this.state.currentFloor - 1) / (this.totalFloors - 1)) * 100;
              elevatorCar.style.bottom = `${bottomPosition}%`;
          }
      }
  
      const door = document.querySelector('.door');
      if (door) door.className = `door ${this.doors.getStatus()}`;
  
      const doorStatus = document.querySelector('.door-status');
      if (doorStatus) doorStatus.textContent = `Doors: ${this.doors.getStatus()}`;
  
      const movementStatus = document.querySelector('.movement-status');
      if (movementStatus) {
          movementStatus.textContent = `Status: ${this.state.machineState}`;
      }
  
      const queueStatus = document.querySelector('.queue-status');
      if (queueStatus) {
        queueStatus.innerHTML = this.formatQueueStatus();
      }
  
      const elevatorImage = document.querySelector('.elevator-image') as HTMLImageElement;
      if (elevatorImage) {
        elevatorImage.src = `/elevator/elevator-${this.doors.getStatus()}.svg`;
        elevatorImage.alt = `Elevator ${this.doors.getStatus()}`;
      }

      const machineStateDisplay = document.querySelector('.movement-status');
      if (machineStateDisplay) {
          machineStateDisplay.textContent = `State: ${this.state.machineState}`;
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
            } else {
                return `<li>Floor ${event.floor}</li>`;
            }
        }).join('') || '<li>Empty</li>'}
      </ul>
    `;
    }

    private canAddFloorRequest(floor: number): boolean {
      return !(floor === this.state.currentFloor);
    }
  }