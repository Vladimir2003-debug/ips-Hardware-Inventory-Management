import client from './client'

export const getInventory = (params) => client.get('/inventory', { params })
export const adjustInventory = (data) => client.post('/inventory/adjust', data)
