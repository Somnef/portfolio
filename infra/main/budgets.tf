/*
 * A monthly cost budget with email alerts - the guardrail for a public
 * site whose costs scale with traffic nobody here controls.
 *
 * It covers the whole account rather than filtering on this project's tags.
 * A tag filter only works once the tags are activated as cost allocation
 * tags (a manual billing-console step) and misses anything untagged; for a
 * personal account, all spend is the number that matters.
 *
 * Two alerts: actual spend crossing 80%, which is money already spent, and
 * the month's forecast crossing 100%, which arrives early enough to act on.
 */
resource "aws_budgets_budget" "monthly" {
  name         = "${var.project}-monthly"
  budget_type  = "COST"
  limit_amount = tostring(var.budget_limit_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    notification_type          = "ACTUAL"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    subscriber_email_addresses = [var.budget_alert_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    notification_type          = "FORECASTED"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    subscriber_email_addresses = [var.budget_alert_email]
  }
}
