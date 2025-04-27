# modules/dynamodb/outputs.tf - Outputs for DynamoDB module

output "workflow_table_name" {
  description = "Name of the workflow DynamoDB table"
  value       = aws_dynamodb_table.workflow_table.name
}

output "workflow_table_arn" {
  description = "ARN of the workflow DynamoDB table"
  value       = aws_dynamodb_table.workflow_table.arn
}

output "metadata_table_name" {
  description = "Name of the metadata DynamoDB table"
  value       = aws_dynamodb_table.metadata_table.name
}

output "metadata_table_arn" {
  description = "ARN of the metadata DynamoDB table"
  value       = aws_dynamodb_table.metadata_table.arn
}

output "config_table_name" {
  description = "Name of the configuration DynamoDB table"
  value       = aws_dynamodb_table.config_table.name
}

output "config_table_arn" {
  description = "ARN of the configuration DynamoDB table"
  value       = aws_dynamodb_table.config_table.arn
}

output "tenant_dynamodb_policy_arn" {
  description = "ARN of the IAM policy for tenant-specific access to DynamoDB"
  value       = aws_iam_policy.tenant_dynamodb_policy.arn
}