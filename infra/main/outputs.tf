/*
 * What gets copied elsewhere after an apply. Anything holding a full ARN
 * carries the account ID, so it goes into a GitHub *secret*, never a
 * variable: this repo's workflow logs are public (docs/oidc.md).
 */

output "site_bucket_name" {
  description = "Site bucket, for the deploy's aws s3 sync. GitHub repository variable."
  value       = aws_s3_bucket.site.id
}

output "distribution_id" {
  description = "Distribution ID, for the deploy's cache invalidation. GitHub repository variable."
  value       = aws_cloudfront_distribution.site.id
}

output "distribution_arn" {
  description = "Distribution ARN. Narrows cloudfront_distribution_arn in infra/bootstrap; contains the account ID."
  value       = aws_cloudfront_distribution.site.arn
}

output "distribution_domain_name" {
  description = "The *.cloudfront.net address, which serves the site with or without a custom domain."
  value       = aws_cloudfront_distribution.site.domain_name
}

output "site_url" {
  description = "Where the site is served."
  value       = "https://${local.domain_enabled ? var.domain_name : aws_cloudfront_distribution.site.domain_name}/"
}

# Only when this stack created the zone: these go into the registrar.
output "name_servers" {
  description = "Name servers of the hosted zone this stack created, to set at the registrar. null otherwise."
  value       = local.domain_enabled && var.create_hosted_zone ? aws_route53_zone.site[0].name_servers : null
}
