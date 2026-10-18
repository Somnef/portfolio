/*
 * Plan-shape tests for infra/main, run against mocked providers:
 *
 *   terraform init -backend=false && terraform test
 *
 * mock_provider means no AWS API is ever called and no credentials are
 * needed - these check the configuration's logic (which resources exist,
 * which certificate the distribution gets), not AWS's behaviour.
 */

# Generated values are random strings; anything the provider validates as an
# ARN needs a well-formed one. 123456789012 is AWS's documentation account.
mock_provider "aws" {
  mock_resource "aws_cloudfront_function" {
    defaults = {
      arn = "arn:aws:cloudfront::123456789012:function/portfolio-viewer-request"
    }
  }

  mock_resource "aws_cloudfront_distribution" {
    defaults = {
      arn            = "arn:aws:cloudfront::123456789012:distribution/EDFDVBD6EXAMPLE"
      domain_name    = "d111111abcdef8.cloudfront.net"
      hosted_zone_id = "Z2FDTNDATAQYW2"
    }
  }

  # Policy documents are rendered by the provider itself; a mock only needs
  # to hand the bucket policy valid JSON.
  mock_data "aws_iam_policy_document" {
    defaults = {
      json = "{}"
    }
  }

  mock_resource "aws_s3_bucket" {
    defaults = {
      arn = "arn:aws:s3:::example-portfolio-site"
    }
  }
}

mock_provider "aws" {
  alias = "us_east_1"

  # Validation options as ACM returns them, for both names the runs use.
  mock_resource "aws_acm_certificate" {
    defaults = {
      arn = "arn:aws:acm:us-east-1:123456789012:certificate/00000000-0000-0000-0000-000000000000"
      domain_validation_options = [
        {
          domain_name           = "example.com"
          resource_record_name  = "_a1.example.com."
          resource_record_type  = "CNAME"
          resource_record_value = "_b1.acm-validations.aws."
        },
        {
          domain_name           = "www.example.com"
          resource_record_name  = "_a2.www.example.com."
          resource_record_type  = "CNAME"
          resource_record_value = "_b2.acm-validations.aws."
        },
      ]
    }
  }

  mock_resource "aws_acm_certificate_validation" {
    defaults = {
      certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/00000000-0000-0000-0000-000000000000"
    }
  }
}

variables {
  aws_region         = "eu-west-1"
  project            = "portfolio"
  site_bucket_name   = "example-portfolio-site"
  budget_limit_usd   = 5
  budget_alert_email = "alerts@example.com"
}

run "without_a_domain" {
  command = apply

  assert {
    condition     = length(aws_cloudfront_distribution.site.aliases) == 0
    error_message = "No domain means no aliases on the distribution."
  }

  assert {
    condition     = one(aws_cloudfront_distribution.site.viewer_certificate).cloudfront_default_certificate
    error_message = "No domain means CloudFront's default certificate."
  }

  assert {
    condition     = length(aws_acm_certificate.site) == 0 && length(aws_route53_record.site) == 0
    error_message = "No domain means no certificate and no DNS records."
  }

  assert {
    condition     = output.site_url == "https://d111111abcdef8.cloudfront.net/"
    error_message = "Without a domain, the site URL is the distribution's own address."
  }

  assert {
    condition     = output.name_servers == null
    error_message = "No zone was created, so there are no name servers to report."
  }
}

run "apex_and_www_in_an_existing_zone" {
  command = apply

  variables {
    domain_name = "example.com"
  }

  assert {
    condition     = toset(aws_cloudfront_distribution.site.aliases) == toset(["example.com", "www.example.com"])
    error_message = "Both the apex and www should be aliases."
  }

  assert {
    condition     = aws_acm_certificate.site[0].domain_name == "example.com" && toset(aws_acm_certificate.site[0].subject_alternative_names) == toset(["www.example.com"])
    error_message = "The certificate should be for the apex, with www as a SAN."
  }

  assert {
    condition     = toset(keys(aws_route53_record.site)) == toset(["example.com A", "example.com AAAA", "www.example.com A", "www.example.com AAAA"])
    error_message = "Each name needs an A and an AAAA alias."
  }

  assert {
    condition     = toset(keys(aws_route53_record.certificate_validation)) == toset(["example.com", "www.example.com"])
    error_message = "Each certificate name needs its validation record."
  }

  assert {
    condition     = aws_route53_record.certificate_validation["www.example.com"].name == "_a2.www.example.com."
    error_message = "Each validation record must carry its own name's CNAME, not another's."
  }

  assert {
    condition     = one(aws_cloudfront_distribution.site.viewer_certificate).minimum_protocol_version == "TLSv1.2_2025"
    error_message = "A custom domain must enforce the TLS 1.2 floor."
  }

  assert {
    condition     = one(aws_cloudfront_distribution.site.viewer_certificate).ssl_support_method == "sni-only"
    error_message = "SNI only - a dedicated-IP certificate is billed monthly."
  }

  assert {
    condition     = length(aws_route53_zone.site) == 0 && length(data.aws_route53_zone.site) == 1
    error_message = "create_hosted_zone defaults to false, so the zone is looked up, not created."
  }
}

run "apex_only" {
  command = apply

  variables {
    domain_name         = "example.com"
    enable_www_redirect = false
  }

  assert {
    condition     = aws_cloudfront_distribution.site.aliases == toset(["example.com"])
    error_message = "Without www, the apex is the only alias."
  }

  assert {
    condition     = length(aws_acm_certificate.site[0].subject_alternative_names) == 0
    error_message = "Without www, the certificate has no SANs."
  }
}

run "creates_the_zone_when_asked" {
  command = apply

  variables {
    domain_name        = "example.com"
    create_hosted_zone = true
  }

  assert {
    condition     = length(aws_route53_zone.site) == 1 && length(data.aws_route53_zone.site) == 0
    error_message = "create_hosted_zone = true should create the zone and skip the lookup."
  }

  assert {
    condition     = output.site_url == "https://example.com/"
    error_message = "With a domain, the site URL is the apex."
  }
}

run "rejects_a_domain_with_a_scheme" {
  command = plan

  variables {
    domain_name = "https://example.com"
  }

  expect_failures = [var.domain_name]
}

run "rejects_a_site_bucket_name_s3_would_refuse" {
  command = plan

  variables {
    site_bucket_name = "Example_Bucket"
  }

  expect_failures = [var.site_bucket_name]
}
