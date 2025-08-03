/* eslint-disable vitest/require-top-level-describe */
import { runResolvedPromises } from '$tests/utils/timers.test-utils';

type LogType = 'log' | 'debug' | 'warn' | 'error';

const logTypes: LogType[] = ['log', 'debug', 'warn', 'error'];

let gotLogs = false;
let isLoggingAllowed = false;

const replaceRealLogger = (logType: LogType) => {
	// eslint-disable-next-line no-console
	const realLogger = console[logType];
	// eslint-disable-next-line no-console
	console[logType] = (...args) => {
		gotLogs = true;
		realLogger(...args);
	};
};

for (const logType of logTypes) {
	replaceRealLogger(logType);
}

export const failTestsThatLogToConsole = () => {
	beforeEach(() => {
		gotLogs = false;
	});

	afterEach(async () => {
		await runResolvedPromises();
		if (!isLoggingAllowed && gotLogs) {
			throw new Error(
				'Your test produced console logs, which is not allowed.\n' +
					'If you need console output, mock and expect it in your test.\n' +
					'This failure only happens after your test finishes so if your test had other failures, you can still see them and just ignore this.\n' +
					'If this is only for debugging, call allowLoggingForDebugging()' +
					' from $tests/utils/console.test-utils in your test file.'
			);
		}
		isLoggingAllowed = false;
	});
};

// Use this only when debugging.
export const allowLoggingForDebugging = () => {
	isLoggingAllowed = true;
};

export const disableConsoleLog = () => {
	// eslint-disable-next-line vitest/no-duplicate-hooks,vitest/prefer-hooks-in-order
	beforeEach(() => {
		// We mock console just to avoid unnecessary logs while running the tests
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(console, 'warn').mockImplementation(() => {});
	});
};
