#!/usr/bin/env bash
#
# Publishes site/dist to the site bucket and invalidates CloudFront.
#
#   SITE_BUCKET=<bucket> DISTRIBUTION_ID=<id> scripts/deploy.sh
#
# The release workflow runs it after every merge to main; run by hand, it is
# the break-glass path and needs credentials for the bucket and distribution.
#
# Cache-Control is set here, per upload, because S3 serves an object's
# metadata as its headers: CloudFront reads it for its own TTL and passes it
# on to browsers. Uploads go assets first and HTML last, so a visitor who
# gets the new HTML mid-deploy finds everything it references already there.
set -euo pipefail

dist="$(cd "$(dirname "$0")/../site/dist" && pwd)"
bucket="s3://${SITE_BUCKET:?SITE_BUCKET is not set}"
: "${DISTRIBUTION_ID:?DISTRIBUTION_ID is not set}"

# Vite content-hashes these names, so a changed file is a new file: a year,
# immutable. No --delete: HTML still cached in a browser or at the edge can
# reference the previous build's assets for a while after a deploy.
aws s3 sync "${dist}/_astro" "${bucket}/_astro" --no-progress \
  --cache-control "public, max-age=31536000, immutable"

# Everything else keeps its name across deploys. Browsers revalidate on every
# visit (a cheap 304); the edge keeps a copy up to the HTML cache policy's
# one-hour maximum, and the invalidation below clears it on each deploy.
revalidate="public, max-age=0, s-maxage=3600, must-revalidate"

# --delete only reaches what a pass includes, so each pass prunes its own.
aws s3 sync "${dist}" "${bucket}" --no-progress --delete \
  --exclude "_astro/*" --exclude "*.html" \
  --cache-control "${revalidate}"

aws s3 sync "${dist}" "${bucket}" --no-progress --delete \
  --exclude "*" --include "*.html" \
  --content-type "text/html; charset=utf-8" \
  --cache-control "${revalidate}"

# "/*" is one path for billing: the first 1,000 a month are free.
invalidation="$(aws cloudfront create-invalidation \
  --distribution-id "${DISTRIBUTION_ID}" --paths "/*" \
  --query Invalidation.Id --output text)"
aws cloudfront wait invalidation-completed \
  --distribution-id "${DISTRIBUTION_ID}" --id "${invalidation}"

echo "Deployed; invalidation ${invalidation} complete."
