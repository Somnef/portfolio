/*
 * Nothing here has an environment-specific default. The repo is public, so
 * account-shaped values (region, bucket names, the GitHub identity) arrive
 * through terraform.tfvars, which is git-ignored. terraform.tfvars.example
 * shows the shape.
 */

variable "aws_region" {
  description = "Region for the state bucket and the CI roles."
  type        = string
}

variable "project" {
  description = "Short slug used to name and tag everything this stack creates."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9-]{3,24}$", var.project))
    error_message = "project must be 3-24 characters of lowercase letters, digits or hyphens."
  }
}

variable "state_bucket_name" {
  description = "Globally unique name for the Terraform state bucket."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$", var.state_bucket_name))
    error_message = "state_bucket_name must be a valid S3 bucket name (3-63 chars, lowercase)."
  }
}

# --- GitHub identity -------------------------------------------------------

variable "github_owner" {
  description = "GitHub account or org that owns the repository, e.g. octocat."
  type        = string
}

variable "github_repo" {
  description = "Repository name, without the owner."
  type        = string
}

/*
 * The numeric IDs are only used by the immutable subject format. They are
 * public information for a public repository; read them with
 *   gh api repos/OWNER/REPO --jq '{repo_id: .id, owner_id: .owner.id}'
 */

variable "github_owner_id" {
  description = "Numeric GitHub account ID of github_owner. Only used when use_immutable_subject is true."
  type        = number
  default     = null
}

variable "github_repo_id" {
  description = "Numeric GitHub repository ID. Only used when use_immutable_subject is true."
  type        = number
  default     = null
}

variable "use_immutable_subject" {
  description = <<-DESC
    Which `sub` claim format GitHub mints for this repository.

    Repositories created after 2026-07-15 use the immutable format, which
    embeds the numeric owner and repo IDs:
      repo:OWNER@OWNER-ID/REPO@REPO-ID:ref:refs/heads/main
    Older repositories use the name-based format:
      repo:OWNER/REPO:ref:refs/heads/main

    Getting this wrong produces a trust policy that never matches, and the
    resulting AssumeRoleWithWebIdentity denial does not say why. Run
    oidc-check.yml, which prints the real subject, before relying on it.
  DESC
  type        = bool
  default     = true

  validation {
    condition     = !var.use_immutable_subject || (var.github_owner_id != null && var.github_repo_id != null)
    error_message = "use_immutable_subject = true requires github_owner_id and github_repo_id to be set."
  }
}

# --- Environments ----------------------------------------------------------

variable "infra_environment" {
  description = "GitHub environment name that gates terraform apply."
  type        = string
  default     = "infra"
}

variable "production_environment" {
  description = "GitHub environment name that gates the site deploy."
  type        = string
  default     = "production"
}

# --- Resources owned by infra/main, referenced here by name ----------------

/*
 * The CI role policies have to name resources that infra/main creates. The
 * two stacks are in separate states, so these are plain name patterns rather
 * than Terraform references (PLAN.md 3.8/28). Keep them in step by hand.
 */

variable "site_bucket_name" {
  description = "Name of the static site bucket that infra/main creates, which ci-site-deploy may write to."
  type        = string
}

variable "cloudfront_distribution_arn" {
  description = <<-DESC
    ARN of the CloudFront distribution ci-site-deploy may invalidate. The
    distribution does not exist until infra/main is applied, so this is "*"
    until then; narrow it once the real ARN is known.
  DESC
  type        = string
  default     = "*"
}

# --- Toggles ---------------------------------------------------------------

variable "create_oidc_provider" {
  description = <<-DESC
    Create the GitHub OIDC provider, or adopt the existing one.

    An AWS account may hold exactly one provider per issuer URL. Set this to
    false if something else in the account already registered
    token.actions.githubusercontent.com, and it will be looked up instead.

    Decide this BEFORE the first apply. Flipping it to false afterwards
    destroys the provider this stack created and breaks every CI role;
    prevent_destroy on the resource stops that at plan time.
  DESC
  type        = bool
  default     = true
}

variable "tags" {
  description = "Extra tags merged into the defaults applied to every resource."
  type        = map(string)
  default     = {}
}
