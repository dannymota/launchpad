// The optional modules this product includes. A module is a folder here plus its block
// below. `npm run remove -- <name>` deletes both, and everything else the module added.
import { registerModule } from "../core/modules";
// >>> ai
import { ai } from "./ai/module";

// <<< ai
// >>> analytics
import { analytics } from "./analytics/module";

// <<< analytics
// >>> payments
import { payments } from "./payments/module";

// <<< payments

// >>> ai
registerModule(ai);
// <<< ai
// >>> analytics
registerModule(analytics);
// <<< analytics
// >>> payments
registerModule(payments);
// <<< payments

/** Imported for its effect: registering the modules above. */
export const MODULES_REGISTERED = true;
