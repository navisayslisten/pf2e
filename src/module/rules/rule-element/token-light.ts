import { ActorPF2e } from "@actor";
import { ItemPF2e } from "@item";
import { isObject } from "@util";
import { RuleElementData, RuleElementOptions, RuleElementPF2e } from "./index.ts";
import { RuleElementSource } from "./data.ts";

/**
 * Add or change the light emitted by a token
 * @category RuleElement
 */
class TokenLightRuleElement extends RuleElementPF2e {
    constructor(data: RuleElementSource, item: ItemPF2e<ActorPF2e>, options?: RuleElementOptions) {
        super(data, item, options);
        this.validateData();
    }

    validateData(): void {
        const light = this.data.value;
        if (!isObject<foundry.data.LightSource>(light)) return;

        for (const key of ["dim", "bright"] as const) {
            if (light[key] !== undefined) {
                const resolvedValue = this.resolveValue(light[key]);
                if (typeof resolvedValue === "number") {
                    light[key] = resolvedValue;
                }
            }
        }

        try {
            new foundry.data.LightData(light);
        } catch (error) {
            if (error instanceof Error) this.failValidation(error.message);
        }
    }

    override afterPrepareData(): void {
        if (!this.test()) return;
        this.actor.synthetics.tokenOverrides.light = deepClone(this.data.value);
    }
}

interface TokenLightRuleElement extends RuleElementPF2e {
    data: TokenLightData;
}

interface TokenLightData extends RuleElementData {
    value: DeepPartial<foundry.data.LightSource>;
}

export { TokenLightRuleElement };
