import client from './client'

export const getCustomers = () => client.get('/customers')
export const createCustomer = (data) => client.post('/customers', data)
export const updateCustomer = (id, data) => client.put(`/customers/${id}`, data)
export const deleteCustomer = (id) => client.delete(`/customers/${id}`)
