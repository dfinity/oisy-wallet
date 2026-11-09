// How often `SendModal` has mounted the stub of its send wizard (`SendModalWizardStub.svelte`):
// one wizard should serve the amount, review and sending steps, since it holds what they share.
let mounts = 0;

export const countStubWizardMount = () => {
	mounts++;
};

export const stubWizardMounts = (): number => mounts;

export const resetStubWizardMounts = () => {
	mounts = 0;
};
