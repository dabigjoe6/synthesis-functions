variable "FUNCTION_NAME" {
  type    = string
  default = "synthesis-scraper-staging"
}

variable "BASE_URL" {
  type = string
  default = "https://3874-2a01-4b00-86ff-f600-2135-cf7e-b228-ba94.ngrok-free.app"
}

variable "FROM" {
  type = string
  default = "josepholabisi6000@gmail.com"
}

variable "NO_OF_POSTS_SENT_TO_USERS" {
  type = number
  default = 1
}

variable "OPENAI_API_KEY"	{
  type = string
}

variable "SENDGRID_API_KEY" {
  type = string
}

variable "SYNC_HOURS" {
  type = number
}

variable "AWS_ECR_REGISTRY" {
  type = string
  default = "240699656698.dkr.ecr.eu-west-2.amazonaws.com"
}

provider "aws" {
  region = "eu-west-2" 
}

# Create the IAM role for the Lambda function
resource "aws_iam_role" "lambda_execution_role" {
  name = "lambda_execution_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Attach a policy to the IAM role for the Lambda function
resource "aws_iam_role_policy_attachment" "lambda_execution_role_policy" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_execution_role.name
}

# Create the CloudWatch Logs policy for the Lambda function
resource "aws_iam_policy" "lambda_cloudwatch_policy" {
  name = "lambda_cloudwatch_policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:eu-west-2:*:*"
      }
    ]
  })
}

# Attach the CloudWatch Logs policy to the IAM role for the Lambda function
resource "aws_iam_role_policy_attachment" "lambda_cloudwatch_policy_attachment" {
  policy_arn = aws_iam_policy.lambda_cloudwatch_policy.arn
  role       = aws_iam_role.lambda_execution_role.name
}

# Create the SQS policy for the Lambda function
resource "aws_iam_policy" "lambda_sqs_policy" {
  name = "lambda_sqs_policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:SendMessage",
          "sqs:DeleteMessage",
          "sqs:ChangeMessageVisibility"
        ]
        Resource = "arn:aws:sqs:eu-west-2:*:*"
      }
    ]
  })
}

# Attach the SQS policy to the IAM role for the Lambda function
resource "aws_iam_role_policy_attachment" "lambda_sqs_policy_attachment" {
  policy_arn = aws_iam_policy.lambda_sqs_policy.arn
  role       = aws_iam_role.lambda_execution_role.name
}


# Create the Lambda function
resource "aws_lambda_function" "synthesis_lambda_function" {
  FUNCTION_NAME = var.FUNCTION_NAME
  role          = aws_iam_role.lambda_execution_role.arn
  image_uri = "${var.AWS_ECR_REGISTRY}/${var.FUNCTION_NAME}:latest"
  package_type = "Image"

  # Set the environment variables for the Lambda function
  environment {
    variables = {
      BASE_URL = var.BASE_URL
      FROM = var.FROM
      NO_OF_POSTS_SENT_TO_USERS = var.NO_OF_POSTS_SENT_TO_USERS
      OPENAI_API_KEY = var.OPENAI_API_KEY
      SENDGRID_API_KEY = var.SENDGRID_API_KEY
      SYNC_HOURS = var.SYNC_HOURS
    }
  }
}