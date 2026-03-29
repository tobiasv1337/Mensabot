import React from "react";
import { Button } from "@/shared/ui/button/Button";
import { InstallIcon } from "@/shared/ui/icons";
import * as S from "./installPrompt.styles";

type InstallPromptCardProps = {
  placement?: "viewport" | "chat";
  chatOffset?: number;
  title: string;
  body: string;
  actionLabel: string;
  maybeLaterLabel: string;
  dismissLabel: string;
  onAction: () => void;
  onMaybeLater: () => void;
  onDismiss: () => void;
};

const InstallPromptCard: React.FC<InstallPromptCardProps> = ({
  placement = "viewport",
  chatOffset,
  title,
  body,
  actionLabel,
  maybeLaterLabel,
  dismissLabel,
  onAction,
  onMaybeLater,
  onDismiss,
}) => (
  <S.CardShell $placement={placement} $chatOffset={chatOffset} role="status" aria-live="polite">
    <S.Header>
      <S.IconBadge aria-hidden="true">
        <InstallIcon />
      </S.IconBadge>
      <S.HeaderContent>
        <S.Title>{title}</S.Title>
        <S.Body>{body}</S.Body>
      </S.HeaderContent>
    </S.Header>

    <S.ActionRow>
      <Button type="button" variant="accent1" onClick={onAction}>
        {actionLabel}
      </Button>
      <S.SecondaryActions>
        <Button type="button" variant="surfaceInsetBorder" onClick={onMaybeLater}>
          {maybeLaterLabel}
        </Button>
        <S.DismissButton type="button" onClick={onDismiss}>
          {dismissLabel}
        </S.DismissButton>
      </S.SecondaryActions>
    </S.ActionRow>
  </S.CardShell>
);

export default InstallPromptCard;
