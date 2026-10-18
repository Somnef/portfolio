/*
 * These are what you paste into GitHub as repository variables after the
 * first apply. Role ARNs contain the account ID, so they are outputs read
 * from a terminal - never committed, never defaulted into a .tf file.
 */

output "state_bucket" {
  description = "Name of the Terraform state bucket, for -backend-config."
  value       = aws_s3_bucket.state.id
}

output "oidc_provider_arn" {
  description = "ARN of the GitHub OIDC provider this stack created or adopted."
  value       = local.oidc_provider_arn
}

output "role_arns" {
  description = "CI role ARNs, keyed by role. Set these as GitHub repository variables."
  value       = { for k, r in aws_iam_role.ci : k => r.arn }
}

/*
 * The exact subjects each role accepts. oidc-check.yml prints the subject
 * GitHub actually minted; comparing the two is how a trust-policy mismatch
 * is diagnosed in seconds instead of by guesswork.
 */
output "accepted_subjects" {
  description = "Subject claims each role will accept, for comparison against the token oidc-check.yml prints."
  value = {
    plan   = local.plan_subjects
    apply  = local.apply_subjects
    deploy = local.deploy_subjects
  }
}
