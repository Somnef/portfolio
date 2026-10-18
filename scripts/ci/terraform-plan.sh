#!/usr/bin/env bash
#
# Plans infra/main in CI without printing the plan.
#
# The job log of a public repository is world-readable, and a plan's
# attribute values include ARNs (so the account ID) and the budget alert
# address. The diff goes to a file; only resource addresses and actions are
# shown, in the job summary. terraform's own errors still reach the log.
#
# Environment:
#   TF_STATE_BUCKET, AWS_REGION   backend, from repository variables
#   MAIN_TFVARS                   infra/main/terraform.tfvars, from a secret
#   PLAN_LOCK                     "false" for speculative PR plans (default true)
#   PLAN_S3_URI                   if set, the saved plan is uploaded there
#
# Writes changes=true|false to $GITHUB_OUTPUT.
#
# Everything it writes goes to a temporary directory, never into infra/main,
# so running it on a laptop cannot overwrite a local terraform.tfvars or plan.
set -euo pipefail

cd "$(dirname "$0")/../../infra/main"

umask 077
work="$(mktemp -d)"
trap 'rm -rf "${work}"' EXIT
printf '%s\n' "${MAIN_TFVARS:?MAIN_TFVARS is not set}" >"${work}/ci.tfvars"

terraform init -input=false -no-color \
  -backend-config="bucket=${TF_STATE_BUCKET:?}" \
  -backend-config="region=${AWS_REGION:?}" >/dev/null

# -detailed-exitcode: 0 no changes, 1 error, 2 changes.
status=0
terraform plan -input=false -no-color -detailed-exitcode \
  -lock="${PLAN_LOCK:-true}" -var-file="${work}/ci.tfvars" \
  -out="${work}/tfplan" >"${work}/plan.txt" || status=$?

if [ "${status}" -eq 1 ]; then
  echo "::error::terraform plan failed; its error is above."
  exit 1
fi

changes=false
[ "${status}" -eq 2 ] && changes=true

{
  echo "### Terraform plan - infra/main"
  echo
  if [ "${changes}" = true ]; then
    echo "| Resource | Action |"
    echo "| --- | --- |"
    terraform show -json "${work}/tfplan" | jq -r '
      .resource_changes[]
      | select(.change.actions != ["no-op"] and .change.actions != ["read"])
      | "| `\(.address)` | \(.change.actions | join(" then ")) |"'
    echo
    grep -E '^Plan: ' "${work}/plan.txt" || true
  else
    echo "No changes."
  fi
} >>"${GITHUB_STEP_SUMMARY:-/dev/stdout}"

if [ "${changes}" = true ] && [ -n "${PLAN_S3_URI:-}" ]; then
  aws s3 cp --no-progress "${work}/tfplan" "${PLAN_S3_URI}"
fi

echo "changes=${changes}" >>"${GITHUB_OUTPUT:-/dev/stdout}"
