resource "yandex_vpc_network" "manaya" {
  name = "manaya-network"
}

resource "yandex_vpc_subnet" "manaya" {
  name           = "manaya-subnet"
  zone           = var.zone
  network_id     = yandex_vpc_network.manaya.id
  v4_cidr_blocks = [var.subnet_cidr]
}

resource "yandex_vpc_security_group" "manaya" {
  name       = "manaya-sg"
  network_id = yandex_vpc_network.manaya.id

  ingress {
    description    = "HTTPS"
    protocol       = "TCP"
    port           = 443
    v4_cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description    = "HTTP redirect"
    protocol       = "TCP"
    port           = 80
    v4_cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description    = "SSH"
    protocol       = "TCP"
    port           = 22
    v4_cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description    = "Grafana private access"
    protocol       = "TCP"
    port           = 3000
    v4_cidr_blocks = [var.subnet_cidr]
  }

  egress {
    description    = "Allow all outbound"
    protocol       = "ANY"
    from_port      = 0
    to_port        = 65535
    v4_cidr_blocks = ["0.0.0.0/0"]
  }
}