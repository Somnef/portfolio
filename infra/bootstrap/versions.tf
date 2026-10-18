terraform {
  required_version = "~> 1.16"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.69"
    }
  }

  /*
   * Bootstrap deliberately starts on LOCAL state. It creates the very bucket
   * every other configuration keeps its state in, so on the first apply there
   * is nowhere remote to put its own state yet.
   *
   * After that first apply, uncomment the block below and run
   *   terraform init -migrate-state
   * to move this state into the bucket it just created. Until you do, the
   * only copy of it is terraform.tfstate in this directory - and losing it
   * means the CI roles and the OIDC provider become orphaned, adoptable only
   * by `terraform import`. docs/oidc.md spells the migration out.
   */

  # backend "s3" {
  #   key          = "bootstrap/terraform.tfstate"
  #   use_lockfile = true
  #   encrypt      = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.tags
  }
}
