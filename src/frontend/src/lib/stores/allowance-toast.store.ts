import { writable } from 'svelte/store';

// The toast a failed charged call (CC) needs: the allowance-issue toast, or the warning that the
// CC costs more than the OISY allowance covers. The shared signer module only sets it, since a
// worker loads that module too and can't show toasts; the app shows them. Each toast asked for is a
// new object, so the same toast asked for twice reaches the app twice.
export const allowanceToastStore = writable<{ toast: 'issue' | 'exceeded' } | undefined>(undefined);
