output "app_public_ip" {
  value = yandex_compute_instance.manaya.network_interface[0].nat_ip_address
}

output "postgresql_fqdn" {
  value = yandex_mdb_postgresql_cluster.manaya.host[0].fqdn
}

output "bucket_name" {
  value = yandex_storage_bucket.assets.bucket
}

output "kms_key_id" {
  value = yandex_kms_symmetric_key.manaya.id
}