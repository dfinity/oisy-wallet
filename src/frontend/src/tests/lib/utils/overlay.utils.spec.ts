import { overlayFocus } from '$lib/utils/overlay.utils';
import { tick } from 'svelte';

const mountOverlay = () => {
	const node = document.createElement('div');
	node.tabIndex = -1;
	node.innerHTML =
		'<button disabled>Disabled</button><button hidden>Hidden</button><button>First</button><button>Last</button>';
	document.body.append(node);
	return node;
};

describe('overlayFocus', () => {
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
		expect(inner.contains(document.activeElement)).toBe(true);
		secondAction.destroy();
		outer.remove();
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
		expect(event.defaultPrevented).toBe(true);
		expect(document.activeElement).toBe(node);
		const onClose = vi.fn();
		action.update({ onClose });
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
		expect(onClose).toHaveBeenCalledOnce();
		action.destroy();
		node.remove();
	});
});
