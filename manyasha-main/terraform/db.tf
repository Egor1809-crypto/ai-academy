resource "yandex_mdb_postgresql_cluster" "manaya" {
  name        = "manaya-postgresql"
  environment = "PRODUCTION"
  network_id  = yandex_vpc_network.manaya.id
  folder_id   = var.folder_id

  config {
    version = 16
    resources {
      resource_preset_id = "s2.micro"
      disk_type_id       = "network-ssd"
      disk_size          = 40
    }

    postgresql_config = {
      max_connections = 200
    }
  }

  host {
    zone      = var.zone
    subnet_id = yandex_vpc_subnet.manaya.id
  }

  security_group_ids = [yandex_vpc_security_group.manaya.id]
}

resource "yandex_mdb_postgresql_database" "manaya" {
  cluster_id = yandex_mdb_postgresql_cluster.manaya.id
  name       = var.postgres_db
  owner      = var.postgres_user
}

resource "yandex_mdb_postgresql_user" "manaya" {
  cluster_id = yandex_mdb_postgresql_cluster.manaya.id
  name       = var.postgres_user
  password   = var.postgres_password
  conn_limit = 100
  grants     = [var.postgres_db]
}