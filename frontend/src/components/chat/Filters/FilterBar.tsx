import React, { useCallback } from "react";
import {
    AddPill,
    Bar,
    PillsRow,
    RemoveButton,
    Section,
    SectionLabel,
    TagPill,
    TogglePill,
    PillText,
} from "./FilterBar.styles";

export type ChatFilters = {
    diet: Array<"Fleisch" | "Vegetarisch" | "Vegan">;
    mensas: string[];
    allergens: string[];
};

type Props = {
    value: ChatFilters;
    onChange: (next: ChatFilters) => void;
};

const toggle = <T,>(arr: T[], item: T) =>
    arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];

const promptAdd = (title: string) => {
    const raw = window.prompt(title);
    const v = (raw ?? "").trim();
    return v ? v : null;
};

const FilterBar: React.FC<Props> = ({ value, onChange }) => {
    const onToggleDiet = useCallback(
        (d: ChatFilters["diet"][number]) => {
            onChange({ ...value, diet: toggle(value.diet, d) });
        },
        [onChange, value]
    );

    const onAddMensa = useCallback(() => {
        const v = promptAdd("Mensa hinzufügen");
        if (!v || value.mensas.includes(v)) return;
        onChange({ ...value, mensas: [...value.mensas, v] });
    }, [onChange, value]);

    const onAddAllergen = useCallback(() => {
        const v = promptAdd("Allergen hinzufügen");
        if (!v || value.allergens.includes(v)) return;
        onChange({ ...value, allergens: [...value.allergens, v] });
    }, [onChange, value]);

    const onRemove = useCallback(
        (kind: "mensas" | "allergens", tag: string) => {
            onChange({ ...value, [kind]: value[kind].filter((t) => t !== tag) });
        },
        [onChange, value]
    );

    return (
        <Bar aria-label="Chat Filter">
            <Section>
                <SectionLabel>Ernährung</SectionLabel>
                <PillsRow>
                    {(["Fleisch", "Vegetarisch", "Vegan"] as const).map((d) => (
                        <TogglePill
                            key={d}
                            type="button"
                            $active={value.diet.includes(d)}
                            onClick={() => onToggleDiet(d)}
                        >
                            <PillText>{d}</PillText>
                        </TogglePill>
                    ))}
                </PillsRow>
            </Section>

            <Section>
                <SectionLabel>Mensen</SectionLabel>
                <PillsRow>
                    <AddPill type="button" onClick={onAddMensa} aria-label="Mensa hinzufügen">
                        +
                    </AddPill>

                    {value.mensas.map((m) => (
                        <TagPill key={m} type="button" title={m}>
                            <PillText>{m}</PillText>
                            <RemoveButton
                                type="button"
                                aria-label="Mensa entfernen"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove("mensas", m);
                                }}
                            >
                                ×
                            </RemoveButton>
                        </TagPill>
                    ))}
                </PillsRow>
            </Section>

            <Section>
                <SectionLabel>Allergene</SectionLabel>
                <PillsRow>
                    <AddPill type="button" onClick={onAddAllergen} aria-label="Allergen hinzufügen">
                        +
                    </AddPill>

                    {value.allergens.map((a) => (
                        <TagPill key={a} type="button" title={a}>
                            <PillText>{a}</PillText>
                            <RemoveButton
                                type="button"
                                aria-label="Allergen entfernen"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove("allergens", a);
                                }}
                            >
                                ×
                            </RemoveButton>
                        </TagPill>
                    ))}
                </PillsRow>
            </Section>
        </Bar>
    );
};

export default FilterBar;
