"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  bindAdminLLMModelUpstreamSource,
  createAdminLLMModel,
  invalidateAdminReferenceDataCache,
  updateAdminLLMModel,
} from "@/features/admin/api";
import type {
  AdminLLMModelAccessScope,
  AdminLLMModelCbPolicyMode,
  AdminLLMModelDTO,
  AdminLLMModelVendor,
  AdminLLMStatus,
  UpdateAdminLLMModelRequest,
} from "@/features/admin/api/llm-types";
import {
  type ModelSourceBindDraftRow,
  resolveModelSourceBindDraftRows,
} from "@/features/admin/model/models-source-binding";
import { resolveAdminErrorMessage } from "@/features/admin/utils/admin-error";
import { resolveAccessToken } from "@/shared/auth/resolve-access-token";
import { stringifyKinds } from "@/entities/model";

/** Display-group select value meaning "no explicit group, follow the vendor". */
export const FOLLOW_VENDOR_GROUP = "vendor";

export type AdminModelSheetForm = {
  platformModelName: string;
  vendor: AdminLLMModelVendor | "";
  displayGroupID: string;
  kinds: string[];
  icon: string;
  capabilitiesJSON: string;
  systemPrompt: string;
  accessScope: AdminLLMModelAccessScope;
  status: AdminLLMStatus;
  description: string;
  cbPolicyMode: AdminLLMModelCbPolicyMode;
  cbFailureThreshold: string;
  cbDurationMin: string;
  cbWindowMin: string;
};

function normalizeModelIdentityPart(value: string | null | undefined): string {
  return value?.normalize("NFKC").trim().toLowerCase() ?? "";
}

export function isSameContextWindowTarget(
  target: AdminLLMModelDTO | null,
  platformModelName: string,
  vendor: string,
): boolean {
  return Boolean(
    target
    && normalizeModelIdentityPart(platformModelName) === normalizeModelIdentityPart(target.platformModelName)
    && normalizeModelIdentityPart(vendor) === normalizeModelIdentityPart(target.vendor),
  );
}

type UseAdminModelsSheetSubmitOptions = {
  mode: "create" | "edit";
  target: AdminLLMModelDTO | null;
  manualPermissionGroupIDs: number[];
  saveModelPermissionGroups: (accessToken: string, modelID: number) => Promise<void>;
  onClose: () => void;
  onSuccess: () => void;
};

type AdminModelSheetSubmitInput = {
  form: AdminModelSheetForm;
  bindRows: ModelSourceBindDraftRow[];
  /** Capability JSON normalisation lives with the capability editor; the sheet passes it in. */
  normalizeCapabilities: (capabilitiesJSON: string) => string;
  /** Runs after a successful create, before the sheet closes. */
  onCreated: (model: AdminLLMModelDTO) => void;
};

export function useAdminModelsSheetSubmit({
  mode,
  target,
  manualPermissionGroupIDs,
  saveModelPermissionGroups,
  onClose,
  onSuccess,
}: UseAdminModelsSheetSubmitOptions) {
  const t = useTranslations("adminModels");
  const [pending, setPending] = React.useState(false);

  async function submit({ form, bindRows, normalizeCapabilities, onCreated }: AdminModelSheetSubmitInput) {
    if (pending || (mode === "edit" && !target)) return;

    const bindDraftResult = mode === "create"
      ? resolveModelSourceBindDraftRows(bindRows)
      : { status: "empty" as const };
    if (bindDraftResult.status === "invalid") {
      const messageKey = {
        required: "toast.bindRequired",
        protocolRequired: "toast.bindProtocolRequired",
        priorityMustBePositive: "sources.priorityMustBePositive",
        weightMustBePositive: "sources.weightMustBePositive",
        duplicate: "toast.bindDuplicateSource",
      }[bindDraftResult.error];
      toast.error(t(messageKey));
      return;
    }

    setPending(true);
    try {
      const token = await resolveAccessToken();
      const capabilitiesJSON = form.capabilitiesJSON;
      const normalizedCapabilitiesJSON = normalizeCapabilities(capabilitiesJSON);
      const kindsJson =
        form.kinds.length > 0 ? stringifyKinds(form.kinds) : undefined;
      const cbFailureThreshold = Math.max(
        0,
        Number.parseInt(form.cbFailureThreshold.trim() || "0", 10) || 0,
      );
      const cbDurationMin = Math.max(
        0,
        Number.parseInt(form.cbDurationMin.trim() || "0", 10) || 0,
      );
      const cbWindowMin = Math.max(
        0,
        Number.parseInt(form.cbWindowMin.trim() || "0", 10) || 0,
      );

      if (mode === "create") {
        const data = await createAdminLLMModel(token, {
          platformModelName: form.platformModelName.trim(),
          vendor: form.vendor || undefined,
          displayGroupID: form.displayGroupID === FOLLOW_VENDOR_GROUP ? undefined : Number(form.displayGroupID),
          kindsJSON: kindsJson,
          icon: form.icon.trim() || undefined,
          capabilitiesJSON: normalizedCapabilitiesJSON || undefined,
          systemPrompt: form.systemPrompt.trim() || undefined,
          accessScope: form.accessScope,
          status: form.status,
          description: form.description.trim() || undefined,
          cbPolicyMode: form.cbPolicyMode,
          cbFailureThreshold,
          cbDurationMin,
          cbWindowMin,
        });
        if (manualPermissionGroupIDs.length > 0) {
          await saveModelPermissionGroups(token, data.model.id);
        }
        if (bindDraftResult.status === "valid" && bindDraftResult.payloads.length > 0) {
          let failedCount = 0;
          let lastBindError: unknown = null;
          for (const payload of bindDraftResult.payloads) {
            try {
              await bindAdminLLMModelUpstreamSource(token, data.model.id, payload);
            } catch (bindError) {
              failedCount += 1;
              lastBindError = bindError;
            }
          }
          if (failedCount > 0) {
            toast.error(t("toast.modelCreatedSourcesBindPartialFailed", { count: failedCount }), {
              description: lastBindError ? resolveAdminErrorMessage(lastBindError) : undefined,
            });
          } else {
            toast.success(t("toast.modelCreatedWithSources", { count: bindDraftResult.payloads.length }));
          }
        } else {
          toast.success(t("toast.modelCreated"));
        }
        onCreated(data.model);
        invalidateAdminReferenceDataCache();
        onClose();
        onSuccess();
        return;
      }

      if (!target) return;
      const payload: UpdateAdminLLMModelRequest = {
        platformModelName: form.platformModelName.trim() || undefined,
        vendor: form.vendor || undefined,
        displayGroupID: form.displayGroupID === FOLLOW_VENDOR_GROUP ? 0 : Number(form.displayGroupID),
        kindsJSON: kindsJson,
        icon: form.icon.trim(),
        capabilitiesJSON: normalizedCapabilitiesJSON,
        systemPrompt: form.systemPrompt.trim(),
        accessScope: form.accessScope,
        status: form.status,
        description: form.description.trim() || undefined,
        cbPolicyMode: form.cbPolicyMode,
        cbFailureThreshold,
        cbDurationMin,
        cbWindowMin,
      };
      await updateAdminLLMModel(token, target.id, payload);
      await saveModelPermissionGroups(token, target.id);
      invalidateAdminReferenceDataCache();

      onClose();
      onSuccess();
      toast.success(t("toast.modelUpdated"));
    } catch (err) {
      toast.error(mode === "create" ? t("toast.createFailed") : t("toast.updateFailed"), { description: resolveAdminErrorMessage(err) });
    } finally {
      setPending(false);
    }
  }

  return { pending, submit };
}
