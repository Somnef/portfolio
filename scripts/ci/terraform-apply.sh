#!/usr/bin/env bash
#
# Applies the plan the release workflow's plan job saved, exactly as planned
# and reviewed - never a fresh plan. If the state moved since (a local apply,
# say), terraform refuses the stale plan and nothing changes.
#
# The contact Lambda's zip comes back from the same place as the plan, and
# its hash is checked against the one the plan recorded before anything is
# applied: the plan was reviewed for those bytes, not for a rebuild.
#
# Environment:
#   TF_STATE_BUCKET, AWS_REGION   backend, from repository variables
#   PLAN_S3_PREFIX                where the plan job uploaded plan and zip
set -euo pipefail

cd "$(dirname "$0")/../../infra/main"

work="$(mktemp -d)"
trap 'rm -rf "${work}"' EXIT

terraform init -input=false -no-color \
  -backend-config="bucket=${TF_STATE_BUCKET:?}" \
  -backend-config="region=${AWS_REGION:?}" >/dev/null

aws s3 cp --no-progress "${PLAN_S3_PREFIX:?}/tfplan" "${work}/tfplan"

bundle=../../api/contact/dist/contact.zip
mkdir -p "$(dirname "${bundle}")"
aws s3 cp --no-progress "${PLAN_S3_PREFIX}/contact.zip" "${bundle}"

planned="$(terraform show -json "${work}/tfplan" | jq -r '
  [.resource_changes[] | select(.address == "aws_lambda_function.contact")
   | .change.after.code_sha256] | first // empty')"
actual="$(openssl dgst -sha256 -binary "${bundle}" | base64)"
if [ -n "${planned}" ] && [ "${planned}" != "${actual}" ]; then
  echo "::error::The Lambda zip does not match the one the plan was made with."
  exit 1
fi

# The outputs block at the end carries ARNs, so the account ID; cut it from
# the public log. Progress lines and errors are kept.
terraform apply -input=false -no-color "${work}/tfplan" | sed '/^Outputs:/,$d'

aws s3 rm --recursive "${PLAN_S3_PREFIX}/"
