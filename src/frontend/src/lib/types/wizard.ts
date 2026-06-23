export interface WizardStep<T extends string = string> {
	readonly name: T;
	readonly title: string;
}

export type WizardSteps<T extends string = string> = [WizardStep<T>, ...WizardStep<T>[]];
