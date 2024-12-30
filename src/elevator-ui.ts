import { ElevatorStatus } from './store/elevator/states';
import { ElevatorDoors } from './elevator-doors';

export class ElevatorUI {
    private readonly totalFloors: number;

    constructor({ floors }: { floors: number }) {
        this.totalFloors = floors;
    }

    initialize(
        currentFloor: number, 
        doorStatus: string, 
        machineState: ElevatorStatus,
        onFloorButtonClick: (floor: number) => void,
        onDoorControl: (action: 'open' | 'close') => void,
        onDebugClick: () => void
    ): void {
        const appElement = document.getElementById('app');
        if (!appElement) throw new Error('App element not found');

        appElement.innerHTML = `
            <div class="elevator-system">
                <!-- Column 1: Elevator -->
                <div class="elevator-column">
                    <h2>Elevator</h2>
                    <div class="elevator-shaft">
                        <div class="elevator-car" data-floor="${currentFloor}">
                            <div class="floor-display">${currentFloor}</div>
                            <img 
                                class="elevator-image" 
                                src="/elevator/elevator-${doorStatus}.svg" 
                                alt="Elevator ${doorStatus}"
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
                        <div class="door-status">Doors: ${doorStatus}</div>
                        <div class="movement-status">Status: ${machineState}</div>
                    </div>
                </div>

                <!-- Column 3: Queue -->
                <div class="state-column">
                    <h2>Event Queue</h2>
                    <div class="queue-panel">
                        <div class="queue-status"><ul class="queue-list"><li>Empty</li></ul></div>
                    </div>
                    <button class="debug-button">Log State</button>
                </div>
            </div>
        `;

        this.attachEventListeners(onFloorButtonClick, onDoorControl, onDebugClick);
    }

    private createFloorButtons(): string {
        return Array.from({ length: this.totalFloors }, (_, i) => i + 1)
            .map(floor => `
                <button class="floor-button" data-floor="${floor}">
                    Floor ${floor}
                </button>
            `).join('');
    }

    private attachEventListeners(
        onFloorButtonClick: (floor: number) => void,
        onDoorControl: (action: 'open' | 'close') => void,
        onDebugClick: () => void
    ): void {
        document.querySelectorAll('.floor-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const floor = Number((e.target as HTMLElement).dataset.floor);
                onFloorButtonClick(floor);
            });
        });

        document.querySelectorAll('.door-control').forEach(button => {
            button.addEventListener('click', (e) => {
                const action = (e.target as HTMLElement).dataset.action as 'open' | 'close';
                onDoorControl(action);
            });
        });

        const debugButton = document.querySelector('.debug-button');
        if (debugButton) {
            debugButton.addEventListener('click', onDebugClick);
        }
    }

    updateElevatorPosition(currentFloor: number, totalFloors: number, isMoving: boolean): void {
        const elevatorCar = document.querySelector('.elevator-car') as HTMLElement;
        if (elevatorCar) {
            elevatorCar.setAttribute('data-floor', String(currentFloor));
            elevatorCar.classList.toggle('moving', isMoving);
            
            if (!isMoving) {
                const bottomPosition = ((currentFloor - 1) / (totalFloors - 1)) * 100;
                elevatorCar.style.bottom = `${bottomPosition}%`;
            }
        }
    }

    animateElevatorMovement(
        startFloor: number,
        targetFloor: number,
        progress: number,
        totalFloors: number
    ): void {
        const elevatorCar = document.querySelector('.elevator-car') as HTMLElement;
        if (elevatorCar) {
            const currentPosition = startFloor + (targetFloor - startFloor) * progress;
            const bottomPosition = ((currentPosition - 1) / (totalFloors - 1)) * 100;
            elevatorCar.style.bottom = `${bottomPosition}%`;
        }
    }

    updateDisplay(
        currentFloor: number,
        doorStatus: string,
        machineState: ElevatorStatus,
        queueStatus: string
    ): void {
        const floorDisplay = document.querySelector('.floor-display');
        if (floorDisplay) floorDisplay.textContent = String(currentFloor);

        const door = document.querySelector('.door');
        if (door) door.className = `door ${doorStatus}`;

        const doorStatusElement = document.querySelector('.door-status');
        if (doorStatusElement) doorStatusElement.textContent = `Doors: ${doorStatus}`;

        const movementStatus = document.querySelector('.movement-status');
        if (movementStatus) {
            movementStatus.textContent = `Status: ${machineState}`;
        }

        const queueStatusElement = document.querySelector('.queue-status');
        if (queueStatusElement) {
            queueStatusElement.innerHTML = queueStatus;
        }

        const elevatorImage = document.querySelector('.elevator-image') as HTMLImageElement;
        if (elevatorImage) {
            elevatorImage.src = `/elevator/elevator-${doorStatus}.svg`;
            elevatorImage.alt = `Elevator ${doorStatus}`;
        }
    }
} 