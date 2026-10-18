/*
 * Who may read the site bucket: this distribution, through OAC, and nobody
 * else. Pinning AWS:SourceArn to the one distribution matters - without it,
 * any CloudFront distribution in any account could be pointed at this
 * bucket and read it.
 */
data "aws_iam_policy_document" "site_bucket" {
  statement {
    sid     = "AllowCloudFrontRead"
    effect  = "Allow"
    actions = ["s3:GetObject"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    resources = ["${aws_s3_bucket.site.arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.site.arn]
    }
  }

  /*
   * ListBucket changes one thing: a missing key returns 404 instead of 403,
   * which is what lets the distribution map 404 alone to the error page.
   * It does not expose a listing - CloudFront only ever issues GetObject for
   * a path, and no query string reaches the origin to turn a request into a
   * ListObjects call.
   */
  statement {
    sid     = "AllowCloudFrontNotFound"
    effect  = "Allow"
    actions = ["s3:ListBucket"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    resources = [aws_s3_bucket.site.arn]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.site.arn]
    }
  }

  statement {
    sid    = "DenyInsecureTransport"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = ["s3:*"]

    resources = [
      aws_s3_bucket.site.arn,
      "${aws_s3_bucket.site.arn}/*",
    ]

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id
  policy = data.aws_iam_policy_document.site_bucket.json

  depends_on = [aws_s3_bucket_public_access_block.site]
}
