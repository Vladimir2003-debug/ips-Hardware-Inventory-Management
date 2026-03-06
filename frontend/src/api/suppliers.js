import client from './client'

export const getSuppliers = () => client.get('/suppliers')
export const createSupplier = (data) => client.post('/suppliers', data)
export const updateSupplier = (id, data) => client.put(`/suppliers/${id}`, data)
export const deleteSupplier = (id) => client.delete(`/suppliers/${id}`)
