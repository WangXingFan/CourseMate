// Public entry of the admin feature: the /admin layout mounts the gate and shell,
// and each /admin/<section> route mounts its section entry. Unused re-exports are
// dropped at build time because package.json declares `sideEffects`, so a section
// route does not bundle the other sections.
export { AdminAccessGate } from "@/features/admin/components/admin-access-gate";
export { AdminShell } from "@/features/admin/components/admin-shell";
export { AdminKnowledgeBasesPage } from "@/features/admin/components/sections/knowledge-bases/admin-knowledge-bases";
export { AdminModelsPage } from "@/features/admin/components/sections/models/admin-models";
export { AdminUpstreamsPage } from "@/features/admin/components/sections/upstreams/admin-upstreams";
export { AdminUsersPage } from "@/features/admin/components/sections/users/admin-users";
