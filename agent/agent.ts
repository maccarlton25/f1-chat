import { defineAgent } from "eve";
import { createModelRouter } from "./model-router";

export default defineAgent({
  // A runtime router model: the actual model + reasoning effort are chosen
  // per turn from the UI. See agent/model-router.ts and lib/models.ts.
  model: createModelRouter(),
  // The router's synthetic id has no AI Gateway catalog metadata, so tell eve
  // the context window explicitly (every model in the roster is 1M).
  modelContextWindowTokens: 1_000_000,
});
