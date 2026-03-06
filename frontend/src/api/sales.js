import client from './client'

export const getSales = (params) => client.get('/sales', { params })
export const createSale = (data) => client.post('/sales', data)
export const deleteSale = (id) => client.delete(`/sales/${id}`)
