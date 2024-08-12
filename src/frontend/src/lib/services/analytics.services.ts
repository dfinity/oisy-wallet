import { LOCAL } from '$lib/constants/app.constants';
import { isNullish } from '@dfinity/utils';
import { initOrbiter, trackEvent as trackEventOrbiter } from '@junobuild/analytics';

export const initAnalytics = async () => {
	if (LOCAL) {
		return;
	}

	const SATELLITE_ID = import.meta.env.VITE_JUNO_SATELLITE_ID;
	const ORBITER_ID = import.meta.env.VITE_JUNO_ORBITER_ID;

	if (isNullish(SATELLITE_ID) || isNullish(ORBITER_ID)) {
		return;
	}

	await initOrbiter({
		satelliteId: SATELLITE_ID,
		orbiterId: ORBITER_ID,
		worker: {
			path: '/workers/analytics.worker.js'
		}
	});
};

export const trackEvent = async ({
	name,
	metadata
}: {
	name: string;
	metadata?: Record<string, string>;
}) => {
	if (LOCAL) {
		return;
	}

	await trackEventOrbiter({
		name,
		metadata
	});
};

interface TimedEvent {
	name: string;
	metadata?: Record<string, string>;
	startTime: number;
}

export const initTimedEvent = ({ name, metadata }: Omit<TimedEvent, 'startTime'>): TimedEvent => ({
	name,
	metadata,
	startTime: performance.now()
});

export const trackTimedEventSuccess = async (timedEvent: TimedEvent) => {
	await trackTimedEvent({
		...timedEvent,
		status: 'success'
	});
};

export const trackTimedEventError = async (timedEvent: TimedEvent) => {
	await trackTimedEvent({
		...timedEvent,
		status: 'error'
	});
};

const trackTimedEvent = async ({
	name,
	metadata,
	startTime,
	status
}: TimedEvent & { status: 'success' | 'error' }) => {
	const endTime = performance.now();

	await trackEvent({
		name,
		metadata: {
			...metadata,
			status,
			startTime: `${startTime}`,
			endTime: `${endTime}`,
			duration: `${endTime - startTime}`
		}
	});
};
