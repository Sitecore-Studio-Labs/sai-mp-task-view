import { runTaskAppTestingSuite } from "task-e2e";

import { test } from "./fixtures";
import { WrikeTaskSuite } from "./suite/WrikeTaskSuite";

runTaskAppTestingSuite(new WrikeTaskSuite(), test);
