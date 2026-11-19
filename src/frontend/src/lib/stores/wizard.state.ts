import type { WizardStep, WizardSteps } from '$lib/types/wizard';

export class WizardStepsState<T extends string = string> {
	public currentStep: WizardStep<T> | undefined;
	public currentStepIndex = 0;
	public previousStepIndex = 0;
	private readonly steps: WizardStep<T>[];

	constructor(steps: WizardSteps<T>) {
		this.steps = steps;
		[this.currentStep] = this.steps;
	}

	public next(): WizardStepsState<T> {
		if (this.currentStepIndex < this.steps.length - 1) {
			this.move(this.currentStepIndex + 1);
		}
		return this;
	}

	public get diff(): number {
		return this.currentStepIndex - this.previousStepIndex;
	}

	public back(): WizardStepsState<T> {
		if (this.currentStepIndex > 0) {
			this.move(this.currentStepIndex - 1);
		}
		return this;
	}

	public set(newStep: number): WizardStepsState<T> {
		this.move(newStep);
		return this;
	}

	private move(nextStep: number) {
		this.previousStepIndex = this.currentStepIndex;
		this.currentStepIndex = nextStep;
		this.currentStep = this.steps[this.currentStepIndex];
	}
}
