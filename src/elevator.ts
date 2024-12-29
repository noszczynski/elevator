import { ElevatorDoors } from './elevator-doors';

// Types and interfaces
interface ElevatorState {
    currentFloor: number;
    destinationQueue: number[];
    direction: 'up' | 'down' | 'idle';
    isMoving: boolean;
}

export class Elevator {
    private state: ElevatorState;
    private doors: ElevatorDoors;
    private readonly totalFloors: number;
    private readonly moveDelay: number = 2000; // Time to move between floors
    
    constructor(totalFloors: number = 10) {
      this.totalFloors = totalFloors;
      this.doors = new ElevatorDoors();
      this.state = {
        currentFloor: 1,
        destinationQueue: [],
        direction: 'idle',
        isMoving: false
      };
      
      this.initialize();
    }
  
    private initialize(): void {
      // Create and inject HTML structure
      const appElement = document.getElementById('app');
      if (!appElement) throw new Error('App element not found');
  
      appElement.innerHTML = `
        <div class="elevator-system">
          <div class="elevator-shaft">
            <div class="elevator-car" data-floor="${this.state.currentFloor}">
              <div class="floor-display">${this.state.currentFloor}</div>
              <div class="door ${this.doors.getStatus()}"></div>
            </div>
          </div>
          <div class="controls">
            <div class="floor-buttons">
              ${this.createFloorButtons()}
            </div>
            <div class="elevator-controls">
              <button class="door-control" data-action="open">Open Door</button>
              <button class="door-control" data-action="close">Close Door</button>
            </div>
            <div class="status">
              <div class="direction-indicator">Direction: ${this.state.direction}</div>
              <div class="door-status">Doors: ${this.doors.getStatus()}</div>
              <div class="movement-status">Status: ${this.state.isMoving ? 'Moving' : 'Stationary'}</div>
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
          const action = (e.target as HTMLElement).dataset.action;
          if (action === 'open') this.doors.open();
          if (action === 'close') this.doors.close();
        });
      });
    }
  
    private async requestFloor(floor: number): Promise<void> {
      if (floor === this.state.currentFloor || 
          this.state.destinationQueue.includes(floor) ||
          this.doors.getStatus() === 'open' ||
          this.doors.getStatus() === 'pending') return;
  
      this.state.destinationQueue.push(floor);
      if (!this.state.isMoving) this.processQueue();
    }
  
    private async processQueue(): Promise<void> {
      if (this.state.destinationQueue.length === 0 || this.state.isMoving) return;
  
      while (this.state.destinationQueue.length > 0) {
          const nextFloor = this.state.destinationQueue[0];
          this.state.direction = nextFloor > this.state.currentFloor ? 'up' : 'down';
          this.state.isMoving = true;
          
          if (this.doors.getStatus() === 'open') {
              await this.doors.close();
          }
          
          this.updateUI();
          await this.moveToFloor(nextFloor);
          this.state.destinationQueue.shift();
          
          this.state.isMoving = false;
          await this.doors.open();
          await this.doors.close();
      }
  
      this.state.direction = 'idle';
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
          elevatorCar.classList.toggle('moving', this.state.isMoving);
          
          // Only set bottom position if not animating
          if (!this.state.isMoving) {
              const bottomPosition = ((this.state.currentFloor - 1) / (this.totalFloors - 1)) * 100;
              elevatorCar.style.bottom = `${bottomPosition}%`;
          }
      }
  
      // Update door status
      const door = document.querySelector('.door');
      if (door) door.className = `door ${this.doors.getStatus()}`;
  
      // Update status indicators
      const directionIndicator = document.querySelector('.direction-indicator');
      if (directionIndicator) {
          directionIndicator.textContent = `Direction: ${this.state.direction}`;
          directionIndicator.className = `direction-indicator ${this.state.direction}`;
      }
  
      const doorStatus = document.querySelector('.door-status');
      if (doorStatus) doorStatus.textContent = `Doors: ${this.doors.getStatus()}`;
  
      const movementStatus = document.querySelector('.movement-status');
      if (movementStatus) {
          movementStatus.textContent = `Status: ${this.state.isMoving ? 'Moving' : 'Stationary'}`;
      }
    }
  }