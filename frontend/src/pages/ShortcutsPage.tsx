import React, { useEffect, useMemo, useState } from "react";
import { getApiClient } from "../services/apiClient";
import type { Shortcut, ShortcutInput } from "../services/shortcuts";
import { defaultChatFilters } from "../services/chats";
import ShortcutModal from "../components/shortcuts/ShortcutModal";
import ConfirmModal from "../components/modal/ConfirmModal";
import { DIET_OPTIONS, getAllergenLabel } from "../components/chat/filterData";
import * as S from "./ShortcutsPage.styles";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const client = useMemo(() => getApiClient(), []);
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
          <S.Title>{t('shortcuts.title')}</S.Title>
          <S.Subtitle>
            {t('shortcuts.subtitle')}
          </S.Subtitle>
        </div>
        <S.PrimaryButton type="button" onClick={openCreate}>
          {t('shortcuts.newShortcut')}
        </S.PrimaryButton>
      </S.HeaderRow>

      {sortedShortcuts.length === 0 ? (
        <S.EmptyState>{t('shortcuts.empty')}</S.EmptyState>
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
              shortcut.filters.canteens.length > 0 ? t('shortcuts.canteensCount', { count: shortcut.filters.canteens.length }) : null;

            return (
              <S.Card key={shortcut.id}>
                <S.CardHeader>
                  <div>
                    <S.CardTitle>{shortcut.name}</S.CardTitle>
                    <S.CardPrompt>{shortcut.prompt.trim() || t('shortcuts.noPrompt')}</S.CardPrompt>
                  </div>
                  <S.CardActions>
                    <S.ActionButton type="button" onClick={() => openEdit(shortcut)} aria-label={`${shortcut.name} ${t('shortcuts.edit')}`}>
                      {t('shortcuts.edit')}
                    </S.ActionButton>
                    <S.ActionButton type="button" $variant="danger" onClick={() => handleDelete(shortcut)} aria-label={`${shortcut.name} ${t('shortcuts.delete')}`}>
                      {t('shortcuts.delete')}
                    </S.ActionButton>
                  </S.CardActions>
                </S.CardHeader>

                <S.MetaRow>
                  {dietLabel && <S.MetaChip>{t('shortcuts.diet')}: {dietLabel}</S.MetaChip>}
                  {allergensLabel && <S.MetaChip>{t('shortcuts.allergens')}: {allergensLabel}</S.MetaChip>}
                  {canteensLabel && <S.MetaChip>{canteensLabel}</S.MetaChip>}
                  {!dietLabel && !allergensLabel && !canteensLabel && <S.MetaChip>{t('shortcuts.noFilters')}</S.MetaChip>}
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
          value={draft}
          onChange={setDraft}
          client={client}
          onCancel={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          isOpen={Boolean(deleteTarget)}
          title={t('shortcuts.deleteTitle')}
          subtitle={t('shortcuts.deleteSubtitle', { name: deleteTarget.name })}
          summary={{ label: t('shortcuts.deleteSummaryLabel'), value: deleteTarget.name }}
          note={t('shortcuts.deleteNote')}
          confirmLabel={t('shortcuts.delete')}
          cancelLabel={t('shortcuts.cancel')}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </S.Page>
  );
};

export default ShortcutsPage;
