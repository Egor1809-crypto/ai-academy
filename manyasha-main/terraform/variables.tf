variable "yc_token" {
  type      = string
  sensitive = true
}

variable "cloud_id" {
  type = string
}

variable "folder_id" {
  type = string
}

variable "zone" {
  type    = string
  default = "ru-central1-a"
}

variable "domain_name" {
  type = string
}

variable "bucket_name" {
  type = string
}

variable "ssh_public_key" {
  type = string
}

variable "postgres_password" {
  type      = string
  sensitive = true
}

variable "postgres_db" {
  type    = string
  default = "manaya"
}

variable "postgres_user" {
  type    = string
  default = "manaya"
}

variable "subnet_cidr" {
  type    = string
  default = "10.10.0.0/24"
}

variable "grafana_admin_password" {
  type      = string
  sensitive = true
}