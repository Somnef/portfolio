terraform {
  required_version = "~> 1.16"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.69"
    }
  }

  /*
   * This state lives in the bucket this stack creates. That is circular on a
   * first apply into a fresh account, where the bucket does not exist yet:
   * comment the block out, apply on local state, then restore it and run
   *   terraform init -migrate-state
   * to move the state into the new bucket. docs/oidc.md spells this out.
   */

  backend "s3" {
    key          = "bootstrap/terraform.tfstate"
    use_lockfile = true
    encrypt      = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.tags
  }
}
