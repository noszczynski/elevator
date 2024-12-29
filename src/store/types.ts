export interface StateMessage<TState, TData = any> {
  newState: TState;
  data?: TData | null;
}

export interface MachineState<TState, TData = any> {
  state: TState;
  data: TData | null;
}

export type TransitionFunction<TState, TData = any> = (current?: MachineState<TState, TData>) => AsyncGenerator<StateMessage<TState, TData>>;

export interface TransitionsMap<TState, TData = any> {
  [key: string]: TransitionFunction<TState, TData>;
}

export interface StatesConfig<TState> {
  [key: string]: TState;
}

export interface TransitionsConfig<TState, TData = any> {
  [key: string]: TransitionsMap<TState, TData>;
}