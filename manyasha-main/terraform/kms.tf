resource "yandex_kms_symmetric_key" "manaya" {
  name              = "manaya-aes256-key"
  default_algorithm = "AES_256"
  rotation_period   = "8760h"
}