/*
 * The static site bucket.
 *
 * Private, and readable only by this stack's CloudFront distribution through
 * Origin Access Control. There is no S3 website endpoint: that would need the
 * bucket public, and it cannot be reached over HTTPS. The directory-index
 * behaviour a website endpoint would have provided is done by the
 * viewer-request CloudFront Function instead.
 */

/*
 * No S3 server access logging, deliberately. Every read arrives through
 * CloudFront, whose own reports cover traffic, and every write comes from the
 * one deploy role, which CloudTrail records. Access logs would need a second
 * bucket to say the same thing again.
 */
#trivy:ignore:AVD-AWS-0089
resource "aws_s3_bucket" "site" {
  bucket = var.site_bucket_name
}

/*
 * Versioning, although the content is rebuilt from git on every deploy:
 * the deploy role can delete objects (it has to, for sync --delete), and with
 * versioning on, a bad or hostile deploy is undone by restoring versions
 * rather than by rebuilding an old commit under pressure.
 */
resource "aws_s3_bucket_versioning" "site" {
  bucket = aws_s3_bucket.site.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Each deploy replaces whatever changed, so old versions pile up. A month is
# plenty to notice a broken deploy and roll it back.
resource "aws_s3_bucket_lifecycle_configuration" "site" {
  bucket = aws_s3_bucket.site.id

  rule {
    id     = "expire-noncurrent-site-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 30
    }

    expiration {
      expired_object_delete_marker = true
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }

  depends_on = [aws_s3_bucket_versioning.site]
}

/*
 * SSE-S3, not a customer-managed KMS key. Everything in this bucket is
 * published to the world by design, so a CMK protects nothing - and OAC
 * reading SSE-KMS objects would need the key policy to trust CloudFront too.
 */
#trivy:ignore:AVD-AWS-0132
resource "aws_s3_bucket_server_side_encryption_configuration" "site" {
  bucket = aws_s3_bucket.site.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }

    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket = aws_s3_bucket.site.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "site" {
  bucket = aws_s3_bucket.site.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

/*
 * How CloudFront signs its requests to the bucket. "always" means every
 * origin request is SigV4-signed, so the bucket policy can trust the
 * CloudFront service principal and pin it to one distribution by ARN.
 */
resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "${var.project}-site"
  description                       = "CloudFront access to the ${var.site_bucket_name} bucket."
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}
