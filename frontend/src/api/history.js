import client from './client'

export const getHistory = (params) => client.get('/history', { params })
