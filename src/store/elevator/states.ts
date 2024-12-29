export enum ElevatorStatus {
  /**
   * Elevator stays at the floor and waiting for a request
   * Doors are closed
   */
  Idle = 'idle',
  /**
   * Elevator is moving to upper floors
   * Doors are closed
   */
  Moving = 'moving-up',
  /**
   * Elevator is moving to lower floors
   * Doors are closed
   */
  MovingDown = 'moving-down',
  /**
   * Elevator stays at the floor and door are open
   * Doors are open
   */
  DoorOpen = 'door-open',
  /**
   * Elevator stays at the floor and doors are opening
   * Doors are opening
   */
  DoorOpening = 'door-opening',
  /**
   * Elevator stays at the floor and doors are closing
   * Doors are closing
   */
  DoorClosing = 'door-closing',
}
