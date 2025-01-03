import { ElevatorDoors } from './elevator-doors';
import { ElevatorStatus } from './store/elevator/states';
import StateMachine from './store/machine';
import transitions from './store/elevator/transitions';
import { ElevatorUI } from './elevator-ui';
import { EventEmitter } from './event-emitter';

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
    queueProcessing: boolean;
}

export class Elevator {
    private state: ElevatorState;
    private doors: ElevatorDoors;
    private readonly totalFloors: number;
    private machine: StateMachine;
    private ui: ElevatorUI;
    private interval: number;
    private emitter: EventEmitter<{
        'update_state': [newState: ElevatorStatus, data: any];
        'check_queue': [];
    }>;
    
    constructor({ floors, ui }: { floors: number; ui: ElevatorUI }) {
        this.totalFloors = floors;
        this.ui = ui;
        this.doors = new ElevatorDoors();
        
        // Initialize state machine
        this.machine = new StateMachine({
            initial: ElevatorStatus.Idle,
            states: ElevatorStatus,
            transitions: transitions,
        });

        this.machine.subscribe('update', (newState, data) => {
            this.handleStateChange(newState, data);
        });
        
        this.state = {
            currentFloor: 1, 
            queue: [],
            machineState: ElevatorStatus.Idle,
            queueProcessing: false
        };

        this.emitter = new EventEmitter<{
            'update_state': [newState: ElevatorStatus, data: any];
            'check_queue': [];
        }>();

        this.emitter.on('update_state', (newState, data) => {
            console.log('[EventEmitter] update_state', newState, data);
            this.machine.performTransition(data.transition);
            this.handleStateChange(newState, data);
        });

        this.emitter.on('check_queue', () => {
          console.log('[EventEmitter] check_queue');
          this.processQueue();
      });

        this.interval = setInterval(() => {
            this.emitter.emit('check_queue');
        }, 1000);
        
        this.initialize();
    }

    public destroy() {
        clearInterval(this.interval);
    }

    private handleStateChange(newState: ElevatorStatus, data: any) {
      this.state.machineState = newState;
      this.updateUI();
    }

    private log() {
      console.log(this.state);
    }
  
    private initialize(): void {
        this.ui.initialize(
            this.state.currentFloor,
            this.doors.getStatus(),
            this.state.machineState,
            (floor) => this.requestFloor(floor),
            (action) => {
                if (action === 'open' && this.state.machineState !== ElevatorStatus.DoorOpen) {
                    this.state.queue.push(openDoor('button'));
                    this.updateUI();
                }
                if (action === 'close') {
                    this.state.queue.push(closeDoor('button'));
                    this.updateUI();
                }
            },
            () => this.log()
        );
    }
  
    private async optimizeQueue(): Promise<void> {
      // TODO: Implement queue optimization
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
      this.optimizeQueue();
      this.updateUI();
    }
  
    private async processQueue(): Promise<void> {
      if (this.state.queue.length === 0) {
        this.state.queueProcessing = false;
        return;
      }
      
      this.state.queueProcessing = true;
      const [event] = this.state.queue;

      console.log("[EVENT] Processing: ", event.type);

      try {
          switch (event.type) {
              case MOVE_TO_FLOOR:
                  if (this.state.machineState === ElevatorStatus.Idle) {
                      await this.moveToFloor(event.floor);
                      this.state.queue.shift();
                  }
                  break;

              case OPEN_DOOR:
                if (this.state.machineState === ElevatorStatus.DoorOpen) {
                  this.state.queue.shift();
                  break;
                }

                  if (this.state.machineState !== ElevatorStatus.DoorOpening) {
                      this.emitter.emit('update_state', ElevatorStatus.DoorOpening, { transition: 'openDoor' });
                      
                      await this.doors.open();
                      await this.updateUI();
                      await new Promise(resolve => setTimeout(resolve, 300));
                      
                      this.emitter.emit('update_state', ElevatorStatus.DoorOpen, { transition: 'complete' });
                      await this.doors.confirmOpen();
                      await this.updateUI();

                      this.state.queue.shift();
                  }
                  break;

              case CLOSE_DOOR:
                if (this.state.machineState === ElevatorStatus.DoorClosing) {
                  this.state.queue.shift();
                  break;
                }

                  if (this.state.machineState === ElevatorStatus.DoorOpen) {
                      this.emitter.emit('update_state', ElevatorStatus.DoorClosing, { transition: 'closeDoor' });
                      
                      await this.doors.close();
                      await this.updateUI();
                      await new Promise(resolve => setTimeout(resolve, 300));
                      
                      this.emitter.emit('update_state', ElevatorStatus.Idle, { transition: 'complete' });
                      await this.doors.confirmClose();
                      await this.updateUI();

                      this.state.queue.shift();
                  }
                  break;
          }
      } catch (error) {
          console.error('Error processing queue:', error);
          this.state.queue = [];
          this.state.queueProcessing = false;
      }

      this.updateUI();
    }
  
    private async moveToFloor(targetFloor: number): Promise<void> {
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
                this.ui.animateElevatorMovement(
                    startFloor,
                    targetFloor,
                    easeProgress,
                    this.totalFloors
                );
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

        this.emitter.emit('update_state', ElevatorStatus.Moving, { 
            transition: 'moveToFloor', 
            targetFloor 
        });
        
        requestAnimationFrame(animate);

        await new Promise<void>(resolve => setTimeout(resolve, totalMoveTime));
        
        this.emitter.emit('update_state', ElevatorStatus.Idle, { 
            transition: 'arrive'
        });
    }
  
    private updateUI(): void {
        this.ui.updateElevatorPosition(
            this.state.currentFloor,
            this.totalFloors,
            this.state.machineState === ElevatorStatus.Moving
        );

        this.ui.updateDisplay(
            this.state.currentFloor,
            this.doors.getStatus(),
            this.state.machineState,
            this.formatQueueStatus()
        );
    }
  
    private formatQueueStatus(): string {
      return `
        <ul class="queue-list">
          ${this.state.queue.map(event => {
            if (event.type === OPEN_DOOR) {
                return `<li>Door open</li>`;
            } else if (event.type === CLOSE_DOOR) {
                return `<li>Door close</li>`;
            } else if (event.type === MOVE_TO_FLOOR) {
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