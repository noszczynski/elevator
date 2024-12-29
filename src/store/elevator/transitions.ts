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
  const targetFloor = current?.data;
  
  // If no target floor, do nothing
  if (!targetFloor) return

  // Start moving up or down
  yield message(ElevatorStatus.Moving, targetFloor);
  
  // Simulate movement time
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // When arrived, start door opening sequence
  yield message(ElevatorStatus.DoorOpening, targetFloor);
}

// Door operations
async function* openDoor(): AsyncGenerator<StateMessage<ElevatorStatus, any>> {
  yield message(ElevatorStatus.DoorOpening);
  await new Promise(resolve => setTimeout(resolve, 1000));
  yield message(ElevatorStatus.DoorOpen);
}

async function* closeDoor(): AsyncGenerator<StateMessage<ElevatorStatus, any>> {
  yield message(ElevatorStatus.DoorClosing);
  await new Promise(resolve => setTimeout(resolve, 1000));
  yield message(ElevatorStatus.Idle);
}

// Reset to idle state
async function* waiting(): AsyncGenerator<StateMessage<ElevatorStatus, any>> {
  yield message(ElevatorStatus.Idle);
}

/**
 * Define all possible transitions between elevator states
 */
const transitions: TransitionsConfig<ElevatorStatus> = {
  [ElevatorStatus.Idle]: {
    moveToFloor: moveElevator satisfies TransitionFunction<ElevatorStatus>,
    openDoor: openDoor satisfies TransitionFunction<ElevatorStatus>,
  },

  [ElevatorStatus.Moving]: {
    arrive: openDoor satisfies TransitionFunction<ElevatorStatus>,
  },

  [ElevatorStatus.DoorOpen]: {
    closeDoor: closeDoor satisfies TransitionFunction<ElevatorStatus>,
    waiting: waiting satisfies TransitionFunction<ElevatorStatus>,
  },

  [ElevatorStatus.DoorOpening]: {
    complete: async function* () {
      yield message(ElevatorStatus.DoorOpen);
    } satisfies TransitionFunction<ElevatorStatus>,
  },

  [ElevatorStatus.DoorClosing]: {
    complete: async function* () {
      yield message(ElevatorStatus.Idle);
    } satisfies TransitionFunction<ElevatorStatus>,
  },
}

export default transitions;