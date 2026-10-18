/*
 * The optional custom domain: certificate, DNS, and the aliases on the
 * distribution. Everything here has count 0 while domain_name is null.
 *
 *   ACM certificate (us-east-1) for the apex, plus www when enabled,
 *   validated through DNS records in the zone.
 *   A and AAAA alias records for each name, pointing at the distribution.
 *
 * www is not a second site: it reaches the same distribution, and the
 * viewer-request function answers it with a 301 to the apex, so there is
 * one canonical host.
 */

locals {
  domain_enabled = var.domain_name != null

  # First entry is the certificate's primary name; the rest are SANs.
  site_aliases = local.domain_enabled ? concat(
    [var.domain_name],
    var.enable_www_redirect ? ["www.${var.domain_name}"] : [],
  ) : []

  zone_id = (
    !local.domain_enabled ? null
    : var.create_hosted_zone ? aws_route53_zone.site[0].zone_id
    : data.aws_route53_zone.site[0].zone_id
  )
}

resource "aws_route53_zone" "site" {
  count = local.domain_enabled && var.create_hosted_zone ? 1 : 0

  name    = var.domain_name
  comment = "${var.project} site"
}

data "aws_route53_zone" "site" {
  count = local.domain_enabled && !var.create_hosted_zone ? 1 : 0

  name         = var.domain_name
  private_zone = false
}

resource "aws_acm_certificate" "site" {
  count    = local.domain_enabled ? 1 : 0
  provider = aws.us_east_1

  domain_name               = local.site_aliases[0]
  subject_alternative_names = slice(local.site_aliases, 1, length(local.site_aliases))
  validation_method         = "DNS"

  # Changing the names replaces the certificate. Creating the new one first
  # means the distribution is never left pointing at a deleted certificate.
  lifecycle {
    create_before_destroy = true
  }
}

/*
 * Keyed by the names this configuration asks for, which are known at plan
 * time, rather than by the certificate's validation options, which are an
 * apply-time result; each record's values are then looked up from those.
 */
resource "aws_route53_record" "certificate_validation" {
  for_each = local.domain_enabled ? {
    for name in local.site_aliases : name => one([
      for option in aws_acm_certificate.site[0].domain_validation_options : option
      if option.domain_name == name
    ])
  } : {}

  zone_id = local.zone_id
  name    = each.value.resource_record_name
  type    = each.value.resource_record_type
  records = [each.value.resource_record_value]
  ttl     = 300

  # The same CNAME validates a renewal, and ACM can hand out a name that a
  # previous certificate for this domain already wrote.
  allow_overwrite = true
}

# Blocks the apply until ACM reports the certificate issued, so the
# distribution is never given a certificate that is still pending.
resource "aws_acm_certificate_validation" "site" {
  count    = local.domain_enabled ? 1 : 0
  provider = aws.us_east_1

  certificate_arn         = aws_acm_certificate.site[0].arn
  validation_record_fqdns = [for record in aws_route53_record.certificate_validation : record.fqdn]
}

resource "aws_route53_record" "site" {
  for_each = {
    for pair in setproduct(local.site_aliases, ["A", "AAAA"]) :
    "${pair[0]} ${pair[1]}" => { name = pair[0], type = pair[1] }
  }

  zone_id = local.zone_id
  name    = each.value.name
  type    = each.value.type

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}
