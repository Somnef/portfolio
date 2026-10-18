locals {
  tags = merge(
    {
      Project   = var.project
      Stack     = "main"
      ManagedBy = "terraform"
    },
    var.tags,
  )
}
