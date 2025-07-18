use std::cell::RefCell;

use super::btc_user_pending_tx_state::BtcUserPendingTransactions;

thread_local! {
  static HEAP_STATE: HeapState = HeapState::default();
}

struct HeapState {
    btc_user_pending_transactions: RefCell<BtcUserPendingTransactions>,
}

impl Default for HeapState {
    fn default() -> Self {
        Self {
            btc_user_pending_transactions: RefCell::new(BtcUserPendingTransactions::new(
                None, None,
            )),
        }
    }
}

pub fn with_btc_pending_transactions<R>(f: impl FnOnce(&mut BtcUserPendingTransactions) -> R) -> R {
    HEAP_STATE.with(|s| f(&mut s.btc_user_pending_transactions.borrow_mut()))
}
