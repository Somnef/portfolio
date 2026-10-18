#!/usr/bin/env bash
#
# Every Terraform check that needs no AWS credentials, for both stacks:
# fmt, validate, terraform test (mocked providers), tflint and trivy.
#
#   npm run infra:check
#
# init runs with -backend=false, so nothing here reads or locks real state.
set -euo pipefail

cd "$(dirname "$0")/../infra"

terraform fmt -check -recursive -diff

for stack in bootstrap main; do
  echo "== ${stack}"
  terraform -chdir="${stack}" init -backend=false -input=false >/dev/null
  terraform -chdir="${stack}" validate -no-color

  if compgen -G "${stack}/tests/*.tftest.hcl" >/dev/null; then
    terraform -chdir="${stack}" test -no-color
  fi
done

echo "== tflint"
tflint --init >/dev/null
tflint --recursive --no-color

echo "== trivy"
# A leftover local plan file (git-ignored) is a stale snapshot, not the code.
trivy config --quiet --exit-code 1 --skip-files "**/tfplan" .
