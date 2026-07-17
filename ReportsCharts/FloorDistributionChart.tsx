'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line
} from 'recharts';
import { activityService } from '@/services/activityService';
import { 
  Download, 
  Printer, 
  FileSpreadsheet, 
  FileText, 
  RefreshCw,
  Building,
  TrendingUp,
  AlertTriangle,
  Clock,
  ChartPie,
  BarChart as BarChartIcon,
  LineChart as LineChartIcon,
  Table,
  Eye,
  Filter,
  ChevronDown,
  Sparkles,
  Home,
  Users,
  Target,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface FloorData {
  floor: string | number;
  roomsCount: number;
  avgDuration: number;
  issuesCount: number;
  [key: string]: string | number;
}

interface Props {
  date: string;
}

interface ExportOptions {
  format: 'excel' | 'pdf';
  includeCharts: boolean;
  includeDataTable: boolean;
  includeAnalysis: boolean;
  paperSize: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
}

const COLORS = [
  '#34D399', // Vert
  '#FBBF24', // Jaune
  '#6366F1', // Indigo
  '#F87171', // Rouge
  '#60A5FA', // Bleu
  '#A78BFA', // Violet
  '#F472B6', // Rose
  '#10B981', // Émeraude
  '#F59E0B', // Ambre
  '#8B5CF6', // Violet foncé
];

export default function FloorDistributionChart({ date }: Props) {
  const [data, setData] = useState<FloorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<'excel' | 'pdf'>('excel');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'excel',
    includeCharts: true,
    includeDataTable: true,
    includeAnalysis: true,
    paperSize: 'A4',
    orientation: 'portrait'
  });
  const [activeChart, setActiveChart] = useState<'pie' | 'duration' | 'issues' | 'combined' | 'table'>('pie');
  const [hoveredFloor, setHoveredFloor] = useState<string | number | null>(null);

  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchFloorData = async () => {
      setLoading(true);
      try {
        const res = await activityService.getReportPerFloor(date);
        setData(res);
      } catch (error) {
        console.error('Erreur:', error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    if (date) fetchFloorData();
  }, [date]);

  // Calcul des statistiques globales
  const stats = {
    totalRooms: data.reduce((sum, floor) => sum + floor.roomsCount, 0),
    avgDuration: data.reduce((sum, floor) => sum + floor.avgDuration, 0) / (data.length || 1),
    totalIssues: data.reduce((sum, floor) => sum + floor.issuesCount, 0),
    floorsCount: data.length,
    maxDuration: Math.max(...data.map(f => f.avgDuration), 0),
    minDuration: Math.min(...data.map(f => f.avgDuration), Infinity),
  };

  // Formater les données pour les graphiques
  const formattedData = data.map(floor => ({
    ...floor,
    floorName: `Étage ${floor.floor}`,
    completionRate: Math.round((floor.roomsCount / stats.totalRooms) * 1000) / 10,
    efficiency: Math.max(0, Math.round((1 - (floor.issuesCount / floor.roomsCount)) * 1000) / 10)
  }));

  // Générer le rapport Excel
  const generateExcelReport = () => {
    setExportLoading(true);
    
    setTimeout(() => {
      const excelData = [
        ['RAPPORT DE RÉPARTITION PAR ÉTAGE'],
        [`Date: ${format(new Date(date), 'dd/MM/yyyy', { locale: fr })}`],
        [''],
        ['STATISTIQUES GLOBALES'],
        ['Total étages', stats.floorsCount],
        ['Total chambres', stats.totalRooms],
        ['Temps moyen global', `${stats.avgDuration.toFixed(1)} min`],
        ['Problèmes totaux', stats.totalIssues],
        [''],
        ['DONNÉES PAR ÉTAGE'],
        ['Étage', 'Nombre de chambres', 'Temps moyen (min)', 'Problèmes', 'Taux d\'occupation', 'Efficacité']
      ];

      formattedData.forEach(floor => {
        excelData.push([
          `Étage ${floor.floor}`,
          floor.roomsCount,
          floor.avgDuration.toFixed(1),
          floor.issuesCount,
          `${floor.completionRate}%`,
          `${floor.efficiency}%`
        ]);
      });

      excelData.push(['']);
      excelData.push(['ANALYSE DÉTAILLÉE']);
      excelData.push(['Étage le plus rapide', `Étage ${data.find(f => f.avgDuration === stats.minDuration)?.floor || '-'}: ${stats.minDuration.toFixed(1)} min`]);
      excelData.push(['Étage le plus lent', `Étage ${data.find(f => f.avgDuration === stats.maxDuration)?.floor || '-'}: ${stats.maxDuration.toFixed(1)} min`]);
      excelData.push(['Taux moyen de problèmes', `${((stats.totalIssues / stats.totalRooms) * 100).toFixed(1)}%`]);

      const csvContent = excelData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (navigator.msSaveBlob) {
        navigator.msSaveBlob(blob, `repartition_etages_${date}.csv`);
      } else {
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `repartition_etages_${date}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setExportLoading(false);
      setShowExportModal(false);
    }, 1500);
  };

  // Générer le rapport PDF
  const generatePDFReport = () => {
    setExportLoading(true);
    
    setTimeout(() => {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Répartition par Étage - ${format(new Date(date), 'dd/MM/yyyy', { locale: fr })}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 40px;
                color: #333;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #6366F1;
                padding-bottom: 20px;
              }
              .header h1 {
                color: #6366F1;
                font-size: 24px;
              }
              .stats-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
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
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 30px 0;
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
              .chart-container {
                margin: 30px 0;
                text-align: center;
              }
              .chart-title {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 15px;
                color: #4b5563;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Rapport de Répartition par Étage</h1>
              <p>Date: ${format(new Date(date), 'dd MMMM yyyy', { locale: fr })}</p>
            </div>
            
            <div class="stats-grid">
              <div class="stat-card">
                <p>Étages analysés</p>
                <div class="stat-value" style="color: #6366F1;">${stats.floorsCount}</div>
              </div>
              <div class="stat-card">
                <p>Chambres totales</p>
                <div class="stat-value" style="color: #10B981;">${stats.totalRooms}</div>
              </div>
              <div class="stat-card">
                <p>Temps moyen global</p>
                <div class="stat-value" style="color: #F59E0B;">${stats.avgDuration.toFixed(1)} min</div>
              </div>
              <div class="stat-card">
                <p>Problèmes signalés</p>
                <div class="stat-value" style="color: #EF4444;">${stats.totalIssues}</div>
              </div>
            </div>
            
            <div class="chart-container">
              <div class="chart-title">Répartition des chambres par étage</div>
              <!-- Ici, un tableau serait généré à la place du graphique -->
            </div>
            
            <h3>Détails par étage</h3>
            <table>
              <thead>
                <tr>
                  <th>Étage</th>
                  <th>Chambres</th>
                  <th>Temps moyen (min)</th>
                  <th>Problèmes</th>
                  <th>Taux d'occupation</th>
                  <th>Efficacité</th>
                </tr>
              </thead>
              <tbody>
                ${formattedData.map(floor => `
                  <tr>
                    <td>Étage ${floor.floor}</td>
                    <td>${floor.roomsCount}</td>
                    <td>${floor.avgDuration.toFixed(1)}</td>
                    <td>${floor.issuesCount}</td>
                    <td>${floor.completionRate}%</td>
                    <td>${floor.efficiency}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
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
        `);
        printWindow.document.close();
      }

      setExportLoading(false);
      setShowExportModal(false);
    }, 1500);
  };

  // Gérer l'export
  const handleExport = () => {
    setShowExportModal(true);
  };

  // Exécuter l'export
  const executeExport = () => {
    if (exportType === 'excel') {
      generateExcelReport();
    } else {
      generatePDFReport();
    }
  };

  // Gérer l'impression directe
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && chartRef.current) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Répartition par Étage - ${date}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .print-header { text-align: center; margin-bottom: 30px; }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>Répartition par Étage</h1>
            <p>Date: ${date}</p>
          </div>
          ${chartRef.current.innerHTML}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  // Recharger les données
  const handleRefresh = () => {
    const fetchFloorData = async () => {
      setLoading(true);
      try {
        const res = await activityService.getReportPerFloor(date);
        setData(res);
      } catch (error) {
        console.error('Erreur:', error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFloorData();
  };

  return (
    <div className="space-y-6" ref={chartRef}>
      {/* Header avec actions */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Répartition par Étage</h1>
            <p className="text-gray-600 mt-1">
              Analyse des performances et distribution des chambres par étage
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge color="blue" className="flex items-center gap-1">
                <Building className="h-3 w-3" />
                {format(new Date(date), 'dd MMMM yyyy', { locale: fr })}
              </Badge>
              <Badge color="green" className="flex items-center gap-1">
                <Home className="h-3 w-3" />
                {stats.floorsCount} étages
              </Badge>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
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
              disabled={data.length === 0}
            >
              Imprimer
            </Button>
            
            <Button
              variant="primary"
              onClick={handleRefresh}
              isLoading={loading}
              leftIcon={<RefreshCw className="h-4 w-4" />}
              className="flex items-center gap-2"
            >
              Actualiser
            </Button>
          </div>
        </div>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Étages analysés</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.floorsCount}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <Building className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Chambres totales</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.totalRooms}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-xl">
              <Home className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Temps moyen global</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.avgDuration.toFixed(1)} min</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-xl">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Problèmes signalés</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.totalIssues}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-xl">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Onglets des graphiques */}
      <div className="bg-white rounded-2xl shadow-sm border p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <button
            onClick={() => setActiveChart('pie')}
            className={`flex flex-col items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
              activeChart === 'pie'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-700 hover:bg-gray-50 border border-transparent'
            }`}
          >
            <ChartPie className="h-5 w-5" />
            <span className="text-sm">Répartition</span>
          </button>
          
          <button
            onClick={() => setActiveChart('duration')}
            className={`flex flex-col items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
              activeChart === 'duration'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-700 hover:bg-gray-50 border border-transparent'
            }`}
          >
            <BarChartIcon className="h-5 w-5" />
            <span className="text-sm">Temps moyen</span>
          </button>
          
          <button
            onClick={() => setActiveChart('issues')}
            className={`flex flex-col items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
              activeChart === 'issues'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-700 hover:bg-gray-50 border border-transparent'
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm">Problèmes</span>
          </button>
          
          <button
            onClick={() => setActiveChart('combined')}
            className={`flex flex-col items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
              activeChart === 'combined'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-700 hover:bg-gray-50 border border-transparent'
            }`}
          >
            <LineChartIcon className="h-5 w-5" />
            <span className="text-sm">Combined</span>
          </button>
          
          <button
            onClick={() => setActiveChart('table')}
            className={`flex flex-col items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
              activeChart === 'table'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-700 hover:bg-gray-50 border border-transparent'
            }`}
          >
            <Table className="h-5 w-5" />
            <span className="text-sm">Tableau</span>
          </button>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-96">
            <RefreshCw className="animate-spin text-blue-600" size={48} />
            <p className="mt-4 text-gray-600">Chargement des données...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96">
            <AlertTriangle className="text-yellow-500" size={48} />
            <p className="mt-4 text-gray-600">Aucune donnée disponible pour cette date.</p>
            <Button
              variant="outline"
              onClick={handleRefresh}
              className="mt-4"
            >
              Réessayer
            </Button>
          </div>
        ) : (
          <>
            {/* Pie Chart: Répartition des chambres */}
            {activeChart === 'pie' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Répartition des chambres par étage
                    </h3>
                    <p className="text-gray-600 mt-1">
                      Distribution en pourcentage des chambres sur les différents étages
                    </p>
                  </div>
                  <Badge color="purple" className="flex items-center gap-2">
                    <ChartPie className="h-4 w-4" />
                    {stats.totalRooms} chambres
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={formattedData}
                          dataKey="roomsCount"
                          nameKey="floorName"
                          outerRadius={120}
                          innerRadius={40}
                          label={({ name, percent }) => `${name}: ${((percent as number) * 100).toFixed(0)}%`}
                          onMouseEnter={(data, index) => setHoveredFloor(data.floor)}
                          onMouseLeave={() => setHoveredFloor(null)}
                        >
                          {formattedData.map((entry, index) => (
                            <Cell 
                              key={index} 
                              fill={COLORS[index % COLORS.length]}
                              strokeWidth={hoveredFloor === entry.floor ? 3 : 1}
                              stroke="#ffffff"
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any) => [`${value} chambres`, 'Nombre']}
                          labelFormatter={(label) => `Étage ${label}`}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Légende détaillée</h4>
                      <div className="space-y-2">
                        {formattedData.map((floor, index) => (
                          <div 
                            key={floor.floor}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-white transition-colors"
                            onMouseEnter={() => setHoveredFloor(floor.floor)}
                            onMouseLeave={() => setHoveredFloor(null)}
                          >
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              <span className="font-medium">Étage {floor.floor}</span>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-gray-900">{floor.roomsCount} chambres</div>
                              <div className="text-sm text-gray-600">
                                {Math.round((floor.roomsCount / stats.totalRooms) * 100)}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <Target className="h-5 w-5 text-blue-600" />
                        <div>
                          <h4 className="font-medium text-blue-900">Analyse</h4>
                          <p className="text-sm text-blue-700 mt-1">
                            L'étage {formattedData.reduce((max, floor) => floor.roomsCount > max.roomsCount ? floor : max).floor} 
                            a la plus grande concentration de chambres ({Math.round((Math.max(...formattedData.map(f => f.roomsCount)) / stats.totalRooms) * 100)}%)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bar Chart: Temps moyen */}
            {activeChart === 'duration' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Temps moyen de nettoyage par étage
                    </h3>
                    <p className="text-gray-600 mt-1">
                      Analyse des performances de nettoyage par niveau
                    </p>
                  </div>
                  <Badge color="yellow" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Moyenne: {stats.avgDuration.toFixed(1)} min
                  </Badge>
                </div>
                
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={formattedData} 
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="floorName" 
                        tick={{ fill: '#4b5563' }}
                        axisLine={{ stroke: '#d1d5db' }}
                      />
                      <YAxis 
                        tick={{ fill: '#4b5563' }}
                        axisLine={{ stroke: '#d1d5db' }}
                        label={{ 
                          value: 'Temps (minutes)', 
                          angle: -90, 
                          position: 'insideLeft',
                          offset: -10,
                          style: { fill: '#4b5563' }
                        }}
                      />
                      <Tooltip 
                        formatter={(value: any) => [`${value} minutes`, 'Temps moyen']}
                        labelFormatter={(label) => label}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Bar 
                        dataKey="avgDuration" 
                        name="Temps moyen (min)" 
                        radius={[4, 4, 0, 0]}
                      >
                        {formattedData.map((entry, index) => (
                          <Cell 
                            key={index} 
                            fill={entry.avgDuration > stats.avgDuration ? '#F87171' : '#34D399'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <h4 className="font-medium text-green-900">Étage le plus rapide</h4>
                        <p className="text-lg font-bold text-green-700 mt-1">
                          Étage {formattedData.find(f => f.avgDuration === stats.minDuration)?.floor || '-'}: {stats.minDuration.toFixed(1)} min
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <div>
                        <h4 className="font-medium text-red-900">Étage le plus lent</h4>
                        <p className="text-lg font-bold text-red-700 mt-1">
                          Étage {formattedData.find(f => f.avgDuration === stats.maxDuration)?.floor || '-'}: {stats.maxDuration.toFixed(1)} min
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bar Chart: Problèmes signalés */}
            {activeChart === 'issues' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Problèmes signalés par étage
                    </h3>
                    <p className="text-gray-600 mt-1">
                      Suivi des incidents et anomalies par niveau
                    </p>
                  </div>
                  <Badge color="red" className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Total: {stats.totalIssues} problèmes
                  </Badge>
                </div>
                
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={formattedData} 
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="floorName" 
                        tick={{ fill: '#4b5563' }}
                        axisLine={{ stroke: '#d1d5db' }}
                      />
                      <YAxis 
                        tick={{ fill: '#4b5563' }}
                        axisLine={{ stroke: '#d1d5db' }}
                      />
                      <Tooltip 
                        formatter={(value: any) => [`${value} problèmes`, 'Nombre']}
                        labelFormatter={(label) => label}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Bar 
                        dataKey="issuesCount" 
                        name="Problèmes signalés" 
                        radius={[4, 4, 0, 0]}
                      >
                        {formattedData.map((entry, index) => (
                          <Cell 
                            key={index} 
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <Target className="h-5 w-5 text-yellow-600" />
                    <div>
                      <h4 className="font-medium text-yellow-900">Taux de problèmes</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Taux moyen de problèmes: {((stats.totalIssues / stats.totalRooms) * 100).toFixed(1)}% 
                        (soit 1 problème pour {stats.totalRooms / stats.totalIssues} chambres)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Combined Chart */}
            {activeChart === 'combined' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Vue combinée des performances
                    </h3>
                    <p className="text-gray-600 mt-1">
                      Analyse comparative des temps moyens et problèmes signalés
                    </p>
                  </div>
                  <Badge color="indigo" className="flex items-center gap-2">
                    <LineChartIcon className="h-4 w-4" />
                    Vue comparative
                  </Badge>
                </div>
                
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      data={formattedData} 
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="floorName" 
                        tick={{ fill: '#4b5563' }}
                        axisLine={{ stroke: '#d1d5db' }}
                      />
                      <YAxis 
                        yAxisId="left"
                        tick={{ fill: '#4b5563' }}
                        axisLine={{ stroke: '#d1d5db' }}
                        label={{ 
                          value: 'Temps (minutes)', 
                          angle: -90, 
                          position: 'insideLeft',
                          offset: -10,
                          style: { fill: '#6366F1' }
                        }}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        tick={{ fill: '#4b5563' }}
                        axisLine={{ stroke: '#d1d5db' }}
                        label={{ 
                          value: 'Problèmes', 
                          angle: 90, 
                          position: 'insideRight',
                          offset: -10,
                          style: { fill: '#F87171' }
                        }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="avgDuration" 
                        name="Temps moyen (min)" 
                        stroke="#6366F1"
                        strokeWidth={3}
                        dot={{ r: 6 }}
                        activeDot={{ r: 8 }}
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="issuesCount" 
                        name="Problèmes signalés" 
                        stroke="#F87171"
                        strokeWidth={3}
                        dot={{ r: 6 }}
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Table View */}
            {activeChart === 'table' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Tableau des données par étage
                    </h3>
                    <p className="text-gray-600 mt-1">
                      Vue détaillée de toutes les métriques par niveau
                    </p>
                  </div>
                  <Badge color="gray" className="flex items-center gap-2">
                    <Table className="h-4 w-4" />
                    {formattedData.length} enregistrements
                  </Badge>
                </div>
                
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Étage
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Chambres
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Temps moyen
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Problèmes
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Taux d'occupation
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Efficacité
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Performance
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {formattedData.map((floor) => {
                        const performanceScore = 100 - ((floor.avgDuration - stats.minDuration) / (stats.maxDuration - stats.minDuration || 1)) * 40 - (floor.issuesCount * 10);
                        
                        return (
                          <tr key={floor.floor} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    Étage {floor.floor}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 font-semibold">{floor.roomsCount}</div>
                              <div className="text-xs text-gray-500">
                                {Math.round((floor.roomsCount / stats.totalRooms) * 100)}%
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className={`text-sm font-semibold ${
                                  floor.avgDuration <= stats.avgDuration ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {floor.avgDuration.toFixed(1)} min
                                </div>
                                {floor.avgDuration <= stats.avgDuration ? (
                                  <TrendingUp className="h-4 w-4 text-green-500" />
                                ) : (
                                  <TrendingUp className="h-4 w-4 text-red-500 transform rotate-180" />
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge 
                                color={floor.issuesCount === 0 ? "green" : floor.issuesCount <= 2 ? "yellow" : "red"}
                                className="inline-flex items-center gap-1"
                              >
                                <AlertTriangle className="h-3 w-3" />
                                {floor.issuesCount}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden mr-3">
                                  <div 
                                    className="h-full bg-blue-500 rounded-full"
                                    style={{ width: `${Math.min(floor.completionRate, 100)}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium text-gray-700">
                                  {floor.completionRate}%
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-gray-900">
                                {floor.efficiency}%
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge 
                                color={
                                  performanceScore >= 80 ? "green" :
                                  performanceScore >= 60 ? "yellow" :
                                  "red"
                                }
                              >
                                {Math.round(performanceScore)}/100
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
        title="Exporter la répartition par étage"
        size="lg"
      >
        <div className="space-y-6">
          {/* Sélection du format */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Format d'export</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                  <span className="text-xs text-gray-500">Données tabulées</span>
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
                  <span className="text-xs text-gray-500">Rapport formaté</span>
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
                  <span className="text-sm font-medium text-gray-700">Inclure les graphiques</span>
                  <p className="text-xs text-gray-500">Visualisations des données</p>
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
                  <span className="text-sm font-medium text-gray-700">Inclure le tableau des données</span>
                  <p className="text-xs text-gray-500">Vue détaillée par étage</p>
                </div>
                <input
                  type="checkbox"
                  checked={exportOptions.includeDataTable}
                  onChange={(e) => setExportOptions({...exportOptions, includeDataTable: e.target.checked})}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">Inclure l'analyse</span>
                  <p className="text-xs text-gray-500">Commentaires et insights</p>
                </div>
                <input
                  type="checkbox"
                  checked={exportOptions.includeAnalysis}
                  onChange={(e) => setExportOptions({...exportOptions, includeAnalysis: e.target.checked})}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
              </div>
            </div>
          </div>

          {/* Paramètres PDF */}
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
                  <div className="text-blue-700">Étages:</div>
                  <div className="font-medium">{data.length} niveaux</div>
                  <div className="text-blue-700">Date:</div>
                  <div className="font-medium">
                    {format(new Date(date), 'dd/MM/yyyy', { locale: fr })}
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
      <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-2xl p-5 border border-indigo-200">
        <div className="flex items-start gap-4">
          <ChartPie className="h-6 w-6 text-indigo-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-indigo-900 mb-2">Comment analyser la répartition par étage</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-indigo-800">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <span><strong>Diagramme circulaire</strong> : Visualisez la distribution des chambres par étage</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <span><strong>Barres horizontales</strong> : Comparez les temps moyens et problèmes par niveau</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <span><strong>Tableau détaillé</strong> : Accédez à toutes les métriques et scores de performance</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}