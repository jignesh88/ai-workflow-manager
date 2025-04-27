# modules/dynamodb/variables.tf - Variables for DynamoDB module

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "workflow_table_name" {
  description = "Name of the workflow DynamoDB table"
  type        = string
}

variable "metadata_table_name" {
  description = "Name of the metadata DynamoDB table"
  type        = string
}

variable "config_table_name" {
  description = "Name of the configuration DynamoDB table"
  type        = string
}

variable "tenant_isolation" {
  description = "Enable tenant isolation"
  type        = bool
  default     = true
}

# Local variables
locals {
  dollar = "$"
}