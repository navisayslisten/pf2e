import { PickAThingPrompt, PickAThingConstructorArgs, PickableThing } from "@module/apps/pick-a-thing-prompt";
import { SpellOverlay, SpellOverlayType, SpellSource } from "./data";
import { ErrorPF2e } from "@util";
import { SpellPF2e } from ".";

class SpellOverlayCollection extends Collection<SpellOverlay> {
    constructor(public readonly spell: SpellPF2e, entries?: Record<string, SpellOverlay>) {
        super(Object.entries(entries ?? {}));
    }

    /** Returns all variants based on override overlays */
    get overrideVariants(): Embedded<SpellPF2e>[] {
        return [...this.entries()].reduce((result: Embedded<SpellPF2e>[], [overlayId, data]) => {
            if (data.overlayType === "override") {
                const spell = this.spell.loadVariant({ overlayIds: [overlayId] });
                if (spell) return [...result, spell];
            }
            return result;
        }, []);
    }

    getType(overlayId: string): SpellOverlayType {
        return this.get(overlayId, { strict: true }).overlayType;
    }

    async create(
        overlayType: SpellOverlayType,
        options: { renderSheet: boolean } = { renderSheet: false }
    ): Promise<void> {
        const id = randomID();

        switch (overlayType) {
            case "override":
                await this.spell.update({
                    [`data.overlays.${id}`]: {
                        _id: id,
                        sort: this.overrideVariants.length + 1,
                        overlayType: "override",
                    },
                });
                if (options.renderSheet) {
                    const variantSpell = this.spell.loadVariant({ overlayIds: [id] });
                    if (variantSpell) {
                        variantSpell.sheet.render(true);
                    }
                }
                break;
        }
    }

    async updateOverride(
        variantSpell: Embedded<SpellPF2e>,
        data: Partial<SpellSource>,
        options?: DocumentModificationContext
    ): Promise<Embedded<SpellPF2e>> {
        // Perform local data update of spell variant data
        variantSpell.data.update(data, options);

        // Diff data and only save the difference
        const variantSource = variantSpell.toObject();
        const originSource = this.spell.toObject();
        const difference = diffObject(originSource, variantSource);

        if (Object.keys(difference).length === 0) return variantSpell;
        // Restore overlayType
        difference.overlayType = "override";

        // Delete old entry to ensure clean data
        await this.spell.update(
            {
                [`data.overlays.-=${variantSpell.id}`]: null,
            },
            { render: false }
        );
        // Save new diff object
        await this.spell.update({
            [`data.overlays.${variantSpell.id}`]: difference,
        });

        if (variantSpell.sheet.rendered) {
            variantSpell.sheet.render(true);
        }

        return variantSpell;
    }

    async deleteOverlay(overlayId: string): Promise<void> {
        this.verifyOverlayId(overlayId);

        await this.spell.update({
            [`data.overlays.-=${overlayId}`]: null,
        });
        this.delete(overlayId);
    }

    protected verifyOverlayId(overlayId: string): void {
        if (!this.has(overlayId)) {
            throw ErrorPF2e(
                `Spell ${this.spell.name} (${this.spell.uuid}) does not have an overlay with id: ${overlayId}`
            );
        }
    }
}

class SpellVariantPrompt extends PickAThingPrompt<Embedded<SpellPF2e>> {
    constructor(data: PickAThingConstructorArgs<Embedded<SpellPF2e>>) {
        super(data);
        this.choices = data.choices ?? [];
    }

    static override get defaultOptions(): ApplicationOptions {
        return {
            ...super.defaultOptions,
            width: "auto",
            classes: ["choice-set-prompt"],
        };
    }

    override get template(): string {
        return "systems/pf2e/templates/items/spell-variant-prompt.html";
    }

    protected override getChoices(): PickableThing<Embedded<SpellPF2e>>[] {
        return this.choices;
    }
}

export { SpellOverlayCollection, SpellVariantPrompt };
