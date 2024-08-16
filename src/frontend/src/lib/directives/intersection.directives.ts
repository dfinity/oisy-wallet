import { type EventDispatcher } from 'svelte';

export const onIntersection = ({
	node,
	dispatch
}: {
	node: HTMLElement;
	dispatch: EventDispatcher<Record<string, boolean>>;
}) => {
	const observer = new IntersectionObserver((entries) => {
		const intersecting = entries.some(({ isIntersecting }) => isIntersecting);

		dispatch('icIntersect', intersecting);
	});

	observer.observe(node);

	return {
		destroy() {
			observer.disconnect();
		}
	};
};
