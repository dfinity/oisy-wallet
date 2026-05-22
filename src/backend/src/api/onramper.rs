use ic_cdk::query;
use shared::types::{
    onramper::SignOnramperWidgetUrlRequest, result_types::SignOnramperWidgetUrlResult,
};

use crate::{onramper::service, utils::guards::caller_is_not_anonymous};

/// Sign the three sensitive OnRamper widget parameters with the controller-managed HMAC secret.
///
/// Returns the hex-encoded HMAC-SHA256 the frontend appends to the widget URL as `&signature=…`.
/// Authenticated callers only: anonymous principals cannot extract signatures.
#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn sign_onramper_widget_url(
    req: SignOnramperWidgetUrlRequest,
) -> SignOnramperWidgetUrlResult {
    service::sign_onramper_widget_url(req).into()
}
