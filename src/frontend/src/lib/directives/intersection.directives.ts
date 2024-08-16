import { emit } from '$lib/utils/events.utils';

export const onIntersectionNotCollapsed = (node: HTMLElement) => {
	const observer = new IntersectionObserver(
		(entries, observer) => {
			const intersecting = entries.some(({ isIntersecting }) => isIntersecting);

			emit({ message: 'oisyTitleIntersecting', detail: { intersecting } });

			if (!intersecting) {
				observer.disconnect();
				setTimeout(() => onIntersectionCollapsed(node), 500);
			}
		},
		{
			rootMargin: '-380px 0px 0px',
			threshold: 1
		}
	);

	observer.observe(node);

	return {
		destroy() {
			observer.disconnect();
		}
	};
};

export const onIntersectionCollapsed = (node: HTMLElement) => {
	const observer = new IntersectionObserver(
		(entries, observer) => {
			const intersecting = entries.some(({ isIntersecting }) => isIntersecting);

			emit({ message: 'oisyTitleIntersecting', detail: { intersecting } });

			if (intersecting) {
				observer.disconnect();
				setTimeout(() => onIntersectionNotCollapsed(node), 500);
			}
		},
		{
			rootMargin: '-120px 0px 0px',
			threshold: 1
		}
	);

	observer.observe(node);

	return {
		destroy() {
			observer.disconnect();
		}
	};
};
