export interface TestUtil {
	setup: () => void;
	teardown: () => void;
	tests: () => void;
}
