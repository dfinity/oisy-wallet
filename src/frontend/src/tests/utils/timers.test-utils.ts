const originalTimeout = setTimeout;

// When awaiting a resolved promise, the code after it doesn't happen
// immediately. This can be confusing in tests if you have expectations based
// on that code. Calling `await runResolvedPromises()` after some async code
// will make sure everything that doesn't depend on future events has already
// executed.
export const runResolvedPromises = () => new Promise((resolve) => originalTimeout(resolve, 0));
