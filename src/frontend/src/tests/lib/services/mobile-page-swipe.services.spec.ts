import { mobilePageSwipe } from '$lib/services/mobile-page-swipe.services';
import { busy } from '$lib/stores/busy.store';
import { overlayFocus } from '$lib/utils/overlay.utils';
import { tick } from 'svelte';
import { mock } from 'vitest-mock-extended';

const motion = vi.hoisted(() => ({ current: false }));
vi.mock('svelte/motion', () => ({ prefersReducedMotion: motion }));

describe('mobile page swipe', () => {
	let node: HTMLDivElement;
	let action: NonNullable<ReturnType<typeof mobilePageSwipe>>;
	let overlay: ReturnType<typeof overlayFocus>;
	let close: ReturnType<typeof vi.fn<() => void>>;
	let animation: Animation;
	let finish: () => void;
	let animate: ReturnType<typeof vi.fn>;

	const touch = ({
		type,
		x = 4,
		y = 200,
		time = 0,
		multiple = false
	}: {
		type: string;
		x?: number;
		y?: number;
		time?: number;
		multiple?: boolean;
	}) => {
		const point: Touch = {
			identifier: 1,
			clientX: x,
			clientY: y,
			pageX: x,
			pageY: y,
			screenX: x,
			screenY: y,
			radiusX: 1,
			radiusY: 1,
			rotationAngle: 0,
			force: 1,
			target: node
		};
		const event = new TouchEvent(type, {
			bubbles: true,
			cancelable: true,
			touches:
				type === 'touchend' || type === 'touchcancel' ? [] : [point, ...(multiple ? [point] : [])],
			changedTouches: [point]
		});
		Object.defineProperty(event, 'timeStamp', { value: time });
		node.dispatchEvent(event);
		return event;
	};
	const drag = () => {
		touch({ type: 'touchstart' });
		touch({ type: 'touchmove', x: 210, time: 400 });
	};
	const finishAnimation = async () => {
		finish();
		await tick();
		await tick();
	};

	beforeEach(() => {
		busy.stop();
		motion.current = false;
		node = document.createElement('div');
		document.body.append(node);
		vi.spyOn(node, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 390, 844));
		const pending = Promise.withResolvers<Animation>();
		animation = mock<Animation>({
			cancel: vi.fn(() => pending.reject(new Error('cancelled')))
		});
		Object.defineProperty(animation, 'finished', { value: pending.promise });
		finish = () => pending.resolve(animation);
		animate = vi.fn(() => animation);
		Object.defineProperty(node, 'animate', { value: animate, configurable: true });
		close = vi.fn();
		overlay = overlayFocus(node);
		const mounted = mobilePageSwipe(node, { enabled: true, onBack: close });
		if (!mounted) {
			throw new Error('Missing swipe action');
		}
		action = mounted;
	});

	afterEach(() => {
		action.destroy();
		overlay.destroy();
		node.remove();
		busy.stop();
		vi.restoreAllMocks();
	});

	it('tracks the finger and invokes only the guarded Back callback after completing', async () => {
		drag();

		expect(node.style.translate).toBe('206px');

		touch({ type: 'touchend', time: 450 });

		expect(close).not.toHaveBeenCalled();

		await finishAnimation();

		expect(close).toHaveBeenCalledOnce();
		// A callback may keep the form mounted (for example, for confirmation).
		expect(node.style.translate).toBe('');
	});

	it.each(['touchend', 'touchcancel'])(
		'restores a cancelled/short gesture (%s) without losing form state',
		async (type) => {
			node.innerHTML = '<input value="0.125" />';
			touch({ type: 'touchstart' });
			touch({ type: 'touchmove', x: 32, time: 400 });
			touch({ type, time: 450 });
			await finishAnimation();

			expect(close).not.toHaveBeenCalled();
			expect(node.style.translate).toBe('');
			expect(node.querySelector('input')?.value).toBe('0.125');
		}
	);

	it('allows a short fast swipe', async () => {
		touch({ type: 'touchstart' });
		touch({ type: 'touchmove', x: 64, time: 50 });
		touch({ type: 'touchend', time: 60 });
		await finishAnimation();

		expect(close).toHaveBeenCalledOnce();
	});

	it('leaves vertical scrolling and touches away from the edge alone', () => {
		touch({ type: 'touchstart', x: 100 });

		expect(touch({ type: 'touchmove', x: 300, time: 400 }).defaultPrevented).toBeFalsy();

		touch({ type: 'touchend' });
		touch({ type: 'touchstart' });

		expect(touch({ type: 'touchmove', x: 10, y: 260, time: 400 }).defaultPrevented).toBeFalsy();

		touch({ type: 'touchend' });

		expect(animate).not.toHaveBeenCalled();
		expect(close).not.toHaveBeenCalled();
	});

	it.each(['disabled', 'busy', 'nested', 'resize', 'hidden', 'multitouch', 'destroy'])(
		'cancels a pending gesture when %s',
		async (reason) => {
			drag();
			touch({ type: 'touchend', time: 450 });
			const top = document.createElement('div');
			let nested: ReturnType<typeof overlayFocus> | undefined;
			switch (reason) {
				case 'disabled':
					action.update({ enabled: false, onBack: close });
					break;
				case 'busy':
					busy.start();
					break;
				case 'nested':
					document.body.append(top);
					nested = overlayFocus(top);
					break;
				case 'resize':
					window.dispatchEvent(new Event('resize'));
					break;
				case 'hidden':
					document.dispatchEvent(new Event('visibilitychange'));
					break;
				case 'multitouch':
					touch({ type: 'touchstart', multiple: true });
					break;
				case 'destroy':
					action.destroy();
					break;
			}
			await finishAnimation();

			expect(close).not.toHaveBeenCalled();
			expect(node.style.translate).toBe('');

			nested?.destroy();
			top.remove();
		}
	);

	it('never starts while an accessory overlay is on top', () => {
		const top = document.createElement('div');
		document.body.append(top);
		const nested = overlayFocus(top);
		drag();

		expect(node.style.translate).toBe('');

		nested.destroy();
		top.remove();
	});

	it('honors Reduce Motion and keeps the dismissed page offscreen during its outro', async () => {
		motion.current = true;
		close.mockImplementation(() => node.dispatchEvent(new Event('outrostart')));
		drag();
		touch({ type: 'touchend', time: 450 });
		await finishAnimation();

		expect(animate).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ duration: 0 })
		);
		expect(node.style.translate).toBe('390px');
	});
});
