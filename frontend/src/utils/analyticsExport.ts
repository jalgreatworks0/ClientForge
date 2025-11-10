/**
 * Analytics Export Utilities
 * Functions to export analytics data to CSV and PDF formats
 */

import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

// =====================================================
// CSV EXPORT
// =====================================================

/**
 * Convert array of objects to CSV string
 */
function convertToCSV(data: any[], headers?: string[]): string {
  if (data.length === 0) return ''

  // Use provided headers or extract from first object
  const csvHeaders = headers || Object.keys(data[0])

  // Create header row
  const headerRow = csvHeaders.join(',')

  // Create data rows
  const dataRows = data.map((row) => {
    return csvHeaders
      .map((header) => {
        let value = row[header]

        // Handle nested objects (like periodComparison)
        if (typeof value === 'object' && value !== null) {
          value = JSON.stringify(value)
        }

        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          value = `"${value.replace(/"/g, '""')}"`
        }

        return value ?? ''
      })
      .join(',')
  })

  return [headerRow, ...dataRows].join('\n')
}

/**
 * Download CSV file
 */
function downloadCSV(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

/**
 * Export revenue metrics to CSV
 */
export function exportRevenueMetricsCSV(data: any): void {
  const csvData = [
    {
      metric: 'Total Revenue',
      value: data.totalRevenue,
      currency: 'USD',
    },
    {
      metric: 'Won Deals',
      value: data.wonDeals,
      currency: '',
    },
    {
      metric: 'Average Deal Size',
      value: data.averageDealSize,
      currency: 'USD',
    },
    {
      metric: 'Forecasted Revenue',
      value: data.forecastedRevenue,
      currency: 'USD',
    },
    {
      metric: 'Period Comparison Revenue',
      value: data.periodComparison.revenue,
      currency: 'USD',
    },
    {
      metric: 'Period Comparison Change',
      value: `${data.periodComparison.percentChange.toFixed(2)}%`,
      currency: '',
    },
  ]

  const csv = convertToCSV(csvData)
  downloadCSV(`revenue-metrics-${new Date().toISOString().split('T')[0]}.csv`, csv)
}

/**
 * Export sales funnel to CSV
 */
export function exportSalesFunnelCSV(data: any[]): void {
  const csvData = data.map((stage) => ({
    stage: stage.stage,
    dealCount: stage.dealCount,
    totalValue: stage.totalValue,
    averageProbability: stage.averageProbability,
  }))

  const csv = convertToCSV(csvData)
  downloadCSV(`sales-funnel-${new Date().toISOString().split('T')[0]}.csv`, csv)
}

/**
 * Export revenue trend to CSV
 */
export function exportRevenueTrendCSV(data: any[]): void {
  const csvData = data.map((point) => ({
    date: point.date,
    revenue: point.revenue,
    dealCount: point.dealCount,
  }))

  const csv = convertToCSV(csvData)
  downloadCSV(`revenue-trend-${new Date().toISOString().split('T')[0]}.csv`, csv)
}

/**
 * Export lead sources to CSV
 */
export function exportLeadSourcesCSV(data: any[]): void {
  const csvData = data.map((source) => ({
    source: source.source,
    leadCount: source.leadCount,
    wonCount: source.wonCount,
    totalRevenue: source.totalRevenue,
    conversionRate: `${source.conversionRate}%`,
  }))

  const csv = convertToCSV(csvData)
  downloadCSV(`lead-sources-${new Date().toISOString().split('T')[0]}.csv`, csv)
}

/**
 * Export team performance to CSV
 */
export function exportTeamPerformanceCSV(data: any[]): void {
  const csvData = data.map((member) => ({
    userName: member.userName,
    dealsWon: member.dealsWon,
    dealsLost: member.dealsLost,
    pipelineValue: member.pipelineValue,
    conversionRate: `${member.conversionRate}%`,
    averageDealSize: member.averageDealSize,
  }))

  const csv = convertToCSV(csvData)
  downloadCSV(`team-performance-${new Date().toISOString().split('T')[0]}.csv`, csv)
}

// =====================================================
// PDF EXPORT
// =====================================================

/**
 * Format currency for display
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Export full analytics dashboard to PDF
 */
export async function exportAnalyticsPDF(
  revenueMetrics: any,
  salesFunnel: any[],
  teamPerformance: any[],
  dateRange: { startDate: string; endDate: string }
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  let yPosition = 20

  // Title
  pdf.setFontSize(20)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Analytics Report', pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 10

  // Date Range
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.text(
    `Period: ${dateRange.startDate} to ${dateRange.endDate}`,
    pageWidth / 2,
    yPosition,
    { align: 'center' }
  )
  yPosition += 15

  // Revenue Metrics Section
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Revenue Metrics', 20, yPosition)
  yPosition += 8

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')

  const revenueData = [
    ['Total Revenue', formatCurrency(revenueMetrics?.totalRevenue || 0)],
    ['Won Deals', (revenueMetrics?.wonDeals || 0).toString()],
    ['Average Deal Size', formatCurrency(revenueMetrics?.averageDealSize || 0)],
    ['Forecasted Revenue', formatCurrency(revenueMetrics?.forecastedRevenue || 0)],
    [
      'Period Change',
      `${revenueMetrics?.periodComparison?.percentChange?.toFixed(2) || 0}%`,
    ],
  ]

  revenueData.forEach(([label, value]) => {
    pdf.text(label, 25, yPosition)
    pdf.text(value, 100, yPosition)
    yPosition += 6
  })

  yPosition += 10

  // Sales Funnel Section
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Sales Funnel', 20, yPosition)
  yPosition += 8

  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')

  // Table headers
  pdf.setFont('helvetica', 'bold')
  pdf.text('Stage', 25, yPosition)
  pdf.text('Deals', 80, yPosition)
  pdf.text('Value', 120, yPosition)
  pdf.text('Probability', 160, yPosition)
  yPosition += 6

  // Table rows
  pdf.setFont('helvetica', 'normal')
  salesFunnel?.slice(0, 8).forEach((stage) => {
    if (yPosition > pageHeight - 20) {
      pdf.addPage()
      yPosition = 20
    }

    pdf.text(stage.stage.substring(0, 20), 25, yPosition)
    pdf.text(stage.dealCount.toString(), 80, yPosition)
    pdf.text(formatCurrency(stage.totalValue), 120, yPosition)
    pdf.text(`${stage.averageProbability}%`, 160, yPosition)
    yPosition += 6
  })

  yPosition += 10

  // Team Performance Section
  if (yPosition > pageHeight - 60) {
    pdf.addPage()
    yPosition = 20
  }

  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Team Performance', 20, yPosition)
  yPosition += 8

  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')

  // Table headers
  pdf.setFont('helvetica', 'bold')
  pdf.text('Name', 25, yPosition)
  pdf.text('Won', 75, yPosition)
  pdf.text('Lost', 95, yPosition)
  pdf.text('Pipeline', 115, yPosition)
  pdf.text('Conv%', 155, yPosition)
  pdf.text('Avg Size', 175, yPosition)
  yPosition += 6

  // Table rows
  pdf.setFont('helvetica', 'normal')
  teamPerformance?.slice(0, 10).forEach((member) => {
    if (yPosition > pageHeight - 20) {
      pdf.addPage()
      yPosition = 20
    }

    pdf.text(member.userName.substring(0, 25), 25, yPosition)
    pdf.text(member.dealsWon.toString(), 75, yPosition)
    pdf.text(member.dealsLost.toString(), 95, yPosition)
    pdf.text(formatCurrency(member.pipelineValue).substring(0, 15), 115, yPosition)
    pdf.text(`${member.conversionRate.toFixed(1)}%`, 155, yPosition)
    pdf.text(formatCurrency(member.averageDealSize).substring(0, 12), 175, yPosition)
    yPosition += 6
  })

  // Footer
  const footerY = pageHeight - 10
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'italic')
  pdf.text(
    `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  )

  // Save PDF
  pdf.save(`analytics-report-${new Date().toISOString().split('T')[0]}.pdf`)
}

/**
 * Export chart as image and add to PDF
 */
export async function exportChartToPDF(elementId: string, filename: string): Promise<void> {
  const element = document.getElementById(elementId)
  if (!element) {
    console.error(`Element with id "${elementId}" not found`)
    return
  }

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    // Calculate dimensions to fit on page
    const imgWidth = pageWidth - 20
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    // Add title
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Analytics Chart', pageWidth / 2, 15, { align: 'center' })

    // Add image
    if (imgHeight <= pageHeight - 40) {
      pdf.addImage(imgData, 'PNG', 10, 25, imgWidth, imgHeight)
    } else {
      // Scale down if too tall
      const scaledHeight = pageHeight - 40
      const scaledWidth = (canvas.width * scaledHeight) / canvas.height
      pdf.addImage(imgData, 'PNG', (pageWidth - scaledWidth) / 2, 25, scaledWidth, scaledHeight)
    }

    // Footer
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'italic')
    pdf.text(
      `Generated on ${new Date().toLocaleDateString()}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )

    pdf.save(filename)
  } catch (error) {
    console.error('Error exporting chart to PDF:', error)
    alert('Failed to export chart. Please try again.')
  }
}

