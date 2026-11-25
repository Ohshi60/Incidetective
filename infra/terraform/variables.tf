
variable "node_name" {
  description = "Proxmox node that will host Incidetective"
  type        = string
}

variable "vm_storage" {
  description = "Storage for the VM disk"
  type        = string
  default     = "local-lvm"
}
