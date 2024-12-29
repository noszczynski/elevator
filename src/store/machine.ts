import { ElevatorStatus } from './elevator/states';
import { TransitionsConfig, StatesConfig } from './types';

interface StateMachineConfig {
  initial: ElevatorStatus;
  states: StatesConfig<ElevatorStatus>;
  transitions: TransitionsConfig<ElevatorStatus>;
  data?: any | null;
}

class StateMachine {
    private transitions: TransitionsConfig<ElevatorStatus>;
    private states: StatesConfig<ElevatorStatus>;
    private state: ElevatorStatus;
    private data: any | null;
    private _onUpdate: ((state: ElevatorStatus, data: any) => void) | null;

    constructor({
      initial, 
      states, 
      transitions, 
      data = null,
    }: StateMachineConfig) {
      this.transitions = transitions;
      this.states = states;
      this.state = initial;
      this.data = data;
      
      this._onUpdate = null;
    }
  
    stateOf() {
      return this.states[this.state]
    }
  
    _updateState(newState: ElevatorStatus, data: any | null) {
      this.state = newState;
      this.data = data;
      
      this._onUpdate && this._onUpdate(newState, data);
    }
  
    async performTransition(transitionName: string) {
      const possibleTransitions = this.transitions[this.state]
      const transition = possibleTransitions[transitionName]
      if (!transition) return
  
      const current = {
        state: this.state,
        data: this.data,
      }
  
      for await (const {newState, data=null} of transition(current)) {
        this._updateState(newState, data)
      }
    }
  
    subscribe(event: string, callback: (state: ElevatorStatus, data: any) => void) {
      if (event === 'update') this._onUpdate = callback || null;
    }
}

export default StateMachine;