import { StateMessage, TransitionsConfig, MachineState, TransitionFunction } from "../types";
import { ElevatorStatus } from "./states";

// Helper function to create state messages
function message(newState: ElevatorStatus, data: any = null): StateMessage<ElevatorStatus, any> {
  return { newState, data };
}

// Simulated elevator movement
async function* moveElevator(
  current?: MachineState<ElevatorStatus, any>
): AsyncGenerator<StateMessage<ElevatorStatus, number>> {
  // Get target floor from current state data
  const targetFloor = current?.data?.targetFloor;
  
  // If no target floor, do nothing
  if (!targetFloor) return

  // Start moving up or down
  yield message(ElevatorStatus.Moving, { targetFloor });
}

// Door operations
async function* openDoor(): AsyncGenerator<StateMessage<ElevatorStatus, any>> {
  yield message(ElevatorStatus.DoorOpening);
}

async function* confirmDoorOpen(): AsyncGenerator<StateMessage<ElevatorStatus, any>> {
  yield message(ElevatorStatus.DoorOpen);
}

async function* closeDoor(): AsyncGenerator<StateMessage<ElevatorStatus, any>> {
  yield message(ElevatorStatus.DoorClosing);
}

async function* confirmDoorClosed(): AsyncGenerator<StateMessage<ElevatorStatus, any>> {
  yield message(ElevatorStatus.Idle);
}

async function* arrive(): AsyncGenerator<StateMessage<ElevatorStatus, any>> {
  yield message(ElevatorStatus.Idle);
}

/**
 * Define all possible transitions between elevator states
 */
const transitions: TransitionsConfig<ElevatorStatus> = {
  [ElevatorStatus.Idle]: {
    moveToFloor: moveElevator,
    openDoor: openDoor,
  },

  [ElevatorStatus.Moving]: {
    arrive: arrive,
  },

  [ElevatorStatus.DoorOpen]: {
    closeDoor: closeDoor,
  },

  [ElevatorStatus.DoorOpening]: {
    complete: confirmDoorOpen,
  },

  [ElevatorStatus.DoorClosing]: {
    complete: confirmDoorClosed,
  },
}

export default transitions;