# main.tf

# Declare the provider
terraform {
  required_providers {
    ic = { source = "dfinity/ic" }
  }
}

# Example IC provider configuration for a single canister
provider "ic" {
  # NOTE: check port against output of `dfx info webserver-port`
  endpoint = "http://localhost:4943"
}

# Create an empty canister
resource "ic_canister" "oisy-frontend" {}
