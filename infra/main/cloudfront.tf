/*
 * The CloudFront distribution in front of the site bucket.
 *
 * Two cache behaviours:
 *   /_astro/*  content-hashed assets - a changed file has a new name, so
 *              they are cached for as long as CloudFront allows.
 *   default    everything else: HTML, the RSS feeds, the CV, the sprites.
 *              Short-lived at the edge, and the deploy invalidates it.
 *
 * Phase 9 adds a third, /api/*, routed to the contact API.
 */

# Rewrites directory URLs to index.html and canonicalises host and path.
# The file is uploaded verbatim; see the comment at its top.
resource "aws_cloudfront_function" "viewer_request" {
  name    = "${var.project}-viewer-request"
  comment = "Directory index rewrite and canonical-URL redirects."
  runtime = "cloudfront-js-2.0"
  code    = file("${path.module}/functions/viewer-request.js")
  publish = true
}

data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

/*
 * HTML and the other unhashed files. Their URLs never change, so the edge
 * may only hold them briefly: a deploy invalidates the cache, but anything
 * that slips past an invalidation is stale for at most an hour.
 *
 * The TTLs bound what the origin's Cache-Control asks for; the deploy sets
 * that header per file (PLAN.md Phase 8). default_ttl applies only to an
 * object uploaded without one.
 */
resource "aws_cloudfront_cache_policy" "html" {
  name        = "${var.project}-html"
  comment     = "Unhashed site files: short edge TTL, no cookies, headers or query strings in the key."
  min_ttl     = 0
  default_ttl = 300
  max_ttl     = 3600

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

/*
 * No WAF: the brief rules it out on cost, and there is nothing dynamic to
 * protect until the contact API exists, which has its own throttling,
 * reserved concurrency and Turnstile (Phase 9).
 *
 * No access logging: traffic is read from CloudFront's built-in console
 * reports, and logs would be a bucket of visitor IPs to look after.
 *
 * The default certificate pins the minimum TLS version to TLSv1 - AWS does
 * not allow anything else with *.cloudfront.net. Setting domain_name swaps
 * in an ACM certificate with a TLS 1.2 floor.
 */
#trivy:ignore:AVD-AWS-0010
#trivy:ignore:AVD-AWS-0011
resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  comment             = "${var.project} static site"
  default_root_object = "index.html"
  http_version        = "http2and3"
  is_ipv6_enabled     = true
  price_class         = var.price_class

  origin {
    origin_id                = "site"
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  default_cache_behavior {
    target_origin_id       = "site"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = aws_cloudfront_cache_policy.html.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.viewer_request.arn
    }
  }

  # Hashed assets are always real files, so they skip the function.
  ordered_cache_behavior {
    path_pattern           = "/_astro/*"
    target_origin_id       = "site"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id
  }

  /*
   * A missing key is a 404 from S3, not a 403, because the bucket policy
   * grants this distribution s3:ListBucket (see bucket_policy.tf). That keeps
   * the mapping to 404 only, so a genuine 403 - from the contact API once it
   * exists, say - is never dressed up as "page not found".
   *
   * A short error TTL, so a page that is published moments after someone
   * requested it does not stay a 404 at that edge for long.
   */
  custom_error_response {
    error_code            = 404
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 60
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
