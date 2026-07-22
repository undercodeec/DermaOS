import { env } from "./env.js";
import { app } from "./app.js";

app.listen(env.PORT, () => {
  console.log(`[derma-os/api] listening on port ${env.PORT}`);
});
