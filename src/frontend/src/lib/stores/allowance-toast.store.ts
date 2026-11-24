import { writable } from 'svelte/store';

// The toast a charged call (CC) the OISY allowance could not pay needs: the allowance-issue toast,
// saying so when the user's own cycles paid instead (`ownCycles`), or the warning that the CC costs
// more than the OISY allowance covers. The shared signer module only sets it, since a worker loads
// that module too and can't show toasts; the app shows them. Each toast asked for is a new object,
// so the same toast asked for twice reaches the app twice.
export type AllowanceToast = { toast: 'issue'; ownCycles?: boolean } | { toast: 'exceeded' };

export const allowanceToastStore = writable<AllowanceToast | undefined>(undefined);