// =====================================================
// COMPREHENSIVE EXPORT
// =====================================================

/**
 * Export all analytics data (CSV and PDF options)
 */
export interface AnalyticsExportData {
  revenueMetrics: any
  salesFunnel: any[]
  revenueTrend: any[]
  leadSources: any[]
  teamPerformance: any[]
  pipelineHealth: any
  dateRange: { startDate: string; endDate: string }
}

export async function exportAllAnalytics(
  data: AnalyticsExportData,
  format: 'csv' | 'pdf'
): Promise<void> {
  if (format === 'csv') {
    // Export all datasets as separate CSV files
    exportRevenueMetricsCSV(data.revenueMetrics)

    // Small delay between downloads to prevent browser blocking
    await new Promise((resolve) => setTimeout(resolve, 500))
    exportSalesFunnelCSV(data.salesFunnel)

    await new Promise((resolve) => setTimeout(resolve, 500))
    exportRevenueTrendCSV(data.revenueTrend)

    await new Promise((resolve) => setTimeout(resolve, 500))
    exportLeadSourcesCSV(data.leadSources)

    await new Promise((resolve) => setTimeout(resolve, 500))
    exportTeamPerformanceCSV(data.teamPerformance)
  } else if (format === 'pdf') {
    // Export comprehensive PDF report
    await exportAnalyticsPDF(
      data.revenueMetrics,
      data.salesFunnel,
      data.teamPerformance,
      data.dateRange
    )
  }
}
