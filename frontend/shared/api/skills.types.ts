import type {
  PatchSkillRequest as ContractPatchSkillRequest,
  SkillDataResponse,
  SkillDeleteDataResponse,
  SkillPageResponseDoc,
  SkillResponse,
  SkillSummaryResponse,
  SkillSummaryPageResponseDoc,
  WriteSkillRequest as ContractWriteSkillRequest,
} from "@deeix/api-contract";

export type SkillScope = "builtin" | "user";

export type SkillSummaryDTO = Omit<Required<SkillSummaryResponse>, "scope"> & {
  scope: SkillScope;
};

export type SkillDTO = Omit<Required<SkillResponse>, "scope"> & {
  scope: SkillScope;
};

type ContractSkillSummaryPage = NonNullable<SkillSummaryPageResponseDoc["data"]>;
type ContractSkillPage = NonNullable<SkillPageResponseDoc["data"]>;

export type SkillSummaryPage = Omit<Required<ContractSkillSummaryPage>, "results"> & {
  results: SkillSummaryDTO[];
};

export type SkillPage = Omit<Required<ContractSkillPage>, "results"> & {
  results: SkillDTO[];
};

export type WriteSkillRequest = Required<ContractWriteSkillRequest>;

export type PatchSkillRequest = ContractPatchSkillRequest;

export type SkillData = Omit<Required<SkillDataResponse>, "skill"> & {
  skill: SkillDTO;
};

export type SkillDeleteData = Required<SkillDeleteDataResponse>;
