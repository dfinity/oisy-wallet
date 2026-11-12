import { blockingOverlayOpenStore } from '$lib/stores/ui.store';
import { overlayFocus } from '$lib/utils/overlay.utils';
import { tick } from 'svelte';
import { get } from 'svelte/store';

const mountOverlay = () => {
	const node = document.createElement('div');
	node.tabIndex = -1;
	node.innerHTML =
		'<button disabled>Disabled</button><button hidden>Hidden</button><button>First</button><button>Last</button>';
	document.body.append(node);
	return node;
};

describe('overlayFocus', () => {
	it('keeps native navigation blocked until every nested overlay has unmounted', () => {
		const outer = mountOverlay();
		const inner = mountOverlay();
		const first = overlayFocus(outer);
		const second = overlayFocus(inner);

		expect(get(blockingOverlayOpenStore)).toBeTruthy();

		first.destroy();

		expect(get(blockingOverlayOpenStore)).toBeTruthy();

		second.destroy();

		expect(get(blockingOverlayOpenStore)).toBeFalsy();

		outer.remove();
		inner.remove();
	});

	it('focuses the first available control, wraps Tab, and restores the trigger', async () => {
		const trigger = document.createElement('button');
		document.body.append(trigger);
		trigger.focus();
		const node = mountOverlay();
		const action = overlayFocus(node);
		await tick();
		const [first, last] = Array.from(node.querySelectorAll('button')).slice(2);

		expect(document.activeElement).toBe(first);

		window.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true })
		);

		expect(document.activeElement).toBe(last);

		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true }));

		expect(document.activeElement).toBe(first);

		action.destroy();

		expect(document.activeElement).toBe(trigger);

		node.remove();
		trigger.remove();
	});

	it('only dismisses the top overlay and does not steal focus when an underlying overlay leaves', async () => {
		const trigger = document.createElement('button');
		document.body.append(trigger);
		trigger.focus();
		const outer = mountOverlay();
		const closeOuter = vi.fn();
		const firstAction = overlayFocus(outer, { onClose: closeOuter });
		await tick();
		const inner = mountOverlay();
		const closeInner = vi.fn();
		const secondAction = overlayFocus(inner, { onClose: closeInner });
		await tick();
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));

		expect(closeInner).toHaveBeenCalledExactlyOnceWith();
		expect(closeOuter).not.toHaveBeenCalled();

		firstAction.destroy();

		expect(inner.contains(document.activeElement)).toBeTruthy();

		outer.remove();
		secondAction.destroy();

		expect(document.activeElement).toBe(trigger);

		trigger.remove();
		inner.remove();
	});

	it('contains focus even when empty, and uses updated dismissal callbacks', async () => {
		const node = document.createElement('div');
		node.tabIndex = -1;
		document.body.append(node);
		const action = overlayFocus(node);
		await tick();
		const event = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
		window.dispatchEvent(event);

		expect(event.defaultPrevented).toBeTruthy();
		expect(document.activeElement).toBe(node);

		const onClose = vi.fn();
		action.update({ onClose });
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));

		expect(onClose).toHaveBeenCalledOnce();

		action.destroy();
		node.remove();
	});

	it('preserves a child that focuses itself before the initial tick', async () => {
		const node = mountOverlay();
		const input = document.createElement('input');
		node.append(input);
		const action = overlayFocus(node);
		input.focus();
		await tick();

		expect(document.activeElement).toBe(input);

		action.destroy();
		node.remove();
	});

	it('ignores Escape while an input method is composing', async () => {
		const node = mountOverlay();
		const onClose = vi.fn();
		const action = overlayFocus(node, { onClose });
		await tick();
		const composing = new KeyboardEvent('keydown', {
			key: 'Escape',
			isComposing: true,
			cancelable: true
		});
		window.dispatchEvent(composing);

		expect(onClose).not.toHaveBeenCalled();
		expect(composing.defaultPrevented).toBeFalsy();

		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));

		expect(onClose).toHaveBeenCalledOnce();

		action.destroy();
		node.remove();
	});

	it('keeps toasts reachable by Tab while an overlay is open, and nothing else outside it', async () => {
		const node = mountOverlay();
		const action = overlayFocus(node);
		await tick();
		const toasts = document.createElement('div');
		toasts.dataset.overlayReachable = '';
		toasts.innerHTML = '<button>Close toast</button>';
		document.body.append(toasts);
		const [first, last] = Array.from(node.querySelectorAll('button')).slice(2);
		const toastClose = toasts.querySelector('button');
		const tab = (shiftKey = false) =>
			window.dispatchEvent(
				new KeyboardEvent('keydown', { key: 'Tab', shiftKey, cancelable: true })
			);

		last.focus();
		tab();

		expect(document.activeElement).toBe(toastClose);

		tab();

		expect(document.activeElement).toBe(first);

		tab(true);

		expect(document.activeElement).toBe(toastClose);

		tab(true);

		expect(document.activeElement).toBe(last);

		const background = document.createElement('button');
		document.body.append(background);
		background.focus();

		expect(node.contains(document.activeElement)).toBeTruthy();

		action.destroy();
		node.remove();
		toasts.remove();
		background.remove();
	});

	it('allows Tab from Close to an iframe and wraps backwards to it', async () => {
		const node = document.createElement('div');
		node.innerHTML = '<button>Close</button><iframe title="Widget"></iframe>';
		document.body.append(node);
		const action = overlayFocus(node);
		await tick();
		const forward = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
		window.dispatchEvent(forward);

		expect(forward.defaultPrevented).toBeFalsy();

		window.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true })
		);

		expect(document.activeElement).toBe(node.querySelector('iframe'));

		action.destroy();
		node.remove();
	});
});
