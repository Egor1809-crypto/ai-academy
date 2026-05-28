resource "yandex_iam_service_account" "manaya" {
  name = "manaya-sa"
}

resource "yandex_resourcemanager_folder_iam_member" "storage_editor" {
  folder_id = var.folder_id
  role      = "storage.editor"
  member    = "serviceAccount:${yandex_iam_service_account.manaya.id}"
}

resource "yandex_resourcemanager_folder_iam_member" "kms_encrypter" {
  folder_id = var.folder_id
  role      = "kms.keys.encrypterDecrypter"
  member    = "serviceAccount:${yandex_iam_service_account.manaya.id}"
}

resource "yandex_compute_instance" "manaya" {
  name        = "manaya-app"
  platform_id = "standard-v3"
  zone        = var.zone

  resources {
    cores  = 4
    memory = 8
  }

  boot_disk {
    initialize_params {
      image_id = "fd80qm01ah03dkqb14lc"
      size     = 40
      type     = "network-ssd"
    }
  }

  network_interface {
    subnet_id          = yandex_vpc_subnet.manaya.id
    nat                = true
    security_group_ids = [yandex_vpc_security_group.manaya.id]
  }

  metadata = {
    ssh-keys = "ubuntu:${var.ssh_public_key}"
    user-data = <<-EOF
      #cloud-config
      package_update: true
      packages:
        - docker.io
        - docker-compose-plugin
      runcmd:
        - systemctl enable docker
        - systemctl start docker
    EOF
  }

  service_account_id = yandex_iam_service_account.manaya.id
}