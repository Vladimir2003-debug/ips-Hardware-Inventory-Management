import client from './client'

export const getReportSales = (params) => client.get('/reports/sales', { params })
export const getReportPurchases = (params) => client.get('/reports/purchases', { params })
export const getReportFinancial = (params) => client.get('/reports/financial', { params })
