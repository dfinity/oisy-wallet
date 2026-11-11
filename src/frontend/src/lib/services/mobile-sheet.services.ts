import {
	connectMobileSheetDismiss,
	contentSizedSheetsAvailable,
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
	disconnect?: () => void;
}
interface SheetGroup {
	id: string;
	size: SheetOptions['size'];
	entries: Set<Entry>;
	closing: boolean;
	failed: boolean;
	work: Promise<void>;
	listener?: PluginListenerHandle;
	fitted: boolean;
	height?: number;
	onReleased: (() => void)[];
	frame?: number;
}
const waiting = new Set<Entry>();
let current: SheetGroup | undefined;

/** Wait for UIKit to restore the wallet before navigating out of a sheet menu. */
export const waitForNativeSheetClosed = (): Promise<void> =>
	new Promise((resolve) => {
		if (current) {
			current.onReleased.push(resolve);
		} else {
			resolve();
		}
	});

const clearEntry = (entry: Entry) => {
	entry.disconnect?.();
	delete entry.node.dataset.nativeSheetFitted;
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
}) =>
	presentMobileSheet({
		id: group.id,
		size: group.size,
		phase,
		...(phase === 'present' && group.fitted ? { contentHeight: measure(group) } : {})
	});

// Read the active panel's natural height plus clipped scroll content, not the
// WebView's viewport height. UIKit adds the bottom safe area itself.
const measure = (group: SheetGroup): number => {
	const entry = [...group.entries].filter(({ leaving }) => !leaving).at(-1);
	if (!entry) {
		return group.height ?? 140;
	}
	const { node } = entry;
	const scrollers = [node, ...node.querySelectorAll<HTMLElement>('.content, [data-sheet-body]')];
	const overflow = Math.max(
		0,
		...scrollers.map((element) => element.scrollHeight - element.clientHeight)
	);
	const bottomInset = Number.parseFloat(getComputedStyle(node).paddingBottom) || 0;
	return Math.min(
		100_000,
		Math.max(1, Math.ceil(node.getBoundingClientRect().height + overflow - bottomInset))
	);
};
const scheduleResize = (group: SheetGroup) => {
	if (!group.fitted || group.frame !== undefined || group.closing || group.failed) {
		return;
	}
	group.frame = requestAnimationFrame(() => {
		group.frame = undefined;
		group.work = group.work.then(async () => {
			if (current !== group || group.closing || group.failed) {
				return;
			}
			const height = measure(group);
			if (group.height !== undefined && Math.abs(height - group.height) < 2) {
				return;
			}
			await presentMobileSheet({
				id: group.id,
				size: group.size,
				phase: 'resize',
				contentHeight: height
			})
				.then(() => {
					group.height = height;
				})
				.catch(() => undefined); // Closing/reloading revokes this presentation.
		});
	});
};
const markEntry = ({ entry, group }: { entry: Entry; group: SheetGroup }) => {
	entry.node.dataset.nativeSheetPanel = group.id;
	entry.root.dataset.nativeSheetRoot = group.id;
	delete entry.root.dataset.nativeSheetPending;
	if (!group.fitted) {
		return;
	}
	entry.node.dataset.nativeSheetFitted = 'true';
	if (entry.disconnect) {
		return;
	}
	const resize = () => scheduleResize(group);
	const observer = new ResizeObserver(resize);
	const observe = () => {
		observer.disconnect();
		observer.observe(entry.node);
		for (const element of entry.node.querySelectorAll(
			'.content, .content > *, [data-sheet-body], [data-sheet-body] > *, [data-sheet-content]'
		)) {
			observer.observe(element);
		}
	};
	const mutations = new MutationObserver(() => {
		observe();
		resize();
	});
	mutations.observe(entry.node, { childList: true, subtree: true, characterData: true });
	observe();
	window.addEventListener('resize', resize);
	entry.node.addEventListener('load', resize, true);
	entry.disconnect = () => {
		observer.disconnect();
		mutations.disconnect();
		window.removeEventListener('resize', resize);
		entry.node.removeEventListener('load', resize, true);
	};
};
const stopResizing = (group: SheetGroup) => {
	if (group.frame !== undefined) {
		cancelAnimationFrame(group.frame);
		group.frame = undefined;
	}
	for (const entry of group.entries) {
		entry.disconnect?.();
	}
};

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
		work: Promise.resolve(),
		fitted: contentSizedSheetsAvailable(),
		onReleased: []
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
			markEntry({ entry, group });
		}
		await tick();
		await request({ group, phase: 'present' });
		scheduleResize(group);
		if (!group.closing) {
			focusTopmostOverlay();
		}
	})().catch(async () => {
		// Unsupported/failed presentation falls back to the same web dialog.
		group.failed = true;
		stopResizing(group);
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
	stopResizing(group);
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
		// UIKit still covers the page. Restore web layout before the host reveals it.
		if (document.body.dataset.nativeSheetHost === group.id) {
			delete document.body.dataset.nativeSheetHost;
		}
		await tick();
		await request({ group, phase: 'release' }).catch(() => undefined);
		await group.listener?.remove().catch(() => undefined);
		if (current === group) {
			current = undefined;
		}
		for (const resolve of group.onReleased) {
			resolve();
		}
		group.onReleased.length = 0;
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
			if (!current.fitted && options.size === 'large' && current.size !== 'large') {
				const group = current;
				group.size = 'large';
				group.work = group.work.then(async () => {
					if (!group.failed && !group.closing) {
						await request({ group, phase: 'present' }).catch(() => undefined);
					}
				});
			}
			markEntry({ entry, group: current });
			scheduleResize(current);
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
				scheduleResize(entry.group);
			}
		}
	};
};
