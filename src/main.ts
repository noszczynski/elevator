import { Elevator } from "./elevator";
import { ElevatorUI } from "./elevator-ui";

(async () => {
    const floors = 10;
    const ui = new ElevatorUI({ floors });
    new Elevator({ floors, ui });
})();
