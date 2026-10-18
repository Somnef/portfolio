/*
 * The GitHub Actions OIDC identity provider.
 *
 * An AWS account may hold exactly one provider per issuer URL, so creating a
 * second one fails with EntityAlreadyExists. create_oidc_provider decides
 * whether this stack owns it or adopts one something else registered, and
 * the rest of the configuration reads local.oidc_provider_arn either way.
 *
 * No thumbprint_list. AWS validates token.actions.githubusercontent.com
 * against its own library of trusted root CAs, and for GitHub specifically a
 * configured thumbprint is kept but never used for verification. The
 * 6938fd4d... value pasted into countless tutorials does nothing; leaving it
 * out means there is nothing to rotate when GitHub's certificate changes.
 */

resource "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 1 : 0

  url = "https://token.actions.githubusercontent.com"

  # The audience. configure-aws-credentials requests exactly this, and every
  # trust policy below pins it again - a token minted for another service
  # must not be replayable at STS.
  client_id_list = ["sts.amazonaws.com"]
}

data "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 0 : 1

  url = "https://token.actions.githubusercontent.com"
}

locals {
  oidc_provider_arn = (
    var.create_oidc_provider
    ? aws_iam_openid_connect_provider.github[0].arn
    : data.aws_iam_openid_connect_provider.github[0].arn
  )
}

/*
 * Every role in this stack trusts the same provider and the same audience,
 * and differs only in which subjects it accepts. This builds that policy
 * once so the three roles cannot drift apart.
 */
data "aws_iam_policy_document" "trust" {
  for_each = {
    plan   = local.plan_subjects
    apply  = local.apply_subjects
    deploy = local.deploy_subjects
  }

  statement {
    sid     = "GitHubActionsOIDC"
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    /*
     * StringEquals against an explicit list, never StringLike. A wildcard
     * here is the classic way these policies end up trusting every branch
     * of every fork: "repo:owner/repo:*" matches a pull_request subject
     * from anyone who can open a PR.
     */
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = each.value
    }
  }
}
