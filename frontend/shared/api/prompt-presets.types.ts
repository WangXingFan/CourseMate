import type {
  PatchPromptPresetRequest as ContractPatchPromptPresetRequest,
  PromptPresetDataResponse,
  PromptPresetDeleteDataResponse,
  PromptPresetPageResponseDoc,
  PromptPresetResponse,
  WritePromptPresetRequest as ContractWritePromptPresetRequest,
} from "@deeix/api-contract";

export type PromptPresetScope = "builtin" | "user";

export type PromptPresetDTO = Omit<Required<PromptPresetResponse>, "scope"> & {
  scope: PromptPresetScope;
};

type ContractPromptPresetPage = NonNullable<PromptPresetPageResponseDoc["data"]>;

export type PromptPresetPage = Omit<Required<ContractPromptPresetPage>, "results"> & {
  results: PromptPresetDTO[];
};

export type WritePromptPresetRequest = Required<ContractWritePromptPresetRequest>;

export type PatchPromptPresetRequest = ContractPatchPromptPresetRequest;

export type PromptPresetData = Omit<Required<PromptPresetDataResponse>, "promptPreset"> & {
  promptPreset: PromptPresetDTO;
};

export type PromptPresetDeleteData = Required<PromptPresetDeleteDataResponse>;
