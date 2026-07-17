'use client'

import { useEffect, useState, useRef } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { 
  Loader2, 
  Calendar as CalendarIcon, 
  AlertTriangle,
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  BarChart3,
  TrendingUp,
  CheckCircle,
  Clock,
  Home,
  Users,
  Target,
  Filter,
  MoreVertical,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Eye
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { activityService } from '@/services/activityService'

interface DailyStats {
  date: string
  totalRooms: number
  cleanRooms: number
  dirtyRooms: number
  inProgress: number
  completionRate: number
  cleanedVsTarget: number
  avgTimePerRoom: number
  avgTimeByRoomType: Record<string, number>
  validationRate: number
  issuesReported: number
}

interface ExportOptions {
  format: 'excel' | 'pdf' | 'csv'
  includeDetails: boolean
  includeCharts: boolean
  includeRoomTypes: boolean
  includeComments: boolean
  paperSize: 'A4' | 'Letter'
  orientation: 'portrait' | 'landscape'
  dateRange: 'day' | 'week' | 'month' | 'custom'
  customStart?: string
  customEnd?: string
}

export default function DailyStatsCard() {
  const [stats, setStats] = useState<DailyStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportType, setExportType] = useState<'excel' | 'pdf' | 'csv'>('excel')
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'excel',
    includeDetails: true,
    includeCharts: false,
    includeRoomTypes: true,
    includeComments: true,
    paperSize: 'A4',
    orientation: 'portrait',
    dateRange: 'day'
  })
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'analytics'>('overview')

  const statsRef = useRef<HTMLDivElement>(null)

  async function fetchDailyStats(date: string) {
    setSelectedDate(date)
    setLoading(true)
    try {
      const res = await activityService.getReportDaily(date);
      setStats(res)
    } catch (error) {
      console.error('Erreur:', error)
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDailyStats(selectedDate)
  }, [selectedDate])

  // Fonction pour générer le rapport Excel
  const generateExcelReport = () => {
    setExportLoading(true)
    
    // Simuler la génération du fichier Excel
    setTimeout(() => {
      // Créer les données pour Excel
      const excelData = [
        ['RAPPORT JOURNALIER - STATISTIQUES DE NETTOYAGE'],
        [`Date: ${format(new Date(selectedDate), 'dd/MM/yyyy', { locale: fr })}`],
        [''],
        ['INDICATEURS', 'VALEUR', 'OBJECTIF', 'VARIATION'],
        ['Chambres totales', stats?.totalRooms || 0, '-', '-'],
        ['Chambres propres', stats?.cleanRooms || 0, `${Math.round((stats?.totalRooms || 0) * 0.95)}`, `${((stats?.cleanRooms || 0) / (stats?.totalRooms || 1) * 100).toFixed(1)}%`],
        ['Chambres sales', stats?.dirtyRooms || 0, '0', '-'],
        ['En cours', stats?.inProgress || 0, '-', '-'],
        ['Taux de progression', `${stats?.completionRate.toFixed(1)}%`, '100%', `${(stats?.completionRate - 100).toFixed(1)}%`],
        ['Vs Objectif', `${stats?.cleanedVsTarget.toFixed(1)}%`, '100%', `${(stats?.cleanedVsTarget - 100).toFixed(1)}%`],
        ['Temps moyen/chambre', `${(stats?.avgTimePerRoom * -1).toFixed(1)} min`, '45 min', '-'],
        ['Taux de validation', `${stats?.validationRate.toFixed(1)}%`, '95%', `${(stats?.validationRate - 95).toFixed(1)}%`],
        ['Problèmes signalés', stats?.issuesReported || 0, '0', '-'],
        [''],
        ['TEMPS MOYEN PAR TYPE DE CHAMBRE'],
        ['Type', 'Temps (min)', 'Écart vs Moyenne']
      ]

      // Ajouter les temps par type de chambre
      if (stats?.avgTimeByRoomType) {
        Object.entries(stats.avgTimeByRoomType).forEach(([type, time]) => {
          const deviation = time - (stats.avgTimePerRoom * -1)
          excelData.push([type, time.toFixed(1), `${deviation > 0 ? '+' : ''}${deviation.toFixed(1)} min`])
        })
      }

      // Générer le fichier Excel (simulation)
      const csvContent = excelData.map(row => row.join(',')).join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      
      if (navigator.msSaveBlob) {
        navigator.msSaveBlob(blob, `statistiques_${selectedDate}.csv`)
      } else {
        link.href = URL.createObjectURL(blob)
        link.setAttribute('download', `statistiques_${selectedDate}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }

      setExportLoading(false)
      setShowExportModal(false)
    }, 1500)
  }

  // Fonction pour générer le rapport PDF
  const generatePDFReport = () => {
    setExportLoading(true)
    
    // Simuler la génération du PDF
    setTimeout(() => {
      // Dans une implémentation réelle, utiliser une librairie comme jsPDF ou html2pdf
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Rapport Journalier - ${format(new Date(selectedDate), 'dd/MM/yyyy', { locale: fr })}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 40px;
                color: #333;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #2563eb;
                padding-bottom: 20px;
              }
              .header h1 {
                color: #2563eb;
                font-size: 24px;
              }
              .stats-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
                margin-bottom: 30px;
              }
              .stat-card {
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
              }
              .stat-value {
                font-size: 28px;
                font-weight: bold;
                margin: 10px 0;
              }
              .progress-section {
                margin: 30px 0;
              }
              .progress-bar {
                height: 20px;
                background: #e5e7eb;
                border-radius: 10px;
                overflow: hidden;
                margin: 10px 0;
              }
              .progress-fill {
                height: 100%;
                background: #10b981;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
              }
              th, td {
                border: 1px solid #e5e7eb;
                padding: 12px;
                text-align: left;
              }
              th {
                background: #f3f4f6;
                font-weight: 600;
              }
              .footer {
                margin-top: 40px;
                text-align: center;
                font-size: 12px;
                color: #6b7280;
                border-top: 1px solid #e5e7eb;
                padding-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Rapport Journalier - Statistiques de Nettoyage</h1>
              <p>Date: ${format(new Date(selectedDate), 'dd MMMM yyyy', { locale: fr })}</p>
            </div>
            
            <div class="stats-grid">
              <div class="stat-card">
                <p>Chambres totales</p>
                <div class="stat-value">${stats?.totalRooms || 0}</div>
              </div>
              <div class="stat-card">
                <p>Chambres propres</p>
                <div class="stat-value" style="color: #10b981;">${stats?.cleanRooms || 0}</div>
              </div>
              <div class="stat-card">
                <p>Taux de progression</p>
                <div class="stat-value" style="color: #3b82f6;">${stats?.completionRate.toFixed(1)}%</div>
              </div>
              <div class="stat-card">
                <p>Temps moyen/chambre</p>
                <div class="stat-value" style="color: #8b5cf6;">${(stats?.avgTimePerRoom * -1).toFixed(1)} min</div>
              </div>
              <div class="stat-card">
                <p>Taux de validation</p>
                <div class="stat-value" style="color: #0ea5e9;">${stats?.validationRate.toFixed(1)}%</div>
              </div>
              <div class="stat-card">
                <p>Problèmes signalés</p>
                <div class="stat-value" style="color: #ef4444;">${stats?.issuesReported || 0}</div>
              </div>
            </div>
            
            <div class="progress-section">
              <h3>Progression du nettoyage</h3>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${stats?.completionRate || 0}%"></div>
              </div>
              <p>${stats?.cleanRooms || 0} sur ${stats?.totalRooms || 0} chambres nettoyées</p>
            </div>
            
            ${stats?.avgTimeByRoomType ? `
            <h3>Temps moyen par type de chambre</h3>
            <table>
              <thead>
                <tr>
                  <th>Type de chambre</th>
                  <th>Temps moyen (min)</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(stats.avgTimeByRoomType).map(([type, time]) => `
                  <tr>
                    <td>${type}</td>
                    <td>${time.toFixed(1)} min</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ` : ''}
            
            <div class="footer">
              <p>Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}</p>
              <p>© ${new Date().getFullYear()} Système de Gestion Hôtelière</p>
            </div>
            
            <script>
              window.onload = function() {
                window.print();
                setTimeout(() => {
                  window.close();
                }, 1000);
              };
            </script>
          </body>
          </html>
        `)
        printWindow.document.close()
      }

      setExportLoading(false)
      setShowExportModal(false)
    }, 1500)
  }

  // Gérer l'export
  const handleExport = () => {
    setShowExportModal(true)
  }

  // Exécuter l'export
  const executeExport = () => {
    if (exportType === 'excel' || exportType === 'csv') {
      generateExcelReport()
    } else {
      generatePDFReport()
    }
  }

  // Gérer l'impression directe
  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (printWindow && statsRef.current) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Statistiques Journalières - ${format(new Date(selectedDate), 'dd/MM/yyyy', { locale: fr })}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .print-header { text-align: center; margin-bottom: 30px; }
            .print-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
            .print-card { border: 1px solid #ddd; padding: 20px; border-radius: 8px; text-align: center; }
            .print-value { font-size: 24px; font-weight: bold; margin: 10px 0; }
          </style>
        </head>
        <body>
          ${statsRef.current.innerHTML}
        </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
    }
  }

  // Calculer les indicateurs de performance
  const performanceIndicators = {
    efficiency: stats ? (stats.cleanRooms / stats.totalRooms) * 100 : 0,
    productivity: stats ? (stats.cleanRooms * 60) / (stats.totalRooms * (stats.avgTimePerRoom * -1)) : 0,
    quality: stats?.validationRate || 0
  }

  // Composant Progress personnalisé (remplacement)
  const CustomProgress = ({ 
    value, 
    max = 100, 
    className = "", 
    color = "blue" 
  }: { 
    value: number; 
    max?: number; 
    className?: string; 
    color?: string;
  }) => {
    const percentage = (value / max) * 100;
    
    const colorClasses = {
      blue: "bg-blue-600",
      green: "bg-green-600",
      red: "bg-red-600",
      yellow: "bg-yellow-600",
      teal: "bg-teal-600",
      purple: "bg-purple-600",
      indigo: "bg-indigo-600"
    };

    return (
      <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
        <div 
          className={`h-2 rounded-full ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header avec actions */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Statistiques Journalières</h1>
            <p className="text-gray-600 mt-1">
              Suivi des performances de nettoyage et indicateurs clés
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Filtre de date */}
            <div className="relative group">
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5">
                <CalendarIcon className="h-5 w-5 text-gray-600" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => fetchDailyStats(e.target.value)}
                  className="bg-transparent border-none outline-none text-gray-900 font-medium"
                />
                <ChevronDown className="h-4 w-4 text-gray-600" />
              </div>
              
              <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg p-3 z-10 hidden group-hover:block">
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      const today = format(new Date(), 'yyyy-MM-dd')
                      setSelectedDate(today)
                      fetchDailyStats(today)
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 text-sm"
                  >
                    Aujourd'hui
                  </button>
                  <button
                    onClick={() => {
                      const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd')
                      setSelectedDate(yesterday)
                      fetchDailyStats(yesterday)
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 text-sm"
                  >
                    Hier
                  </button>
                  <button
                    onClick={() => {
                      const weekAgo = format(new Date(Date.now() - 7 * 86400000), 'yyyy-MM-dd')
                      setSelectedDate(weekAgo)
                      fetchDailyStats(weekAgo)
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 text-sm"
                  >
                    Il y a 7 jours
                  </button>
                </div>
              </div>
            </div>

            {/* Boutons d'actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleExport}
                leftIcon={<Download className="h-4 w-4" />}
                className="flex items-center gap-2"
              >
                Exporter
              </Button>
              
              <Button
                variant="outline"
                onClick={handlePrint}
                leftIcon={<Printer className="h-4 w-4" />}
                className="flex items-center gap-2"
              >
                Imprimer
              </Button>
              
              <Button
                variant="primary"
                onClick={() => fetchDailyStats(selectedDate)}
                isLoading={loading}
                leftIcon={<RefreshCw className="h-4 w-4" />}
                className="flex items-center gap-2"
              >
                Actualiser
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Onglets de navigation simplifiés */}
      <div className="bg-white rounded-2xl shadow-sm border p-4">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setViewMode('overview')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-colors ${
              viewMode === 'overview'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-700 hover:bg-gray-50 border border-transparent'
            }`}
          >
            <Eye className="h-4 w-4" />
            Vue d'ensemble
          </button>
          <button
            onClick={() => setViewMode('detailed')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-colors ${
              viewMode === 'detailed'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-700 hover:bg-gray-50 border border-transparent'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Détails
          </button>
          <button
            onClick={() => setViewMode('analytics')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-colors ${
              viewMode === 'analytics'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-700 hover:bg-gray-50 border border-transparent'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Analytics
          </button>
        </div>
      </div>

      {/* Contenu principal des statistiques */}
      <div ref={statsRef} className="bg-white rounded-2xl shadow-sm border p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="animate-spin text-blue-600" size={48} />
            <p className="mt-4 text-gray-600">Chargement des statistiques...</p>
          </div>
        ) : !stats ? (
          <div className="flex flex-col items-center justify-center h-64">
            <AlertTriangle className="text-yellow-500" size={48} />
            <p className="mt-4 text-gray-600">Aucune donnée disponible pour cette date.</p>
            <Button
              variant="outline"
              onClick={() => fetchDailyStats(selectedDate)}
              className="mt-4"
            >
              Réessayer
            </Button>
          </div>
        ) : (
          <>
            {/* En-tête de date */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {format(new Date(selectedDate), 'EEEE d MMMM yyyy', { locale: fr })}
                </h2>
                <p className="text-gray-600 mt-1">Journée de travail complète</p>
              </div>
              
              <div className="flex items-center gap-3">
                <Badge color="green" className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3" />
                  Données complètes
                </Badge>
                <Badge color="blue" className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Dernière mise à jour: {format(new Date(), 'HH:mm')}
                </Badge>
              </div>
            </div>

            {/* Vue d'ensemble (par défaut) */}
            {viewMode === 'overview' && (
              <div className="space-y-8">
                {/* Cartes principales */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-700 font-medium">Chambres totales</p>
                        <p className="text-3xl font-bold text-blue-900 mt-2">{stats.totalRooms}</p>
                      </div>
                      <div className="p-3 bg-white rounded-xl">
                        <Home className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <div className="flex-1 bg-blue-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${(stats.cleanRooms / stats.totalRooms) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-blue-900">
                        {Math.round((stats.cleanRooms / stats.totalRooms) * 100)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-2xl p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-700 font-medium">Chambres propres</p>
                        <p className="text-3xl font-bold text-green-900 mt-2">{stats.cleanRooms}</p>
                      </div>
                      <div className="p-3 bg-white rounded-xl">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <Badge color="green" size="sm">
                        +{stats.cleanRooms - stats.dirtyRooms} net
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-2xl p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-yellow-700 font-medium">Taux de progression</p>
                        <p className="text-3xl font-bold text-yellow-900 mt-2">{stats.completionRate.toFixed(1)}%</p>
                      </div>
                      <div className="p-3 bg-white rounded-xl">
                        <Target className="h-6 w-6 text-yellow-600" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-yellow-200 rounded-full h-2">
                          <div 
                            className="bg-yellow-600 h-2 rounded-full" 
                            style={{ width: `${stats.completionRate}%` }}
                          />
                        </div>
                        <span className="text-xs text-yellow-700">
                          vs objectif: {stats.cleanedVsTarget > 100 ? '+' : ''}{stats.cleanedVsTarget - 100}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-700 font-medium">Temps moyen</p>
                        <p className="text-3xl font-bold text-purple-900 mt-2">
                          {(stats.avgTimePerRoom * -1).toFixed(1)} min
                        </p>
                      </div>
                      <div className="p-3 bg-white rounded-xl">
                        <Clock className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-xs text-purple-600">
                        Réduction de {(45 + stats.avgTimePerRoom).toFixed(1)} min vs cible
                      </p>
                    </div>
                  </div>
                </div>

                {/* Statistiques secondaires */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-gray-900">Validation qualité</h3>
                      </div>
                      <Badge color="teal">{stats.validationRate.toFixed(1)}%</Badge>
                    </div>
                    <CustomProgress 
                      value={stats.validationRate} 
                      max={100} 
                      className="h-2"
                      color="teal"
                    />
                    <p className="text-sm text-gray-600 mt-2">
                      {stats.validationRate >= 95 ? 'Excellent' : stats.validationRate >= 90 ? 'Bon' : 'À améliorer'}
                    </p>
                  </div>
                  
                  <div className="border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <h3 className="font-semibold text-gray-900">Problèmes signalés</h3>
                      </div>
                      <Badge color="red">{stats.issuesReported}</Badge>
                    </div>
                    <div className="space-y-2">
                      {stats.issuesReported > 0 ? (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Taux d'incidents</span>
                          <span className="font-medium text-red-600">
                            {((stats.issuesReported / stats.totalRooms) * 100).toFixed(1)}%
                          </span>
                        </div>
                      ) : (
                        <p className="text-sm text-green-600">✅ Aucun problème aujourd'hui</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        <h3 className="font-semibold text-gray-900">Efficacité</h3>
                      </div>
                      <Badge color="green">
                        {performanceIndicators.efficiency.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Productivité</span>
                        <span className="font-medium text-green-600">
                          {performanceIndicators.productivity.toFixed(2)} chambres/heure
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Graphique des temps par type */}
                <div className="border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Temps moyen par type de chambre
                      </h3>
                      <p className="text-gray-600 mt-1">
                        Analyse détaillée du temps de nettoyage
                      </p>
                    </div>
                    <Badge color="blue">
                      Moyenne: {(stats.avgTimePerRoom * -1).toFixed(1)} min
                    </Badge>
                  </div>
                  
                  <div className="space-y-4">
                    {Object.entries(stats.avgTimeByRoomType || {}).map(([type, time]) => {
                      const deviation = time - (stats.avgTimePerRoom * -1)
                      const percentage = (time / (stats.avgTimePerRoom * -1)) * 100
                      
                      return (
                        <div key={type} className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-gray-900">{type}</span>
                              <span className="text-gray-600">{time.toFixed(1)} min</span>
                            </div>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  deviation < 0 ? 'bg-green-500' : 'bg-yellow-500'
                                }`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="ml-4 w-20 text-right">
                            <Badge 
                              color={deviation < 0 ? 'green' : 'yellow'} 
                              size="sm"
                            >
                              {deviation > 0 ? '+' : ''}{deviation.toFixed(1)} min
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Vue détaillée */}
            {viewMode === 'detailed' && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total chambres assignées', value: stats.totalRooms, color: 'gray' },
                  { label: 'Chambres propres', value: stats.cleanRooms, color: 'green' },
                  { label: 'Chambres sales', value: stats.dirtyRooms, color: 'red' },
                  { label: 'En cours', value: stats.inProgress, color: 'yellow' },
                  { label: 'Taux de progression', value: `${stats.completionRate.toFixed(1)}%`, color: 'blue' },
                  { label: 'Nettoyées vs objectif', value: `${stats.cleanedVsTarget.toFixed(1)}%`, color: 'emerald' },
                  { label: 'Temps moyen / chambre', value: `${(stats.avgTimePerRoom * -1).toFixed(1)} min`, color: 'indigo' },
                  { label: 'Taux de validation', value: `${stats.validationRate.toFixed(1)}%`, color: 'teal' },
                  { label: 'Problèmes signalés', value: stats.issuesReported, color: 'red' },
                ].map((item, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-shadow">
                    <p className="text-sm text-gray-500 mb-2">{item.label}</p>
                    <p className={`text-2xl font-semibold ${
                      item.color === 'green' ? 'text-green-600' :
                      item.color === 'red' ? 'text-red-600' :
                      item.color === 'yellow' ? 'text-yellow-600' :
                      item.color === 'blue' ? 'text-blue-600' :
                      item.color === 'emerald' ? 'text-emerald-600' :
                      item.color === 'indigo' ? 'text-indigo-600' :
                      item.color === 'teal' ? 'text-teal-600' : 'text-gray-900'
                    }`}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Vue analytics */}
            {viewMode === 'analytics' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="border border-gray-200 rounded-xl p-5">
                    <h4 className="font-semibold text-gray-900 mb-4">Indicateurs de performance</h4>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Efficacité globale</span>
                          <span className="font-medium">{performanceIndicators.efficiency.toFixed(1)}%</span>
                        </div>
                        <CustomProgress value={performanceIndicators.efficiency} max={100} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Productivité</span>
                          <span className="font-medium">{performanceIndicators.productivity.toFixed(2)} ch/hr</span>
                        </div>
                        <CustomProgress value={performanceIndicators.productivity * 10} max={10} className="h-2" color="green" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Qualité</span>
                          <span className="font-medium">{performanceIndicators.quality.toFixed(1)}%</span>
                        </div>
                        <CustomProgress value={performanceIndicators.quality} max={100} className="h-2" color="teal" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-xl p-5">
                    <h4 className="font-semibold text-gray-900 mb-4">Distribution par statut</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm">Propres</span>
                        </div>
                        <span className="font-medium">{stats.cleanRooms} ({Math.round((stats.cleanRooms / stats.totalRooms) * 100)}%)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <span className="text-sm">En cours</span>
                        </div>
                        <span className="font-medium">{stats.inProgress} ({Math.round((stats.inProgress / stats.totalRooms) * 100)}%)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="text-sm">Sales</span>
                        </div>
                        <span className="font-medium">{stats.dirtyRooms} ({Math.round((stats.dirtyRooms / stats.totalRooms) * 100)}%)</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-xl p-5">
                    <h4 className="font-semibold text-gray-900 mb-4">Objectifs du jour</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Nettoyage</span>
                        <Badge color={stats.cleanedVsTarget >= 100 ? 'green' : 'yellow'}>
                          {stats.cleanedVsTarget >= 100 ? '✓ Atteint' : `${stats.cleanedVsTarget.toFixed(1)}%`}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Temps moyen</span>
                        <Badge color={(stats.avgTimePerRoom * -1) <= 45 ? 'green' : 'yellow'}>
                          {(stats.avgTimePerRoom * -1) <= 45 ? '✓ Atteint' : `${(stats.avgTimePerRoom * -1).toFixed(1)} min`}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Qualité</span>
                        <Badge color={stats.validationRate >= 95 ? 'green' : 'yellow'}>
                          {stats.validationRate >= 95 ? '✓ Atteint' : `${stats.validationRate.toFixed(1)}%`}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal d'export */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Exporter les statistiques"
        size="lg"
      >
        <div className="space-y-6">
          {/* Sélection du format */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Format d'export</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => {
                  setExportType('excel')
                  setExportOptions({...exportOptions, format: 'excel'})
                }}
                className={`p-4 border rounded-xl text-center transition-all ${
                  exportType === 'excel'
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <FileSpreadsheet className={`h-8 w-8 ${
                    exportType === 'excel' ? 'text-blue-600' : 'text-gray-600'
                  }`} />
                  <span className="font-medium">Excel</span>
                  <span className="text-xs text-gray-500">.xlsx</span>
                </div>
              </button>
              
              <button
                onClick={() => {
                  setExportType('pdf')
                  setExportOptions({...exportOptions, format: 'pdf'})
                }}
                className={`p-4 border rounded-xl text-center transition-all ${
                  exportType === 'pdf'
                    ? 'border-red-500 bg-red-50 ring-2 ring-red-100'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <FileText className={`h-8 w-8 ${
                    exportType === 'pdf' ? 'text-red-600' : 'text-gray-600'
                  }`} />
                  <span className="font-medium">PDF</span>
                  <span className="text-xs text-gray-500">Document formaté</span>
                </div>
              </button>
              
              <button
                onClick={() => {
                  setExportType('csv')
                  setExportOptions({...exportOptions, format: 'csv'})
                }}
                className={`p-4 border rounded-xl text-center transition-all ${
                  exportType === 'csv'
                    ? 'border-green-500 bg-green-50 ring-2 ring-green-100'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <FileSpreadsheet className={`h-8 w-8 ${
                    exportType === 'csv' ? 'text-green-600' : 'text-gray-600'
                  }`} />
                  <span className="font-medium">CSV</span>
                  <span className="text-xs text-gray-500">Données brutes</span>
                </div>
              </button>
            </div>
          </div>

          {/* Options d'export */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Options d'export</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">Inclure les détails</span>
                  <p className="text-xs text-gray-500">Tous les indicateurs détaillés</p>
                </div>
                <input
                  type="checkbox"
                  checked={exportOptions.includeDetails}
                  onChange={(e) => setExportOptions({...exportOptions, includeDetails: e.target.checked})}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">Inclure les graphiques</span>
                  <p className="text-xs text-gray-500">Visualisations et progressions</p>
                </div>
                <input
                  type="checkbox"
                  checked={exportOptions.includeCharts}
                  onChange={(e) => setExportOptions({...exportOptions, includeCharts: e.target.checked})}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">Temps par type de chambre</span>
                  <p className="text-xs text-gray-500">Analyse détaillée par catégorie</p>
                </div>
                <input
                  type="checkbox"
                  checked={exportOptions.includeRoomTypes}
                  onChange={(e) => setExportOptions({...exportOptions, includeRoomTypes: e.target.checked})}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
              </div>
            </div>
          </div>

          {/* Paramètres PDF (visible uniquement pour PDF) */}
          {exportType === 'pdf' && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Paramètres PDF</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Format papier</label>
                  <select
                    value={exportOptions.paperSize}
                    onChange={(e) => setExportOptions({...exportOptions, paperSize: e.target.value as 'A4' | 'Letter'})}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="A4">A4</option>
                    <option value="Letter">Letter</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Orientation</label>
                  <select
                    value={exportOptions.orientation}
                    onChange={(e) => setExportOptions({...exportOptions, orientation: e.target.value as 'portrait' | 'landscape'})}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Paysage</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Résumé de l'export */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">Résumé de l'export</h4>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                  <div className="text-blue-700">Format:</div>
                  <div className="font-medium">{exportType.toUpperCase()}</div>
                  <div className="text-blue-700">Données:</div>
                  <div className="font-medium">
                    {exportOptions.includeDetails ? 'Complet' : 'Basique'}
                  </div>
                  <div className="text-blue-700">Date:</div>
                  <div className="font-medium">
                    {format(new Date(selectedDate), 'dd/MM/yyyy', { locale: fr })}
                  </div>
                  {exportType === 'pdf' && (
                    <>
                      <div className="text-blue-700">Format papier:</div>
                      <div className="font-medium">{exportOptions.paperSize}</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowExportModal(false)}
              className="px-6"
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={executeExport}
              isLoading={exportLoading}
              leftIcon={<Download className="h-4 w-4" />}
              className="px-6"
            >
              {exportLoading ? 'Génération...' : 'Télécharger'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Guide d'utilisation */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-5 border border-blue-200">
        <div className="flex items-start gap-4">
          <BarChart3 className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Comment utiliser les statistiques</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-blue-800">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <span><strong>Exportez</strong> les données en Excel pour analyse approfondie</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <span><strong>Générez</strong> des rapports PDF pour partage avec l'équipe</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <span><strong>Comparez</strong> les performances jour après jour dans l'onglet Analytics</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}