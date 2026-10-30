import {
	getIdbExtensionPanelSnapshot,
	setIdbExtensionPanelSnapshot
} from '$lib/api/idb-extension-panel.api';
import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import { ExtensionPanelSnapshotSchema } from '$lib/schema/extension.schema';
import type { ExtensionPanelSnapshot } from '$lib/types/extension';
import { isNullish } from '@dfinity/utils';

// The snapshot is a convenience; failing to save or read it must never disturb the panel.
export const saveExtensionPanelSnapshot = async (snapshot: ExtensionPanelSnapshot) => {
	try {
		// Logging out in another OISY tab deletes the caches before this page notices it is signed
		// out. Writing only while the session is still valid keeps that logout from being undone.
		const identity = await AuthClientProvider.getInstance().loadIdentity();

		if (isNullish(identity)) {
			return;
		}

		await setIdbExtensionPanelSnapshot(snapshot);
	} catch (_: unknown) {
		// Nothing to do: the panel shows the sign-in instead of a snapshot.
	}
};

export const loadExtensionPanelSnapshot = async (): Promise<ExtensionPanelSnapshot | null> => {
	try {
		const parsed = ExtensionPanelSnapshotSchema.safeParse(await getIdbExtensionPanelSnapshot());
		return parsed.success ? parsed.data : null;
	} catch (_: unknown) {
		return null;
	}
};
