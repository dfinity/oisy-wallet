// Only imported by VITE_MOBILE_UI_TEST builds. Never shipped to a phone.
import { authIdentity } from '$lib/derived/auth.derived';
import { personalNotesStore } from '$lib/stores/personal-notes.store';
import { get } from 'svelte/store';

export const installNotesFixture = (): (() => void) => {
	const seed = () => {
		const identity = get(authIdentity);
		if (!identity) {
			return;
		}
		const ownerPrincipal = identity.getPrincipal().toText();
		personalNotesStore.beginLoad({ ownerPrincipal });
		personalNotesStore.setLoaded({ ownerPrincipal, entries: [], count: 0 });
	};
	window.addEventListener('oisyTestEmptyNotes', seed);
	return () => window.removeEventListener('oisyTestEmptyNotes', seed);
};
