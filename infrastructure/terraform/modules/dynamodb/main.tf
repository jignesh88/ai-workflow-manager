# modules/dynamodb/main.tf - DynamoDB module with tenant isolation

resource "aws_dynamodb_table" "workflow_table" {
  name           = var.workflow_table_name
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"
  range_key      = "tenantId"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "tenantId"
    type = "S"
  }

  global_secondary_index {
    name               = "TenantIndex"
    hash_key           = "tenantId"
    projection_type    = "ALL"
    write_capacity     = 0
    read_capacity      = 0
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name        = var.workflow_table_name
    Environment = var.environment
  }
}

resource "aws_dynamodb_table" "metadata_table" {
  name           = var.metadata_table_name
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"
  range_key      = "tenantId"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "tenantId"
    type = "S"
  }

  attribute {
    name = "itemType"
    type = "S"
  }

  global_secondary_index {
    name               = "TenantIndex"
    hash_key           = "tenantId"
    projection_type    = "ALL"
    write_capacity     = 0
    read_capacity      = 0
  }

  global_secondary_index {
    name               = "TypeIndex"
    hash_key           = "tenantId"
    range_key          = "itemType"
    projection_type    = "ALL"
    write_capacity     = 0
    read_capacity      = 0
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name        = var.metadata_table_name
    Environment = var.environment
  }
}

resource "aws_dynamodb_table" "config_table" {
  name           = var.config_table_name
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"
  range_key      = "tenantId"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "tenantId"
    type = "S"
  }

  global_secondary_index {
    name               = "TenantIndex"
    hash_key           = "tenantId"
    projection_type    = "ALL"
    write_capacity     = 0
    read_capacity      = 0
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name        = var.config_table_name
    Environment = var.environment
  }
}

# IAM policy for tenant-specific access to DynamoDB
resource "aws_iam_policy" "tenant_dynamodb_policy" {
  name        = "tenant-dynamodb-policy-${var.environment}"
  description = "IAM policy for tenant-specific access to DynamoDB"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ],
        Resource = [
          aws_dynamodb_table.workflow_table.arn,
          aws_dynamodb_table.metadata_table.arn,
          aws_dynamodb_table.config_table.arn,
          "${aws_dynamodb_table.workflow_table.arn}/index/*",
          "${aws_dynamodb_table.metadata_table.arn}/index/*",
          "${aws_dynamodb_table.config_table.arn}/index/*"
        ],
        Condition = {
          StringEquals = {
            "dynamodb:LeadingKeys" = ["${local.dollar}{cognito-identity.amazonaws.com:sub}"]
          }
        }
      }
    ]
  })
}