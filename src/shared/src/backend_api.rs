use crate::types::*;
use candid::{self, Principal};
use ic_cdk::api::call::CallResult as Result;

pub struct Service(pub Principal);
impl Service {
  pub async fn set_guards(&self, arg0: Guards) -> Result<()> {
    ic_cdk::call(self.0, "set_guards", (arg0,)).await
  }
}

