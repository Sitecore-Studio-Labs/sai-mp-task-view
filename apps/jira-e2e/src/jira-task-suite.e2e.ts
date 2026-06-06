import { runTaskAppTestingSuite } from "task-e2e";

import { test } from "./fixtures";
import { JiraTaskSuite } from "./suite/JiraTaskSuite";

runTaskAppTestingSuite(new JiraTaskSuite(), test);
