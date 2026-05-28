resource "yandex_storage_bucket" "assets" {
  bucket     = var.bucket_name
  acl        = "private"
  force_destroy = false

  anonymous_access_flags {
    read = false
    list = false
  }

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        kms_master_key_id = yandex_kms_symmetric_key.manaya.id
        sse_algorithm     = "aws:kms"
      }
    }
  }

  versioning {
    enabled = true
  }
}

resource "yandex_cdn_origin_group" "assets" {
  name = "manaya-assets-origin-group"

  origin {
    source = format("%s.website.yandexcloud.net", yandex_storage_bucket.assets.bucket)
    enabled = true
  }
}

resource "yandex_cdn_resource" "assets" {
  cname               = var.domain_name
  origin_group_id     = yandex_cdn_origin_group.assets.id
  active              = true
  secondary_hostnames = []
  options {
    edge_cache_settings = 3600
    browser_cache_settings = 600
    gzip_on             = true
    redirect_http_to_https = true
  }
}