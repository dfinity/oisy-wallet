import {
	connectMobileSheetDismiss,
	nativeSheetsAvailable,
	presentMobileSheet
} from '$lib/services/mobile-host.services';
import { busy } from '$lib/stores/busy.store';
import { focusTopmostOverlay, requestTopmostOverlayClose } from '$lib/utils/overlay.utils';
import type { PluginListenerHandle } from '@capacitor/core';
import { tick } from 'svelte';
import { get } from 'svelte/store';

interface SheetOptions {
	enabled: boolean;
	size: 'medium' | 'large';
}
interface Entry {
	node: HTMLElement;
	root: HTMLElement;
	size: SheetOptions['size'];
	leaving: boolean;
	group?: SheetGroup;
}
interface SheetGroup {
	id: string;
	size: SheetOptions['size'];
	entries: Set<Entry>;
	closing: boolean;
	failed: boolean;
	work: Promise<void>;
	listener?: PluginListenerHandle;
}
const waiting = new Set<Entry>();
let current: SheetGroup | undefined;

const clearEntry = (entry: Entry) => {
	delete entry.node.dataset.nativeSheetPanel;
	delete entry.root.dataset.nativeSheetRoot;
	delete entry.root.dataset.nativeSheetPending;
};
const request = ({
	group,
	phase
}: {
	group: SheetGroup;
	phase: 'prepare' | 'present' | 'dismiss' | 'release';
}) => presentMobileSheet({ id: group.id, size: group.size, phase });

// One native container, one existing WebView and one session. Nested web dialogs
// keep their existing focus/validation stack inside that container.
const startNext = () => {
	if (current || waiting.size === 0) {
		return;
	}
	const entries = new Set(waiting);
	waiting.clear();
	const group: SheetGroup = {
		id: crypto.randomUUID(),
		size: [...entries].some(({ size }) => size === 'large') ? 'large' : 'medium',
		entries,
		closing: false,
		failed: false,
		work: Promise.resolve()
	};
	current = group;
	for (const entry of entries) {
		entry.group = group;
	}
	group.work = (async () => {
		group.listener = await connectMobileSheetDismiss((id) => {
			if (current === group && id === group.id && !group.closing && !get(busy)) {
				requestTopmostOverlayClose();
			}
		});
		await tick();
		await request({ group, phase: 'prepare' });
		if (group.failed) {
			return;
		}
		document.body.dataset.nativeSheetHost = group.id;
		for (const entry of group.entries) {
			entry.node.dataset.nativeSheetPanel = group.id;
			entry.root.dataset.nativeSheetRoot = group.id;
			delete entry.root.dataset.nativeSheetPending;
		}
		await tick();
		await request({ group, phase: 'present' });
		if (!group.closing) {
			focusTopmostOverlay();
		}
	})().catch(async () => {
		// Unsupported/failed presentation falls back to the same web dialog.
		group.failed = true;
		for (const entry of group.entries) {
			clearEntry(entry);
		}
		if (document.body.dataset.nativeSheetHost === group.id) {
			delete document.body.dataset.nativeSheetHost;
		}
		await request({ group, phase: 'release' }).catch(() => undefined);
		focusTopmostOverlay();
	});
};

const dismissIfLeaving = (group: SheetGroup) => {
	if (group.closing || [...group.entries].some((entry) => !entry.leaving)) {
		return;
	}
	group.closing = true;
	group.work = group.work.then(async () => {
		if (!group.failed) {
			await request({ group, phase: 'dismiss' }).catch(() => undefined);
		}
	});
};
const releaseIfEmpty = (group: SheetGroup) => {
	if (group.entries.size !== 0) {
		return;
	}
	dismissIfLeaving(group);
	group.work = group.work.then(async () => {
		await request({ group, phase: 'release' }).catch(() => undefined);
		await group.listener?.remove().catch(() => undefined);
		if (document.body.dataset.nativeSheetHost === group.id) {
			delete document.body.dataset.nativeSheetHost;
		}
		if (current === group) {
			current = undefined;
		}
		startNext();
	});
};

/** Svelte action on the existing sheet panel; it never serializes its content. */
// Svelte action parameters are positional.
// eslint-disable-next-line local-rules/prefer-object-params
export const nativeSheet = (node: HTMLElement, options: SheetOptions) => {
	if (!options.enabled || !nativeSheetsAvailable()) {
		return;
	}
	const entry: Entry = {
		node,
		root: node.classList.contains('bottom-sheet')
			? (node.parentElement ?? node)
			: (node.closest<HTMLElement>('.modal') ?? node),
		size: options.size,
		leaving: false
	};
	if (current && !current.closing) {
		entry.group = current;
		current.entries.add(entry);
		if (!current.failed) {
			if (options.size === 'large' && current.size !== 'large') {
				const group = current;
				group.size = 'large';
				group.work = group.work.then(async () => {
					if (!group.failed && !group.closing) {
						await request({ group, phase: 'present' }).catch(() => undefined);
					}
				});
			}
			node.dataset.nativeSheetPanel = current.id;
			entry.root.dataset.nativeSheetRoot = current.id;
		}
	} else {
		entry.root.dataset.nativeSheetPending = 'true';
		waiting.add(entry);
		startNext();
	}
	const leaving = () => {
		entry.leaving = true;
		if (entry.group) {
			dismissIfLeaving(entry.group);
		}
	};
	node.addEventListener('outrostart', leaving);
	return {
		destroy: () => {
			node.removeEventListener('outrostart', leaving);
			waiting.delete(entry);
			clearEntry(entry);
			if (entry.group) {
				entry.group.entries.delete(entry);
				releaseIfEmpty(entry.group);
			}
		}
	};
};
