#!/usr/bin/env bash
#
# Applies the plan the release workflow's plan job saved, exactly as planned
# and reviewed - never a fresh plan. If the state moved since (a local apply,
# say), terraform refuses the stale plan and nothing changes.
#
# Environment:
#   TF_STATE_BUCKET, AWS_REGION   backend, from repository variables
#   PLAN_S3_URI                   where the plan job uploaded the plan
set -euo pipefail

cd "$(dirname "$0")/../../infra/main"

work="$(mktemp -d)"
trap 'rm -rf "${work}"' EXIT

terraform init -input=false -no-color \
  -backend-config="bucket=${TF_STATE_BUCKET:?}" \
  -backend-config="region=${AWS_REGION:?}" >/dev/null

aws s3 cp --no-progress "${PLAN_S3_URI:?}" "${work}/tfplan"

# The outputs block at the end carries ARNs, so the account ID; cut it from
# the public log. Progress lines and errors are kept.
terraform apply -input=false -no-color "${work}/tfplan" | sed '/^Outputs:/,$d'

aws s3 rm "${PLAN_S3_URI}"
