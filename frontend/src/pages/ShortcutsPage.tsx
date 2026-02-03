import React, { useEffect, useMemo, useState } from "react";
import { MensaBotClient } from "../services/api";
import type { Shortcut, ShortcutInput } from "../services/shortcuts";
import { defaultChatFilters } from "../services/chats";
import ShortcutModal from "../components/shortcuts/ShortcutModal";
import * as ModalStyles from "../components/shortcuts/shortcuts.styles";
import { DIET_OPTIONS, getAllergenLabel } from "../components/chat/filterData";
import * as ChatStyles from "../components/chat/chat.styles";
import * as S from "./ShortcutsPage.styles";

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "";

type ShortcutsPageProps = {
  shortcuts: Shortcut[];
  onCreateShortcut: (data: ShortcutInput) => void;
  onUpdateShortcut: (id: string, data: ShortcutInput) => void;
  onDeleteShortcut: (id: string) => void;
};

const ShortcutsPage: React.FC<ShortcutsPageProps> = ({
  shortcuts,
  onCreateShortcut,
  onUpdateShortcut,
  onDeleteShortcut,
}) => {
  const client = useMemo(() => new MensaBotClient(API_BASE_URL), [API_BASE_URL]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Shortcut | null>(null);
  const [draft, setDraft] = useState<ShortcutInput>({
    name: "",
    prompt: "",
    filters: defaultChatFilters,
  });

  const sortedShortcuts = useMemo(
    () => [...shortcuts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [shortcuts]
  );

  const openCreate = () => {
    setDraft({
      name: "",
      prompt: "",
      filters: defaultChatFilters,
    });
    setEditingId(null);
    setModalMode("create");
    setModalOpen(true);
  };

  const openEdit = (shortcut: Shortcut) => {
    setDraft({
      name: shortcut.name,
      prompt: shortcut.prompt,
      filters: shortcut.filters,
    });
    setEditingId(shortcut.id);
    setModalMode("edit");
    setModalOpen(true);
  };

  const handleSave = (data: ShortcutInput) => {
    if (modalMode === "edit" && editingId) {
      onUpdateShortcut(editingId, data);
    } else {
      onCreateShortcut(data);
    }
    setModalOpen(false);
  };

  const handleDelete = (shortcut: Shortcut) => {
    setDeleteTarget(shortcut);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    onDeleteShortcut(deleteTarget.id);
    setDeleteTarget(null);
  };

  useEffect(() => {
    if (!deleteTarget) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDeleteTarget(null);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [deleteTarget]);

  return (
    <S.Page>
      <S.HeaderRow>
        <div>
          <S.Title>Shortcuts</S.Title>
          <S.Subtitle>
            Speichere häufige Anfragen inklusive Filtersätze. Shortcuts lassen sich hier bearbeiten und löschen.
          </S.Subtitle>
        </div>
        <S.PrimaryButton type="button" onClick={openCreate}>
          Neuer Shortcut
        </S.PrimaryButton>
      </S.HeaderRow>

      {sortedShortcuts.length === 0 ? (
        <S.EmptyState>Du hast noch keine Shortcuts gespeichert.</S.EmptyState>
      ) : (
        <S.Grid>
          {sortedShortcuts.map((shortcut) => {
            const dietLabel =
              DIET_OPTIONS.find((option) => option.value === shortcut.filters.diet)?.label ?? null;
            const allergens = shortcut.filters.allergens.map(getAllergenLabel);
            const allergensLabel =
              allergens.length > 0
                ? `${allergens.slice(0, 3).join(", ")}${allergens.length > 3 ? ` +${allergens.length - 3}` : ""}`
                : null;
            const canteensLabel =
              shortcut.filters.canteens.length > 0 ? `${shortcut.filters.canteens.length} Mensen` : null;

            return (
              <S.Card key={shortcut.id}>
                <S.CardHeader>
                  <div>
                    <S.CardTitle>{shortcut.name}</S.CardTitle>
                    <S.CardPrompt>{shortcut.prompt.trim() || "Kein Prompt hinterlegt."}</S.CardPrompt>
                  </div>
                  <S.CardActions>
                    <S.ActionButton type="button" onClick={() => openEdit(shortcut)} aria-label={`${shortcut.name} bearbeiten`}>
                      Bearbeiten
                    </S.ActionButton>
                    <S.ActionButton type="button" $variant="danger" onClick={() => handleDelete(shortcut)} aria-label={`${shortcut.name} löschen`}>
                      Löschen
                    </S.ActionButton>
                  </S.CardActions>
                </S.CardHeader>

                <S.MetaRow>
                  {dietLabel && <S.MetaChip>Ernährung: {dietLabel}</S.MetaChip>}
                  {allergensLabel && <S.MetaChip>Allergene: {allergensLabel}</S.MetaChip>}
                  {canteensLabel && <S.MetaChip>{canteensLabel}</S.MetaChip>}
                  {!dietLabel && !allergensLabel && !canteensLabel && <S.MetaChip>Keine Filter</S.MetaChip>}
                </S.MetaRow>
              </S.Card>
            );
          })}
        </S.Grid>
      )}

      {modalOpen && (
        <ShortcutModal
          isOpen={modalOpen}
          mode={modalMode}
          initialData={draft}
          client={client}
          onCancel={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}

      {deleteTarget && (
        <ModalStyles.ModalBackdrop
          onClick={() => setDeleteTarget(null)}
        >
          <ModalStyles.ModalCard
            role="alertdialog" aria-modal="true" aria-labelledby="delete-confirmation-title" aria-describedby="delete-confirmation-desc"
            onClick={(event) => event.stopPropagation()} tabIndex={-1} ref={(node) => node?.focus()}
          >
            <ModalStyles.ModalHeader>
              <div>
                <ModalStyles.ModalTitle id="delete-confirmation-title">Shortcut löschen</ModalStyles.ModalTitle>
                <ModalStyles.ModalSubtitle id="delete-confirmation-desc">
                  "{deleteTarget.name}" wird dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
                </ModalStyles.ModalSubtitle>
              </div>
              <ModalStyles.CloseButton type="button" onClick={() => setDeleteTarget(null)}>
                Schließen
              </ModalStyles.CloseButton>
            </ModalStyles.ModalHeader>

            <ModalStyles.ModalBody>
              <ModalStyles.FieldGrid>
                <ModalStyles.FieldLabel>Zu löschender Shortcut</ModalStyles.FieldLabel>
                <ModalStyles.DeleteName>{deleteTarget.name}</ModalStyles.DeleteName>
              </ModalStyles.FieldGrid>
            </ModalStyles.ModalBody>

            <ModalStyles.ModalFooter>
              <ModalStyles.FooterNote>Shortcuts werden lokal im Browser gespeichert.</ModalStyles.FooterNote>
              <ChatStyles.ActionButton type="button" $variant="secondary" onClick={() => setDeleteTarget(null)}>
                Abbrechen
              </ChatStyles.ActionButton>
              <ChatStyles.ActionButton type="button" $variant="primary" onClick={confirmDelete}>
                Löschen
              </ChatStyles.ActionButton>
            </ModalStyles.ModalFooter>
          </ModalStyles.ModalCard>
        </ModalStyles.ModalBackdrop>
      )}
    </S.Page>
  );
};

export default ShortcutsPage;
