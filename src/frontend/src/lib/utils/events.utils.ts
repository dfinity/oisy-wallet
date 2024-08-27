import { pointerEventStore } from '$lib/stores/events.store';

export const emit = <T>({ message, detail }: { message: string; detail?: T | undefined }) => {
	const $event: CustomEvent<T> = new CustomEvent<T>(message, { detail, bubbles: true });
	document.dispatchEvent($event);
};

const pointerEventOn = () => pointerEventStore.set(true);

const pointerEventOff = () => pointerEventStore.set(false);

const pointerEventsHandlers: { [key: string]: EventListener } = {
	pointerenter: pointerEventOn,
	pointerover: pointerEventOn,
	pointerleave: pointerEventOff,
	focus: pointerEventOn,
	focusin: pointerEventOn,
	focusout: pointerEventOff,
	touchstart: pointerEventOn,
	touchmove: pointerEventOn,
	touchend: pointerEventOff
};

export const pointerEventsHandler = (node: HTMLElement) => {
	const eventNames = Object.keys(pointerEventsHandlers);

	eventNames.forEach((event) => {
		node.addEventListener(event, pointerEventsHandlers[event], { passive: true });
	});

	return {
		destroy() {
			eventNames.forEach((event) => {
				node.removeEventListener(event, pointerEventsHandlers[event]);
			});
		}
	};
};
