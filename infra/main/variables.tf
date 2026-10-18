/*
 * Nothing environment-specific has a default here. The repo is public, so
 * account-shaped values arrive through terraform.tfvars (git-ignored) or,
 * in CI, through repository variables. terraform.tfvars.example shows the
 * shape.
 */

variable "aws_region" {
  description = "Region for the site bucket and everything regional in this stack."
  type        = string
}

variable "project" {
  description = "Short slug used to name and tag everything this stack creates. Match infra/bootstrap."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9-]{3,24}$", var.project))
    error_message = "project must be 3-24 characters of lowercase letters, digits or hyphens."
  }
}

/*
 * The ci-deploy role in infra/bootstrap names this bucket in its policy, and
 * the two stacks are in separate states, so nothing checks they agree except
 * a deploy failing with AccessDenied. Copy the value from bootstrap's
 * terraform.tfvars rather than retyping it.
 */
variable "site_bucket_name" {
  description = "Globally unique name for the static site bucket. Must equal site_bucket_name in infra/bootstrap."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$", var.site_bucket_name))
    error_message = "site_bucket_name must be a valid S3 bucket name (3-63 chars, lowercase)."
  }
}

variable "tags" {
  description = "Extra tags merged into the defaults applied to every resource."
  type        = map(string)
  default     = {}
}

variable "price_class" {
  description = <<-DESC
    Which edge locations serve the site. PriceClass_100 (North America and
    Europe) is the cheapest; a visitor elsewhere is served from the nearest
    of those instead, a little slower. PriceClass_All serves from everywhere.
  DESC
  type        = string
  default     = "PriceClass_100"

  validation {
    condition     = contains(["PriceClass_100", "PriceClass_200", "PriceClass_All"], var.price_class)
    error_message = "price_class must be PriceClass_100, PriceClass_200 or PriceClass_All."
  }
}
