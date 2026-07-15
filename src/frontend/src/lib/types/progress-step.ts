export type ProgressStepState = 'next' | 'in_progress' | 'completed' | 'failed';

export interface ProgressStep {
	step: string;
	text: string;
	state: ProgressStepState;
}
