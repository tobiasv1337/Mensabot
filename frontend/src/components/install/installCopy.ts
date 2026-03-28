import type { TFunction } from "i18next";
import type { InstallCapability } from "../../services/installPromotion";

type InstallPromptCopy = {
  title: string;
  body: string;
  actionLabel: string;
};

type InstallEntryCopy = {
  label: string;
  description: string;
  actionLabel: string;
};

export type InstallInstructionsCopy = {
  title: string;
  subtitle: string;
  closeLabel: string;
  steps: Array<{
    id: string;
    title: string;
    body: string;
  }>;
};

const getBodyKeySuffix = (capability: InstallCapability) => {
  switch (capability) {
    case "manual_ios_ipados":
      return "ios";
    case "manual_macos_safari":
      return "mac";
    default:
      return "native";
  }
};

const isManualCapability = (capability: InstallCapability) =>
  capability === "manual_ios_ipados" || capability === "manual_macos_safari";

export const getInstallPromptCopy = (
  capability: InstallCapability,
  t: TFunction,
): InstallPromptCopy | null => {
  if (capability === "installed" || capability === "unsupported") return null;

  return {
    title: t("installPromotion.card.title"),
    body: t(`installPromotion.card.body.${getBodyKeySuffix(capability)}`),
    actionLabel: isManualCapability(capability)
      ? t("installPromotion.actions.howToInstall")
      : t("installPromotion.actions.install"),
  };
};

export const getInstallEntryCopy = (
  capability: InstallCapability,
  t: TFunction,
): InstallEntryCopy | null => {
  if (capability === "installed" || capability === "unsupported") return null;

  return {
    label: t("installPromotion.entry.label"),
    description: t(`installPromotion.entry.description.${getBodyKeySuffix(capability)}`),
    actionLabel: isManualCapability(capability)
      ? t("installPromotion.actions.howToInstall")
      : t("installPromotion.actions.install"),
  };
};

export const getInstallInstructionsCopy = (
  capability: InstallCapability,
  t: TFunction,
): InstallInstructionsCopy | null => {
  if (capability === "manual_ios_ipados") {
    return {
      title: t("installPromotion.instructions.ios.title"),
      subtitle: t("installPromotion.instructions.ios.subtitle"),
      closeLabel: t("installPromotion.actions.close"),
      steps: [
        {
          id: "share",
          title: t("installPromotion.instructions.ios.steps.share.title"),
          body: t("installPromotion.instructions.ios.steps.share.body"),
        },
        {
          id: "home",
          title: t("installPromotion.instructions.ios.steps.home.title"),
          body: t("installPromotion.instructions.ios.steps.home.body"),
        },
        {
          id: "webapp",
          title: t("installPromotion.instructions.ios.steps.webapp.title"),
          body: t("installPromotion.instructions.ios.steps.webapp.body"),
        },
        {
          id: "add",
          title: t("installPromotion.instructions.ios.steps.add.title"),
          body: t("installPromotion.instructions.ios.steps.add.body"),
        },
      ],
    };
  }

  if (capability === "manual_macos_safari") {
    return {
      title: t("installPromotion.instructions.mac.title"),
      subtitle: t("installPromotion.instructions.mac.subtitle"),
      closeLabel: t("installPromotion.actions.close"),
      steps: [
        {
          id: "browser",
          title: t("installPromotion.instructions.mac.steps.browser.title"),
          body: t("installPromotion.instructions.mac.steps.browser.body"),
        },
        {
          id: "share",
          title: t("installPromotion.instructions.mac.steps.share.title"),
          body: t("installPromotion.instructions.mac.steps.share.body"),
        },
        {
          id: "dock",
          title: t("installPromotion.instructions.mac.steps.dock.title"),
          body: t("installPromotion.instructions.mac.steps.dock.body"),
        },
      ],
    };
  }

  return null;
};
