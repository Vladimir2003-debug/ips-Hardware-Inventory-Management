import client from './client'

export const getProducts = (params) => client.get('/products', { params })
export const createProduct = (data) => client.post('/products', data)
export const updateProduct = (id, data) => client.put(`/products/${id}`, data)
export const deleteProduct = (id) => client.delete(`/products/${id}`)
