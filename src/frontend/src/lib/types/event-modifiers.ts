import type { Nullish } from '@dfinity/zod-schemas';

export type OnEventParam<E extends Event = Event, T extends EventTarget = EventTarget> = E & {
	currentTarget: EventTarget & T;
};

export type OnEventCallback<E extends Event = Event, T extends EventTarget = EventTarget> = (
	$event: OnEventParam<E, T>
) => void | Promise<void>;

export type OptionalOnEventCallback<
	E extends Event = Event,
	T extends EventTarget = EventTarget
> = Nullish<OnEventCallback<E, T>>;
