terraform {
  required_version = ">= 1.6.0"

  required_providers {
    proxmox = {
      source  = "bpg/proxmox"
      version = "~> 0.94.0"
    }
  }
}

provider "proxmox" {
  insecure = true
}




# Create the Incidetective VM.

resource "proxmox_virtual_environment_vm" "incidetective" {
  name        = "incidetective"
  description = "Incidetective application server"
  tags        = ["terraform", "incidetective"]

  node_name = var.node_name

  # Clone our existing Ubuntu template.
  clone {
    vm_id = 9000
    full  = true
  }

  started         = true
  on_boot         = true
  stop_on_destroy = true

  agent {
    enabled = false
  }

  cpu {
    cores = 2
    type  = "host"
  }

  memory {
    dedicated = 2048
  }

  initialization {
    datastore_id = var.vm_storage

    ip_config {
      ipv4 {
        address = "dhcp"
      }
    }

    user_account {
      username = "ubuntu"
      keys = [
        trimspace(file(pathexpand("~/.ssh/id_ed25519.pub")))
      ]
    }
  }
}
