data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

locals {
  tags = merge(
    {
      Project   = var.project
      Stack     = "bootstrap"
      ManagedBy = "terraform"
    },
    var.tags,
  )

  /*
   * Every trust policy in this stack is this prefix plus one suffix. Building
   * it once means the two subject formats are decided in exactly one place -
   * see the use_immutable_subject variable for what the difference is and why
   * it matters.
   */
  subject_prefix = (
    var.use_immutable_subject
    ? "repo:${var.github_owner}@${var.github_owner_id}/${var.github_repo}@${var.github_repo_id}"
    : "repo:${var.github_owner}/${var.github_repo}"
  )

  # Subjects each role will accept. StringEquals against this exact list -
  # never StringLike - so a subject can only match if it is one of these.
  plan_subjects = [
    "${local.subject_prefix}:pull_request",
    "${local.subject_prefix}:ref:refs/heads/main",
  ]

  apply_subjects  = ["${local.subject_prefix}:environment:${var.infra_environment}"]
  deploy_subjects = ["${local.subject_prefix}:environment:${var.production_environment}"]

  state_bucket_arn = "arn:${data.aws_partition.current.partition}:s3:::${var.state_bucket_name}"
  site_bucket_arn  = "arn:${data.aws_partition.current.partition}:s3:::${var.site_bucket_name}"

  # The key prefix holding this stack's own state once it is migrated. The
  # apply role is denied write here, so CI can never rewrite the state that
  # describes CI's own permissions.
  bootstrap_state_key = "bootstrap/*"
}
