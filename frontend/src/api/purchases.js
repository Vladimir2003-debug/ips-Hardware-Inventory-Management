import client from './client'

export const getPurchases = (params) => client.get('/purchases', { params })
export const createPurchase = (data) => client.post('/purchases', data)
export const deletePurchase = (id) => client.delete(`/purchases/${id}`)
