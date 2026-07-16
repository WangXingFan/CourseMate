# @deeix/api-contract

TypeScript data contracts generated from the Go backend's Swagger 2.0 document.

The source of truth is `backend/docs/swagger.json`. The generated output includes data models and per-route request/response types. Runtime HTTP behavior, authentication, retries, and error handling remain in the frontend API layer; this package contains types only.

From the workspace root:

```bash
pnpm api:generate
pnpm api:check
```

Consume the package with type-only imports:

```ts
import type { Admin, UserDataResponse } from "@deeix/api-contract";

type CreateUserBody = Admin.UsersCreate.RequestBody;
type CreateUserResult = Admin.UsersCreate.ResponseBody;
```

`pnpm check` runs both the drift check and TypeScript validation through Turborepo. Never edit `src/types.generated.ts` manually.
