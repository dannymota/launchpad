// The optional modules this product includes. A module is a folder here plus its block
// below. `npm run remove -- <name>` deletes both, and everything else the module added.
import { registerModule } from "../core/modules";
import { ai } from "./ai/module";

import { analytics } from "./analytics/module";

import { payments } from "./payments/module";

// >>> ai
registerModule(ai);
// <<< ai
// >>> analytics
registerModule(analytics);
// <<< analytics
// >>> payments
registerModule(payments);
// <<< payments
