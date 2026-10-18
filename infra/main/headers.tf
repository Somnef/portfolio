/*
 * Security headers on every response, from config/headers.json.
 *
 * That file is generated from the site build (scripts/gen-headers.mjs) and
 * is the same file the local preview server serves, so what `npm run
 * preview` shows in the browser is what this policy sends. Never edit the
 * values here; change the generator and run `npm run headers`.
 *
 * override = true throughout: the origin is S3, which sends none of these,
 * but if anything ever did, the policy's value is the one that must win.
 */
locals {
  security_headers = jsondecode(file("${path.module}/../../config/headers.json"))
}

resource "aws_cloudfront_response_headers_policy" "security" {
  name    = "${var.project}-security-headers"
  comment = "Generated from config/headers.json; see headers.tf."

  security_headers_config {
    content_security_policy {
      content_security_policy = local.security_headers.contentSecurityPolicy
      override                = true
    }

    strict_transport_security {
      access_control_max_age_sec = local.security_headers.strictTransportSecurity.maxAgeSeconds
      include_subdomains         = local.security_headers.strictTransportSecurity.includeSubdomains
      preload                    = local.security_headers.strictTransportSecurity.preload
      override                   = true
    }

    # The policy block has no value field - it can only ever send nosniff.
    content_type_options {
      override = true
    }

    frame_options {
      frame_option = local.security_headers.frameOptions
      override     = true
    }

    referrer_policy {
      referrer_policy = local.security_headers.referrerPolicy
      override        = true
    }
  }

  custom_headers_config {
    dynamic "items" {
      for_each = local.security_headers.custom

      content {
        header   = items.key
        value    = items.value
        override = true
      }
    }
  }

  lifecycle {
    # The JSON can express a value this policy cannot send; fail at plan
    # time rather than serving something other than what preview showed.
    precondition {
      condition     = local.security_headers.contentTypeOptions == "nosniff"
      error_message = "config/headers.json: contentTypeOptions must be \"nosniff\", the only value CloudFront can send."
    }
  }
}
