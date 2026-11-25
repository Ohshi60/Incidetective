output "vm_id" {
  description = "Proxmox ID of the created VM"
  value       = proxmox_virtual_environment_vm.incidetective.vm_id
}

output "vm_node" {
  description = "Proxmox node hosting the VM"
  value       = proxmox_virtual_environment_vm.incidetective.node_name
}
