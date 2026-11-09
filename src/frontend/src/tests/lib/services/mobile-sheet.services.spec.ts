import { nativeSheet } from '$lib/services/mobile-sheet.services';
import { busy } from '$lib/stores/busy.store';
import { overlayFocus } from '$lib/utils/overlay.utils';

const mocks = vi.hoisted(() => ({
	available: vi.fn(),
	request: vi.fn(),
	listen: vi.fn(),
	remove: vi.fn(),
	dismiss: undefined as ((id: string) => void) | undefined
}));
vi.mock('$lib/services/mobile-host.services', () => ({
	nativeSheetsAvailable: mocks.available,
	presentMobileSheet: mocks.request,
	connectMobileSheetDismiss: mocks.listen
}));
const panel = () => {
	const root = document.createElement('div');
	root.className = 'modal';
	const node = document.createElement('div');
	root.append(node);
	document.body.append(root);
	return { root, node };
};
const ready = () =>
	vi.waitFor(() =>
		expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({ phase: 'present' }))
	);
const released = (count = 1) =>
	vi.waitFor(() => {
		expect(document.body.dataset.nativeSheetHost).toBeUndefined();
		expect(mocks.remove).toHaveBeenCalledTimes(count);
	});

describe('shared native sheet lifecycle', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.available.mockReturnValue(true);
		mocks.request.mockResolvedValue(undefined);
		mocks.remove.mockResolvedValue(undefined);
		mocks.listen.mockImplementation((callback: (id: string) => void) => {
			mocks.dismiss = callback;
			return Promise.resolve({ remove: mocks.remove });
		});
		busy.stop();
	});

	afterEach(() => {
		document.body.replaceChildren();
		busy.stop();
	});

	it('keeps existing web sheets on browsers and older native hosts', () => {
		mocks.available.mockReturnValue(false);
		const { root, node } = panel();

		expect(nativeSheet(node, { enabled: true, size: 'large' })).toBeUndefined();
		expect(root.dataset.nativeSheetPending).toBeUndefined();
		expect(mocks.request).not.toHaveBeenCalled();
	});

	it('hides the overlay during the background snapshot and keeps nested close guards', async () => {
		const first = panel();
		const closeFirst = vi.fn();
		const focusFirst = overlayFocus(first.node, { onClose: closeFirst });
		const actionFirst = nativeSheet(first.node, { enabled: true, size: 'large' });

		expect(first.root.dataset.nativeSheetPending).toBe('true');

		await ready();

		expect(first.root.dataset.nativeSheetPending).toBeUndefined();

		const id = first.node.dataset.nativeSheetPanel;

		expect(id).toBeTruthy();

		const second = panel();
		const closeSecond = vi.fn();
		const focusSecond = overlayFocus(second.node, {
			onClose: closeSecond,
			nativeDismissible: false
		});
		const actionSecond = nativeSheet(second.node, { enabled: true, size: 'medium' });
		mocks.dismiss?.(id ?? '');

		expect(closeSecond).not.toHaveBeenCalled();

		focusSecond.update({ onClose: closeSecond });
		mocks.dismiss?.('stale-sheet');

		expect(closeSecond).not.toHaveBeenCalled();

		busy.start();
		mocks.dismiss?.(id ?? '');

		expect(closeSecond).not.toHaveBeenCalled();

		busy.stop();
		mocks.dismiss?.(id ?? '');

		expect(closeSecond).toHaveBeenCalledOnce();
		expect(closeFirst).not.toHaveBeenCalled();

		second.node.dispatchEvent(new Event('outrostart'));
		actionSecond?.destroy();
		focusSecond.destroy();
		second.root.remove();

		expect(mocks.request.mock.calls.filter(([r]) => r.phase === 'dismiss')).toHaveLength(0);

		first.node.dispatchEvent(new Event('outrostart'));
		actionFirst?.destroy();
		focusFirst.destroy();
		first.root.remove();
		await released();

		expect(mocks.request.mock.calls.map(([r]) => r.phase)).toEqual([
			'prepare',
			'present',
			'dismiss',
			'release'
		]);
	});

	it('clears sheet layout before native restores the underlying page', async () => {
		const { node, root } = panel();
		const action = nativeSheet(node, { enabled: true, size: 'large' });
		await ready();
		let finishDismiss: (() => void) | undefined;
		const restoredWithSheetLayout = vi.fn();
		mocks.request.mockImplementation(({ phase }) => {
			if (phase === 'dismiss') {
				return new Promise<void>((resolve) => {
					finishDismiss = resolve;
				});
			}
			if (phase === 'release') {
				restoredWithSheetLayout(!!document.body.dataset.nativeSheetHost);
			}
			return Promise.resolve();
		});
		node.dispatchEvent(new Event('outrostart'));
		action?.destroy();
		root.remove();
		await vi.waitFor(() => expect(finishDismiss).toBeDefined());

		expect(document.body.dataset.nativeSheetHost).toBeTruthy();

		finishDismiss?.();
		await released();
		await vi.waitFor(() => expect(mocks.remove).toHaveBeenCalledOnce());

		expect(restoredWithSheetLayout).toHaveBeenCalledExactlyOnceWith(false);
	});

	it('falls back to the same web dialog if native preparation fails', async () => {
		mocks.request.mockRejectedValueOnce(new Error('Snapshot unavailable'));
		const { node, root } = panel();
		const action = nativeSheet(node, { enabled: true, size: 'medium' });
		await vi.waitFor(() => expect(root.dataset.nativeSheetPending).toBeUndefined());

		expect(node.dataset.nativeSheetPanel).toBeUndefined();
		expect(mocks.request).not.toHaveBeenCalledWith(expect.objectContaining({ phase: 'present' }));

		action?.destroy();
		await vi.waitFor(() => expect(mocks.remove).toHaveBeenCalledOnce());
		await released();
	});

	it('serializes rapid close and reopen without releasing the new sheet', async () => {
		const first = panel();
		const actionFirst = nativeSheet(first.node, { enabled: true, size: 'large' });
		await ready();
		const oldId = first.node.dataset.nativeSheetPanel;
		first.node.dispatchEvent(new Event('outrostart'));
		const next = panel();
		const actionNext = nativeSheet(next.node, { enabled: true, size: 'medium' });
		actionFirst?.destroy();
		first.root.remove();
		await vi.waitFor(() => {
			expect(next.node.dataset.nativeSheetPanel).toBeTruthy();
			expect(next.node.dataset.nativeSheetPanel).not.toBe(oldId);
		});

		expect(document.body.dataset.nativeSheetHost).toBe(next.node.dataset.nativeSheetPanel);

		next.node.dispatchEvent(new Event('outrostart'));
		actionNext?.destroy();
		next.root.remove();
		await released(2);
	});
});
