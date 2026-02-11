import React, { useCallback, useMemo } from "react";
import type { Canteen } from "../../services/api";
import { MensaBotClient } from "../../services/api";
import type { ChatFilters } from "../../services/chats";
import ScrollablePillRow from "./ScrollablePillRow";
import CanteenSelector from "./CanteenSelector";
import { ALLERGENS, DIET_OPTIONS, getAllergenLabel } from "./filterData";
import * as S from "./chat.styles";

type FiltersEditorProps = {
  filters: ChatFilters;
  onChange: (next: ChatFilters) => void;
  client: MensaBotClient;
};

const FiltersEditor: React.FC<FiltersEditorProps> = ({ filters, onChange, client }) => {
  const updateFiltersPartial = useCallback(
    (partial: Partial<ChatFilters>) => {
      onChange({ ...filters, ...partial });
    },
    [filters, onChange]
  );

  const availableAllergens = useMemo(
    () =>
      ALLERGENS.filter((allergen) => !filters.allergens.includes(allergen.key)).sort((a, b) =>
        a.label.localeCompare(b.label, "de")
      ),
    [filters.allergens]
  );

  const handleAddAllergen = useCallback(
    (allergen: string) => {
      if (filters.allergens.includes(allergen)) return;
      updateFiltersPartial({ allergens: [...filters.allergens, allergen] });
    },
    [filters.allergens, updateFiltersPartial]
  );

  const handleRemoveAllergen = useCallback(
    (allergen: string) => {
      updateFiltersPartial({ allergens: filters.allergens.filter((item) => item !== allergen) });
    },
    [filters.allergens, updateFiltersPartial]
  );

  const handleAddCanteen = useCallback(
    (canteen: Canteen) => {
      if (filters.canteens.some((item) => item.id === canteen.id)) return;
      updateFiltersPartial({ canteens: [...filters.canteens, canteen] });
    },
    [filters.canteens, updateFiltersPartial]
  );

  const handleRemoveCanteen = useCallback(
    (canteenId: number) => {
      updateFiltersPartial({ canteens: filters.canteens.filter((item) => item.id !== canteenId) });
    },
    [filters.canteens, updateFiltersPartial]
  );

  return (
    <>
      <S.FilterSection>
        <S.FilterLabel>Ernährungsweise</S.FilterLabel>
        <ScrollablePillRow>
          {DIET_OPTIONS.map((option) => (
            <S.PillButton
              key={option.label}
              type="button"
              $selected={filters.diet === option.value}
              $removable={filters.diet === option.value}
              onClick={() =>
                updateFiltersPartial({
                  diet: filters.diet === option.value ? null : option.value,
                })
              }
            >
              {filters.diet === option.value && <S.PillRemove>×</S.PillRemove>}
              <S.PillIcon>
                <img src={option.iconSrc} alt="" aria-hidden="true" />
              </S.PillIcon>
              {option.label}
            </S.PillButton>
          ))}
        </ScrollablePillRow>
      </S.FilterSection>

      <S.FilterSection>
        <S.FilterLabel>Allergene</S.FilterLabel>
        <ScrollablePillRow>
          {[...filters.allergens, ...availableAllergens.map((allergen) => allergen.key)].map((allergenKey) => {
            const isSelected = filters.allergens.includes(allergenKey);
            return (
              <S.PillButton
                key={allergenKey}
                type="button"
                $selected={isSelected}
                $removable={isSelected}
                onClick={() => (isSelected ? handleRemoveAllergen(allergenKey) : handleAddAllergen(allergenKey))}
              >
                {isSelected && <S.PillRemove>×</S.PillRemove>}
                {getAllergenLabel(allergenKey)}
              </S.PillButton>
            );
          })}
        </ScrollablePillRow>
      </S.FilterSection>

      <S.FilterSection>
        <S.FilterLabel>Mensa</S.FilterLabel>
        <CanteenSelector
          client={client}
          selectedCanteens={filters.canteens}
          onAdd={handleAddCanteen}
          onRemove={handleRemoveCanteen}
        />
      </S.FilterSection>
    </>
  );
};

export default FiltersEditor;
