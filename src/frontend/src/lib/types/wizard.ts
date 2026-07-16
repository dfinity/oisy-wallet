export interface WizardStep<T extends string = string> {
	readonly name: T;
	readonly title: string;
}

export type WizardSteps<T extends string = string> = [WizardStep<T>, ...WizardStep<T>[]];

/**
 * Public instance surface of the {@link WizardModal} component, used to type a
 * `bind:this` reference (e.g. to drive step transitions imperatively). Kept as a
 * standalone generic type so it can be referenced from plain `.ts` modules, where
 * a Svelte component import resolves to a non-generic type.
 */
export interface WizardModal<T extends string = string> {
	currentStep?: WizardStep<T>;
	next: () => void;
	back: () => void;
	set: (step: number) => void;
}
