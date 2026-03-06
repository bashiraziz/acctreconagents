terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

variable "aws_region" {
  type        = string
  description = "AWS region for drop-zone resources."
  default     = "us-east-1"
}

variable "drop_zone_bucket_name" {
  type        = string
  description = "Private drop-zone bucket name."
  default     = "acctrecon-drops"
}

provider "aws" {
  region = var.aws_region
}

resource "aws_s3_bucket" "drop_zone" {
  bucket = var.drop_zone_bucket_name
}

resource "aws_s3_bucket_public_access_block" "drop_zone" {
  bucket = aws_s3_bucket.drop_zone.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "drop_zone" {
  bucket = aws_s3_bucket.drop_zone.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "drop_zone" {
  bucket = aws_s3_bucket.drop_zone.id

  rule {
    id     = "expire-inbox-objects"
    status = "Enabled"

    filter {
      prefix = "tenants/"
    }

    expiration {
      days = 7
    }
  }
}

resource "aws_sqs_queue" "drop_events" {
  name                      = "acctrecon-drop-events"
  message_retention_seconds = 1209600
  visibility_timeout_seconds = 120
}

data "aws_iam_policy_document" "allow_s3_to_send_sqs" {
  statement {
    sid    = "AllowS3BucketNotifications"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["s3.amazonaws.com"]
    }

    actions = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.drop_events.arn]

    condition {
      test     = "ArnEquals"
      variable = "aws:SourceArn"
      values   = [aws_s3_bucket.drop_zone.arn]
    }
  }
}

resource "aws_sqs_queue_policy" "drop_events" {
  queue_url = aws_sqs_queue.drop_events.id
  policy    = data.aws_iam_policy_document.allow_s3_to_send_sqs.json
}

resource "aws_s3_bucket_notification" "drop_zone" {
  bucket = aws_s3_bucket.drop_zone.id

  queue {
    queue_arn     = aws_sqs_queue.drop_events.arn
    events        = ["s3:ObjectCreated:*"]
    filter_prefix = "tenants/"
  }

  depends_on = [aws_sqs_queue_policy.drop_events]
}

output "drop_zone_bucket" {
  value = aws_s3_bucket.drop_zone.bucket
}

output "drop_zone_queue_url" {
  value = aws_sqs_queue.drop_events.id
}

output "tenant_put_policy_template" {
  value = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "AllowTenantWriteOnlyToInbox"
        Effect   = "Allow"
        Action   = ["s3:PutObject"]
        Resource = "arn:aws:s3:::${var.drop_zone_bucket_name}/tenants/{tenantId}/inbox/*"
      }
    ]
  })
}

