/*
 * The Terraform state bucket.
 *
 * State is the most sensitive artefact in the repo's whole lifecycle: it
 * records every resource, and for some resource types it records their
 * attributes in clear. So this bucket is private, encrypted, versioned, and
 * reachable only over TLS.
 *
 * There is no DynamoDB lock table. The S3 backend locks through S3 itself
 * via use_lockfile, and DynamoDB-based locking is deprecated in the backend
 * and slated for removal.
 */

/*
 * No S3 server access logging, deliberately.
 *
 * It would need a second bucket, which needs its own lifecycle and its own
 * exemption from this very rule, to record requests made by exactly two
 * principals: this laptop and the CI roles. CloudTrail is the right place to
 * audit that, at account level, and it sees the management-plane calls that
 * access logs do not.
 */
#trivy:ignore:AVD-AWS-0089
resource "aws_s3_bucket" "state" {
  bucket = var.state_bucket_name

  # Every stack's state lives here. Deleting it is unrecoverable in a way
  # that no amount of versioning helps with, so it cannot be destroyed by
  # an accidental plan - remove this block deliberately if you ever mean it.
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id

  versioning_configuration {
    status = "Enabled"
  }
}

/*
 * SSE-S3 rather than a customer-managed KMS key: this is a single-account,
 * single-operator stack, and a CMK would add a key policy to keep in step
 * with the CI roles plus a monthly charge, to defend against an attacker who
 * already has S3 read on the bucket. bucket_key_enabled costs nothing and
 * cuts request charges if this is ever moved to KMS.
 */
#trivy:ignore:AVD-AWS-0132
resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }

    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket = aws_s3_bucket.state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ACLs off entirely - the bucket owner owns every object, so object-level
# ACLs cannot be used to widen access.
resource "aws_s3_bucket_ownership_controls" "state" {
  bucket = aws_s3_bucket.state.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

/*
 * Versioning keeps every prior state, which is the recovery path when an
 * apply goes wrong - but kept forever it is unbounded cost and an unbounded
 * copy of old secrets. 90 days is long enough to recover from a mistake
 * nobody noticed for a quarter.
 */
resource "aws_s3_bucket_lifecycle_configuration" "state" {
  bucket = aws_s3_bucket.state.id

  rule {
    id     = "expire-noncurrent-state-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 90
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }

  # A lifecycle rule on noncurrent versions is meaningless until versioning
  # is on, and the provider warns if it is applied first.
  depends_on = [aws_s3_bucket_versioning.state]
}

data "aws_iam_policy_document" "state_bucket" {
  statement {
    sid    = "DenyInsecureTransport"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = ["s3:*"]

    resources = [
      local.state_bucket_arn,
      "${local.state_bucket_arn}/*",
    ]

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "state" {
  bucket = aws_s3_bucket.state.id
  policy = data.aws_iam_policy_document.state_bucket.json

  # Attaching a policy to a bucket whose public access block is not yet in
  # place is the window in which a mistake becomes public.
  depends_on = [aws_s3_bucket_public_access_block.state]
}
