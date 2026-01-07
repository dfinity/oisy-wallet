export interface PlausibleTracker {
	init: (options?: Record<string, unknown>) => void;
	track: (eventName: string, options?: Record<string, unknown>) => void;
}

const tracker: PlausibleTracker = {
	init: () => {
		// no-op in tests
	},
	track: () => {
		// no-op in tests
	}
};

export default tracker;
