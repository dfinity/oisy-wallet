# main.tf

# Declare the provider
terraform {
  required_providers {
    ic = { source = "dfinity/ic" }
  }
}

# Example IC provider configuration for a single canister
# Docs: https://registry.terraform.io/providers/dfinity/ic/latest/docs
provider "ic" {
  # NOTE: check port against output of `dfx info webserver-port`
  endpoint = "http://localhost:4943"
}

# Oisy backend args
# Docs: https://developer.hashicorp.com/terraform/language/resources/terraform-data
# Docs: https://developer.hashicorp.com/terraform/language/resources/provisioners/local-exec
resource "terraform_data" "oisy_backend_args" {
  provisioner "local-exec" {
    when = always
    command = <<-EOT
      (variant {
        Init = record {
         ecdsa_key_name = "dfx_test_key";
         allowed_callers = vec {};
        }
      })
    EOT
    interpreter = ["didc", "encode", "--format", "hex"]
  }
}

# Create an empty canister
# Docs: https://registry.terraform.io/providers/dfinity/ic/latest/docs/resources/canister
resource "ic_canister" "oisy_backend" {
  wasm_file   = "out/backend.wasm.gz"
  controllers = ["vfm3e-ya34n-35cug-tvdt3-yajjv-ct5pn-a5j43-djtk7-ipzr7-22fv3-iqe", "2vxsx-fae"]
  arg_hex = "${terraform_data.oisy_backend_args.output}"
}
