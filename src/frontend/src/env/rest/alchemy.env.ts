export const ALCHEMY_API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY;

// Whether an EVM send asks Alchemy when Infura fails a call it depends on (see `InfuraProvider`).
// Flip in code to take Alchemy out of the send path: every call then goes to Infura alone, with
// ethers' own time limits, exactly as before the fallback existed.
export const ALCHEMY_EVM_FALLBACK_ENABLED = true;
