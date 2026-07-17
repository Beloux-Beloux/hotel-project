'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';
import { activityService } from '@/services/activityService';
import { 
  Download, 
  Printer, 
  FileSpreadsheet, 
  FileText, 
  RefreshCw,
  TrendingUp,
  Users,
  Target,
  Award,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Filter,
  ChevronDown,
  BarChart as BarChartIcon,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Table,
  Home,
  Building,
  Eye,
  Star,
  TrendingDown,
  Zap,
  Activity,
  Shield,
  UserCheck
} from 'lucide-react';
import { format, parseISO, differenceInDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { saveAs } from 'file-saver';

interface StaffDailyPerformance {
  staff_name: string;
  date: string;
  cleaned_rooms: number;
  validated_rooms: number;
  avg_duration: number;
  validation_rate: number;
  department?: string;
  shift?: string;
}

interface EnhancedStaffPerformance extends StaffDailyPerformance {
  efficiency_score?: number;
  issues_count?: number;
  productivity_score?: number;
  quality_score?: number;
  performance_trend?: 'up' | 'down' | 'stable';
}

interface Props {
  from: string;
  to: string;
}

interface ExportOptions {
  format: 'excel' | 'pdf';
  includeCharts: boolean;
  includeDataTable: boolean;
  includeAnalysis: boolean;
  includeTrends: boolean;
  paperSize: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  timeRange: 'daily' | 'weekly' | 'monthly';
}

interface StaffStats {
  staff: string;
  totalCleaned: number;
  totalValidated: number;
  avgDuration: number;
  avgValidationRate: number;
  avgEfficiency: number;
  bestDay: EnhancedStaffPerformance;
  worstDay: EnhancedStaffPerformance;
  daysCount: number;
  consistencyScore: number;
  peakPerformance: number;
  improvementRate: number;
  department?: string;
  shift?: string;
}

const COLORS = [
  '#34D399', '#6366F1', '#F59E0B', '#EF4444', '#8B5CF6',
  '#10B981', '#F97316', '#0EA5E9', '#A855F7', '#EC4899',
  '#84CC16', '#06B6D4', '#8B5CF6', '#F43F5E', '#14B8A6'
];

const PERFORMANCE_LEVELS = {
  EXCELLENT: { min: 85, color: '#10B981', label: 'Excellent' },
  GOOD: { min: 70, color: '#3B82F6', label: 'Bon' },
  AVERAGE: { min: 60, color: '#F59E0B', label: 'Moyen' },
  NEEDS_IMPROVEMENT: { min: 0, color: '#EF4444', label: 'À améliorer' }
};

export default function StaffPerformanceChart({ from, to }: Props) {
  const [data, setData] = useState<EnhancedStaffPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'excel',
    includeCharts: true,
    includeDataTable: true,
    includeAnalysis: true,
    includeTrends: true,
    paperSize: 'A4',
    orientation: 'portrait',
    timeRange: 'daily'
  });
  const [activeView, setActiveView] = useState<'trend' | 'comparison' | 'efficiency' | 'table' | 'radar'>('trend');
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({ from, to });
  const [filters, setFilters] = useState({
    minEfficiency: 0,
    maxEfficiency: 100,
    departments: [] as string[],
    shifts: [] as string[],
    showOnlyTopPerformers: false
  });
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPerformance = async () => {
      setLoading(true);
      try {
        const res = await activityService.getStaffPerform(from, to);
        const enhancedData = res.map(item => enhancePerformanceData(item));
        setData(enhancedData);
        
        const allStaff = Array.from(new Set(enhancedData.map(d => d.staff_name)));
        setSelectedStaff(allStaff);
      } catch (error) {
        console.error('Erreur de chargement des performances:', error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (from && to) fetchPerformance();
  }, [from, to]);

  const enhancePerformanceData = (item: StaffDailyPerformance): EnhancedStaffPerformance => {
    const efficiency = calculateEfficiencyScore(item);
    const issues = item.cleaned_rooms - item.validated_rooms;
    
    return {
      ...item,
      efficiency_score: efficiency,
      issues_count: Math.max(0, issues),
      productivity_score: Math.min(100, item.cleaned_rooms * 8),
      quality_score: item.validation_rate
    };
  };

  const calculateEfficiencyScore = (staff: StaffDailyPerformance): number => {
    const validationWeight = staff.validation_rate;
    const speedWeight = staff.avg_duration < 25 ? 100 : 
                      staff.avg_duration < 40 ? 80 : 
                      staff.avg_duration < 60 ? 60 : 
                      40;
    const productivityWeight = Math.min(100, staff.cleaned_rooms * 12);
    
    return Math.round(
      (validationWeight * 0.35) + 
      (speedWeight * 0.35) + 
      (productivityWeight * 0.3)
    );
  };

  const calculateStaffStats = (staffName: string): StaffStats | null => {
    const staffData = data.filter(d => d.staff_name === staffName);
    if (staffData.length === 0) return null;

    const totalCleaned = staffData.reduce((sum, d) => sum + d.cleaned_rooms, 0);
    const totalValidated = staffData.reduce((sum, d) => sum + d.validated_rooms, 0);
    const avgDuration = staffData.reduce((sum, d) => sum + d.avg_duration, 0) / staffData.length;
    const avgValidationRate = staffData.reduce((sum, d) => sum + d.validation_rate, 0) / staffData.length;
    const avgEfficiency = staffData.reduce((sum, d) => sum + (d.efficiency_score || 0), 0) / staffData.length;
    
    const bestDay = staffData.reduce((best, current) => 
      (current.efficiency_score || 0) > (best.efficiency_score || 0) ? current : best
    );
    
    const worstDay = staffData.reduce((worst, current) => 
      (current.efficiency_score || 0) < (worst.efficiency_score || 0) ? current : worst
    );

    const efficiencyScores = staffData.map(d => d.efficiency_score || 0);
    const consistencyScore = calculateConsistency(efficiencyScores);
    const peakPerformance = Math.max(...efficiencyScores);
    const improvementRate = calculateImprovementRate(efficiencyScores);

    return {
      staff: staffName,
      totalCleaned,
      totalValidated,
      avgDuration,
      avgValidationRate,
      avgEfficiency,
      bestDay,
      worstDay,
      daysCount: staffData.length,
      consistencyScore,
      peakPerformance,
      improvementRate,
      department: staffData[0]?.department,
      shift: staffData[0]?.shift
    };
  };

  const calculateConsistency = (scores: number[]): number => {
    if (scores.length < 2) return 100;
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    return Math.max(0, 100 - (stdDev * 2));
  };

  const calculateImprovementRate = (scores: number[]): number => {
    if (scores.length < 2) return 0;
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    return avgSecond - avgFirst;
  };

  const staffGroups = Array.from(new Set(data.map(d => d.staff_name))).map(staff => ({
    staff,
    data: data.filter(d => d.staff_name === staff).sort((a, b) => 
      parseISO(a.date).getTime() - parseISO(b.date).getTime()
    ),
    stats: calculateStaffStats(staff)
  })).filter(group => group.stats !== null);

  const filteredStaffGroups = staffGroups.filter(group => {
    if (selectedStaff.length > 0 && !selectedStaff.includes(group.staff)) return false;
    if (filters.showOnlyTopPerformers && (group.stats?.avgEfficiency || 0) < 80) return false;
    if (filters.departments.length > 0 && group.stats?.department && 
        !filters.departments.includes(group.stats.department)) return false;
    if (filters.shifts.length > 0 && group.stats?.shift && 
        !filters.shifts.includes(group.stats.shift)) return false;
    
    const efficiency = group.stats?.avgEfficiency || 0;
    return efficiency >= filters.minEfficiency && efficiency <= filters.maxEfficiency;
  });

  // CORRECTION : Protection contre les tableaux vides dans les réductions
  const overallStats = {
    totalStaff: staffGroups.length,
    totalDays: Math.max(1, differenceInDays(parseISO(to), parseISO(from)) + 1),
    avgCleanedPerDay: data.length > 0 ? 
      data.reduce((sum, d) => sum + d.cleaned_rooms, 0) / (new Set(data.map(d => d.date))).size : 0,
    avgValidationRate: data.length > 0 ? 
      data.reduce((sum, d) => sum + d.validation_rate, 0) / data.length : 0,
    avgEfficiency: staffGroups.length > 0 ?
      staffGroups.reduce((sum, g) => sum + (g.stats?.avgEfficiency || 0), 0) / staffGroups.length : 0,
    topPerformer: staffGroups.length > 0 ? staffGroups.reduce((top, current) => {
      if (!top) return current;
      const topEfficiency = top.stats?.avgEfficiency || 0;
      const currentEfficiency = current.stats?.avgEfficiency || 0;
      return currentEfficiency > topEfficiency ? current : top;
    }, staffGroups[0]) : null,
    mostConsistent: staffGroups.length > 0 ? staffGroups.reduce((most, current) => {
      if (!most) return current;
      const mostConsistency = most.stats?.consistencyScore || 0;
      const currentConsistency = current.stats?.consistencyScore || 0;
      return currentConsistency > mostConsistency ? current : most;
    }, staffGroups[0]) : null,
    mostImproved: staffGroups.length > 0 ? staffGroups.reduce((most, current) => {
      if (!most) return current;
      const mostImprovedRate = most.stats?.improvementRate || 0;
      const currentImprovedRate = current.stats?.improvementRate || 0;
      return currentImprovedRate > mostImprovedRate ? current : most;
    }, staffGroups[0]) : null
  };

  const getPerformanceLevel = (score: number) => {
    if (score >= PERFORMANCE_LEVELS.EXCELLENT.min) return PERFORMANCE_LEVELS.EXCELLENT;
    if (score >= PERFORMANCE_LEVELS.GOOD.min) return PERFORMANCE_LEVELS.GOOD;
    if (score >= PERFORMANCE_LEVELS.AVERAGE.min) return PERFORMANCE_LEVELS.AVERAGE;
    return PERFORMANCE_LEVELS.NEEDS_IMPROVEMENT;
  };

  const exportToExcel = () => {
    setExportLoading(true);
    try {
      const wb = XLSX.utils.book_new();
      wb.Props = {
        Title: "Rapport de Performance du Personnel",
        Subject: "Analyse des performances du personnel",
        Author: "Système de Gestion Hôtelière",
        CreatedDate: new Date()
      };

      const summaryData = [
        ["RAPPORT DE PERFORMANCE DU PERSONNEL"],
        [`Période: ${format(parseISO(from), 'dd/MM/yyyy', { locale: fr })} - ${format(parseISO(to), 'dd/MM/yyyy', { locale: fr })}`],
        [`Généré le: ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`],
        [""],
        ["ANALYSE GLOBALE"],
        ["Nombre d'employés analysés", overallStats.totalStaff],
        ["Période d'analyse", `${overallStats.totalDays} jours`],
        ["Productivité moyenne", `${overallStats.avgCleanedPerDay.toFixed(2)} chambres/jour`],
        ["Qualité moyenne", `${overallStats.avgValidationRate.toFixed(2)}%`],
        ["Efficacité moyenne", `${overallStats.avgEfficiency.toFixed(2)}%`],
        ["Meilleur performeur", overallStats.topPerformer?.stats?.staff || "N/A"],
        ["Score du meilleur", `${overallStats.topPerformer?.stats?.avgEfficiency.toFixed(2)}%`],
        ["Plus constant", overallStats.mostConsistent?.stats?.staff || "N/A"],
        ["Score de constance", `${overallStats.mostConsistent?.stats?.consistencyScore.toFixed(2)}%`],
        [""],
        ["ÉCHELLE DE PERFORMANCE"],
        ["85-100%", "EXCELLENT - Performance exceptionnelle"],
        ["70-84%", "BON - Performance au-dessus de la moyenne"],
        ["60-69%", "MOYEN - Performance acceptable"],
        ["0-59%", "À AMÉLIORER - Nécessite une attention"]
      ];

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Résumé");

      const detailedData = data.map(item => ({
        "Employé": item.staff_name,
        "Date": format(parseISO(item.date), 'dd/MM/yyyy', { locale: fr }),
        "Département": item.department || "Non spécifié",
        "Shift": item.shift || "Non spécifié",
        "Chambres nettoyées": item.cleaned_rooms,
        "Chambres validées": item.validated_rooms,
        "Taux de validation": item.validation_rate,
        "Durée moyenne": item.avg_duration,
        "Score efficacité": item.efficiency_score || 0,
        "Score productivité": item.productivity_score || 0,
        "Score qualité": item.quality_score || 0,
        "Problèmes": item.issues_count || 0
      }));

      const wsDetails = XLSX.utils.json_to_sheet(detailedData);
      XLSX.utils.book_append_sheet(wb, wsDetails, "Données détaillées");

      const statsData = staffGroups.map(group => {
        const stats = group.stats;
        const level = getPerformanceLevel(stats?.avgEfficiency || 0);
        return {
          "Employé": group.staff,
          "Département": stats?.department || "Non spécifié",
          "Shift": stats?.shift || "Non spécifié",
          "Total nettoyées": stats?.totalCleaned || 0,
          "Total validées": stats?.totalValidated || 0,
          "Productivité moyenne": stats ? (stats.totalCleaned / stats.daysCount).toFixed(2) : "0",
          "Durée moyenne": stats?.avgDuration.toFixed(2) || "0",
          "Taux validation moyen": stats?.avgValidationRate.toFixed(2) || "0",
          "Score efficacité": stats?.avgEfficiency.toFixed(2) || "0",
          "Score de constance": stats?.consistencyScore.toFixed(2) || "0",
          "Performance max": stats?.peakPerformance.toFixed(2) || "0",
          "Taux d'amélioration": `${stats?.improvementRate.toFixed(2)}%`,
          "Jours analysés": stats?.daysCount || 0,
          "Niveau": level.label,
          "Recommandations": getRecommendations(stats)
        };
      });

      const wsStats = XLSX.utils.json_to_sheet(statsData);
      XLSX.utils.book_append_sheet(wb, wsStats, "Statistiques par employé");

      const rankingData = staffGroups
        .sort((a, b) => (b.stats?.avgEfficiency || 0) - (a.stats?.avgEfficiency || 0))
        .map((group, index) => {
          const stats = group.stats;
          return {
            "Rang": index + 1,
            "Employé": group.staff,
            "Score efficacité": stats?.avgEfficiency.toFixed(2) || "0",
            "Productivité": `${stats ? (stats.totalCleaned / stats.daysCount).toFixed(1) : "0"}/jour`,
            "Qualité": `${stats?.avgValidationRate.toFixed(1)}%`,
            "Constance": `${stats?.consistencyScore.toFixed(1)}%`,
            "Performance max": `${stats?.peakPerformance.toFixed(1)}%`,
            "Évolution": `${stats?.improvementRate > 0 ? "+" : ""}${stats?.improvementRate.toFixed(1)}%`,
            "Statut": getPerformanceLevel(stats?.avgEfficiency || 0).label
          };
        });

      const wsRanking = XLSX.utils.json_to_sheet(rankingData);
      XLSX.utils.book_append_sheet(wb, wsRanking, "Classement");

      const analysisData = [
        ["ANALYSE DÉTAILLÉE"],
        ["Distribution des performances:"],
        ...Object.entries(PERFORMANCE_LEVELS).map(([key, level]) => [
          level.label,
          `${staffGroups.filter(g => (g.stats?.avgEfficiency || 0) >= level.min).length} employés`
        ]),
        [""],
        ["RECOMMANDATIONS GÉNÉRALES"],
        ...getGeneralRecommendations()
      ];

      const wsAnalysis = XLSX.utils.aoa_to_sheet(analysisData);
      XLSX.utils.book_append_sheet(wb, wsAnalysis, "Analyse");

      const wscols = [
        { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
        { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
        { wch: 15 }, { wch: 15 }, { wch: 15 }
      ];

      [wsSummary, wsDetails, wsStats, wsRanking, wsAnalysis].forEach(ws => {
        ws['!cols'] = wscols;
      });

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const fileName = `performance_personnel_${format(parseISO(from), 'yyyy-MM-dd')}_${format(parseISO(to), 'yyyy-MM-dd')}.xlsx`;
      saveAs(blob, fileName);
      
    } catch (error) {
      console.error('Erreur lors de l\'export Excel:', error);
    } finally {
      setExportLoading(false);
      setShowExportModal(false);
    }
  };

  const getRecommendations = (stats: StaffStats | undefined): string => {
    if (!stats) return "Données insuffisantes";
    
    if (stats.avgEfficiency >= 85) {
      return "Maintenir l'excellence, envisager un mentorat";
    } else if (stats.avgEfficiency >= 70) {
      if (stats.avgDuration > 40) return "Améliorer la rapidité d'exécution";
      if (stats.avgValidationRate < 85) return "Renforcer la qualité du travail";
      return "Continuer les bonnes pratiques";
    } else if (stats.avgEfficiency >= 60) {
      return "Formation recommandée, suivi renforcé";
    } else {
      return "Formation intensive requise, réévaluation nécessaire";
    }
  };

  const getGeneralRecommendations = (): string[][] => {
    const recommendations = [];
    const excellentCount = staffGroups.filter(g => (g.stats?.avgEfficiency || 0) >= 85).length;
    const needsImprovementCount = staffGroups.filter(g => (g.stats?.avgEfficiency || 0) < 60).length;
    
    if (excellentCount > 0) {
      recommendations.push([`${excellentCount} employés excellents`, "Utiliser comme modèles pour le mentorat"]);
    }
    
    if (needsImprovementCount > 0) {
      recommendations.push([`${needsImprovementCount} employés à améliorer`, "Plan de formation individuel requis"]);
    }
    
    if (overallStats.avgValidationRate < 85) {
      recommendations.push(["Qualité globale", "Renforcer les contrôles qualité"]);
    }
    
    if (overallStats.avgCleanedPerDay < 10) {
      recommendations.push(["Productivité", "Optimiser les processus de travail"]);
    }
    
    return recommendations;
  };

  const exportToPDF = () => {
    setExportLoading(true);
    try {
      const doc = new jsPDF({
        orientation: exportOptions.orientation as any,
        unit: 'mm',
        format: exportOptions.paperSize as any
      });
      
      const pageWidth = doc.internal.pageSize.width;
      const margin = 20;
      
      doc.setFontSize(20);
      doc.setTextColor(55, 65, 81);
      doc.setFont('helvetica', 'bold');
      doc.text('Rapport de Performance du Personnel', pageWidth / 2, margin, { align: 'center' });
      
      doc.setFontSize(11);
      doc.setTextColor(107, 114, 128);
      doc.setFont('helvetica', 'normal');
      const periodText = `${format(parseISO(from), 'dd MMMM yyyy', { locale: fr })} - ${format(parseISO(to), 'dd MMMM yyyy', { locale: fr })}`;
      doc.text(`Période : ${periodText}`, pageWidth / 2, margin + 8, { align: 'center' });
      
      doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, pageWidth / 2, margin + 14, { align: 'center' });
      
      doc.setDrawColor(99, 102, 241);
      doc.setLineWidth(0.5);
      doc.line(margin, margin + 18, pageWidth - margin, margin + 18);
      
      let yPos = margin + 25;
      
      doc.setFontSize(16);
      doc.setTextColor(31, 41, 55);
      doc.setFont('helvetica', 'bold');
      doc.text('Aperçu des Performances', margin, yPos);
      yPos += 10;
      
      const overviewStats = [
        ['Métrique', 'Valeur', 'Tendance'],
        ['Employés analysés', `${overallStats.totalStaff}`, ''],
        ['Période analysée', `${overallStats.totalDays} jours`, ''],
        ['Productivité moyenne', `${overallStats.avgCleanedPerDay.toFixed(1)} chambres/jour`, overallStats.avgCleanedPerDay > 12 ? '↗' : '→'],
        ['Qualité moyenne', `${overallStats.avgValidationRate.toFixed(1)}%`, overallStats.avgValidationRate > 85 ? '↗' : '→'],
        ['Efficacité moyenne', `${overallStats.avgEfficiency.toFixed(1)}%`, overallStats.avgEfficiency > 70 ? '↗' : '→']
      ];
      
      (doc as any).autoTable({
        startY: yPos,
        head: [overviewStats[0]],
        body: overviewStats.slice(1),
        theme: 'grid',
        headStyles: { 
          fillColor: [99, 102, 241],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        bodyStyles: { fontSize: 10 },
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 40 },
          2: { cellWidth: 20, halign: 'center' }
        }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
      
      doc.setFontSize(16);
      doc.text('Classement par Efficacité', margin, yPos);
      yPos += 10;
      
      const rankingData = staffGroups
        .sort((a, b) => (b.stats?.avgEfficiency || 0) - (a.stats?.avgEfficiency || 0))
        .slice(0, 10)
        .map((group, index) => {
          const stats = group.stats;
          const level = getPerformanceLevel(stats?.avgEfficiency || 0);
          return [
            index + 1,
            group.staff,
            `${stats?.avgEfficiency.toFixed(1)}%`,
            level.label,
            `${stats?.totalCleaned || 0}`,
            `${stats?.avgValidationRate.toFixed(1)}%`
          ];
        });
      
      (doc as any).autoTable({
        startY: yPos,
        head: [['Rang', 'Employé', 'Score', 'Niveau', 'Nettoyées', 'Qualité']],
        body: rankingData,
        theme: 'grid',
        headStyles: { 
          fillColor: [16, 185, 129],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        bodyStyles: { fontSize: 9 },
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 25, halign: 'center' },
          5: { cellWidth: 25, halign: 'center' }
        },
        didDrawCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 3) {
            const levelName = data.cell.raw;
            const level = Object.values(PERFORMANCE_LEVELS).find(l => l.label === levelName);
            if (level) {
              const rgb = hexToRgb(level.color);
              doc.setFillColor(rgb.r, rgb.g, rgb.b);
              doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
              doc.setTextColor(255, 255, 255);
              doc.text(levelName, data.cell.x + 2, data.cell.y + 5);
              return false;
            }
          }
        }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
      
      if (yPos > 250) {
        doc.addPage();
        yPos = margin;
      }
      
      doc.setFontSize(16);
      doc.text('Analyse par Niveau de Performance', margin, yPos);
      yPos += 10;
      
      const performanceDistribution = Object.entries(PERFORMANCE_LEVELS).map(([key, level]) => {
        const count = staffGroups.filter(g => (g.stats?.avgEfficiency || 0) >= level.min).length;
        const percentage = (count / Math.max(1, staffGroups.length)) * 100;
        return [level.label, `${count} employés`, `${percentage.toFixed(1)}%`];
      });
      
      (doc as any).autoTable({
        startY: yPos,
        head: [['Niveau', 'Nombre', 'Pourcentage']],
        body: performanceDistribution,
        theme: 'grid',
        headStyles: { 
          fillColor: [139, 92, 246],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        bodyStyles: { fontSize: 10 },
        margin: { left: margin, right: margin }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
      
      if (yPos > 230) {
        doc.addPage();
        yPos = margin;
      }
      
      doc.setFontSize(16);
      doc.text('Recommandations', margin, yPos);
      yPos += 10;
      
      doc.setFontSize(11);
      doc.setTextColor(55, 65, 81);
      doc.setFont('helvetica', 'normal');
      
      const recommendations = getGeneralRecommendations();
      recommendations.forEach((rec, index) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = margin;
        }
        doc.setFont('helvetica', 'bold');
        doc.text(`• ${rec[0]}:`, margin, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(rec[1], margin + 10, yPos + 5);
        yPos += 10;
      });
      
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Page ${i} sur ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
        doc.text(
          '© Système de Gestion Hôtelière',
          pageWidth - margin,
          doc.internal.pageSize.height - 10,
          { align: 'right' }
        );
      }
      
      const fileName = `performance_personnel_${format(parseISO(from), 'yyyy-MM-dd')}_${format(parseISO(to), 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
    } finally {
      setExportLoading(false);
      setShowExportModal(false);
    }
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  const handleExport = () => {
    if (exportOptions.format === 'excel') {
      exportToExcel();
    } else {
      exportToPDF();
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && chartRef.current) {
      const formattedDate = `${format(parseISO(from), 'dd/MM/yyyy', { locale: fr })} - ${format(parseISO(to), 'dd/MM/yyyy', { locale: fr })}`;
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Performance du Personnel - ${formattedDate}</title>
          <style>
            @media print {
              @page { margin: 20mm; }
              body { font-family: Arial, sans-serif; margin: 0; }
              .print-header { 
                text-align: center; 
                margin-bottom: 30px;
                border-bottom: 2px solid #6366F1;
                padding-bottom: 20px;
              }
              .print-header h1 { 
                color: #3730a3;
                margin-bottom: 8px;
                font-size: 24px;
              }
              .print-stats {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
                margin: 25px 0;
              }
              .print-stat {
                text-align: center;
                padding: 15px;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                background: #f9fafb;
              }
              .print-stat-value {
                font-size: 24px;
                font-weight: bold;
                margin: 10px 0;
              }
              .performance-levels {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 10px;
                margin: 25px 0;
              }
              .level {
                padding: 10px;
                border-radius: 6px;
                color: white;
                text-align: center;
                font-weight: bold;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
              }
              th, td {
                border: 1px solid #e5e7eb;
                padding: 8px;
                text-align: left;
              }
              th {
                background: #f3f4f6;
                font-weight: 600;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>Rapport de Performance du Personnel</h1>
            <p>Période : ${formattedDate}</p>
            <p>Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}</p>
          </div>
          
          <div class="print-stats">
            <div class="print-stat">
              <p>Employés analysés</p>
              <div class="print-stat-value">${overallStats.totalStaff}</div>
            </div>
            <div class="print-stat">
              <p>Jours analysés</p>
              <div class="print-stat-value">${overallStats.totalDays}</div>
            </div>
            <div class="print-stat">
              <p>Productivité moyenne</p>
              <div class="print-stat-value">${overallStats.avgCleanedPerDay.toFixed(1)}</div>
            </div>
            <div class="print-stat">
              <p>Qualité moyenne</p>
              <div class="print-stat-value">${overallStats.avgValidationRate.toFixed(1)}%</div>
            </div>
          </div>
          
          <div class="performance-levels">
            <div class="level" style="background: #10B981;">Excellent: ${staffGroups.filter(g => (g.stats?.avgEfficiency || 0) >= 85).length}</div>
            <div class="level" style="background: #3B82F6;">Bon: ${staffGroups.filter(g => (g.stats?.avgEfficiency || 0) >= 70 && (g.stats?.avgEfficiency || 0) < 85).length}</div>
            <div class="level" style="background: #F59E0B;">Moyen: ${staffGroups.filter(g => (g.stats?.avgEfficiency || 0) >= 60 && (g.stats?.avgEfficiency || 0) < 70).length}</div>
            <div class="level" style="background: #EF4444;">À améliorer: ${staffGroups.filter(g => (g.stats?.avgEfficiency || 0) < 60).length}</div>
          </div>
          
          ${chartRef.current.innerHTML}
        </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    }
  };

  const handleRefresh = () => {
    const fetchPerformance = async () => {
      setLoading(true);
      try {
        const res = await activityService.getStaffPerform(from, to);
        const enhancedData = res.map(item => enhancePerformanceData(item));
        setData(enhancedData);
      } catch (error) {
        console.error('Erreur de chargement des performances:', error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPerformance();
  };

  const handleSelectAllStaff = () => {
    if (selectedStaff.length === staffGroups.length) {
      setSelectedStaff([]);
    } else {
      setSelectedStaff(staffGroups.map(g => g.staff));
    }
  };

  const toggleStaffFilter = (staff: string) => {
    if (selectedStaff.includes(staff)) {
      setSelectedStaff(selectedStaff.filter(s => s !== staff));
    } else {
      setSelectedStaff([...selectedStaff, staff]);
    }
  };

  const applyFilters = () => {
    setShowFilterModal(false);
  };

  const resetFilters = () => {
    setFilters({
      minEfficiency: 0,
      maxEfficiency: 100,
      departments: [],
      shifts: [],
      showOnlyTopPerformers: false
    });
    setSelectedStaff(staffGroups.map(g => g.staff));
  };

  // Protection contre la division par zéro dans les calculs
  const safeDivision = (numerator: number, denominator: number) => {
    return denominator === 0 ? 0 : numerator / denominator;
  };

  if (loading && data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="animate-spin text-blue-600 mx-auto" size={48} />
          <p className="mt-4 text-gray-600">Chargement des données de performance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" ref={chartRef}>
      {/* En-tête avec actions */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Performance du Personnel</h1>
            </div>
            <p className="text-gray-600">
              Analyse complète des performances individuelles et collectives
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Badge color="blue" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(parseISO(from), 'dd MMM yyyy', { locale: fr })} - {format(parseISO(to), 'dd MMM yyyy', { locale: fr })}
              </Badge>
              <Badge color="green" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {overallStats.totalStaff} employés
              </Badge>
              <Badge color="purple" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {overallStats.totalDays} jours
              </Badge>
              <Badge color="yellow" className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Score moyen: {overallStats.avgEfficiency.toFixed(1)}%
              </Badge>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowFilterModal(true)}
              leftIcon={<Filter className="h-4 w-4" />}
              className="flex items-center gap-2"
            >
              Filtres
              {selectedStaff.length < staffGroups.length && (
                <Badge color="blue" size="sm">{selectedStaff.length}</Badge>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowExportModal(true)}
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

      {/* Cartes de statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-sm border border-blue-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-medium">Employés suivis</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">{overallStats.totalStaff}</p>
              <div className="flex items-center gap-1 mt-1">
                <Home className="h-3 w-3 text-blue-600" />
                <span className="text-xs text-blue-600">{overallStats.totalDays} jours analysés</span>
              </div>
            </div>
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-sm border border-green-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium">Productivité moyenne</p>
              <p className="text-3xl font-bold text-green-900 mt-2">{overallStats.avgCleanedPerDay.toFixed(1)}</p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-green-600" />
                <span className="text-xs text-green-600">chambres/jour</span>
              </div>
            </div>
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <Target className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl shadow-sm border border-yellow-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700 font-medium">Qualité moyenne</p>
              <p className="text-3xl font-bold text-yellow-900 mt-2">{overallStats.avgValidationRate.toFixed(1)}%</p>
              <div className="flex items-center gap-1 mt-1">
                <Shield className="h-3 w-3 text-yellow-600" />
                <span className="text-xs text-yellow-600">taux de validation</span>
              </div>
            </div>
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <CheckCircle className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl shadow-sm border border-purple-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700 font-medium">Meilleur performeur</p>
              <p className="text-lg font-bold text-purple-900 mt-2 truncate">
                {overallStats.topPerformer?.stats?.staff || 'N/A'}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <Star className="h-3 w-3 text-purple-600" />
                <span className="text-xs text-purple-600">
                  Score: {overallStats.topPerformer?.stats?.avgEfficiency.toFixed(1) || 'N/A'}%
                </span>
              </div>
            </div>
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <Award className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Distribution des niveaux de performance */}
      {staffGroups.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribution des Performances</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Object.entries(PERFORMANCE_LEVELS).map(([key, level]) => {
              const count = staffGroups.filter(g => (g.stats?.avgEfficiency || 0) >= level.min).length;
              const percentage = safeDivision(count, staffGroups.length) * 100;
              
              return (
                <div 
                  key={key}
                  className="rounded-xl p-4 text-white"
                  style={{ backgroundColor: level.color }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium opacity-90">{level.label}</p>
                      <p className="text-2xl font-bold mt-1">{count}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{percentage.toFixed(1)}%</div>
                      <div className="text-xs opacity-80">des employés</div>
                    </div>
                  </div>
                  <div className="mt-3 h-2 bg-white/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white/60 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sélecteur de vue */}
      <div className="bg-white rounded-2xl shadow-sm border p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <button
            onClick={() => setActiveView('trend')}
            className={`flex flex-col items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
              activeView === 'trend'
                ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-300 shadow-sm'
                : 'text-gray-700 hover:bg-gray-50 border border-transparent'
            }`}
          >
            <LineChartIcon className="h-5 w-5" />
            <span className="text-sm">Tendances</span>
          </button>
          
          <button
            onClick={() => setActiveView('comparison')}
            className={`flex flex-col items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
              activeView === 'comparison'
                ? 'bg-gradient-to-r from-green-50 to-green-100 text-green-700 border border-green-300 shadow-sm'
                : 'text-gray-700 hover:bg-gray-50 border border-transparent'
            }`}
          >
            <BarChartIcon className="h-5 w-5" />
            <span className="text-sm">Comparaison</span>
          </button>
          
          <button
            onClick={() => setActiveView('efficiency')}
            className={`flex flex-col items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
              activeView === 'efficiency'
                ? 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border border-purple-300 shadow-sm'
                : 'text-gray-700 hover:bg-gray-50 border border-transparent'
            }`}
          >
            <PieChartIcon className="h-5 w-5" />
            <span className="text-sm">Efficacité</span>
          </button>
          
          <button
            onClick={() => setActiveView('radar')}
            className={`flex flex-col items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
              activeView === 'radar'
                ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-700 border border-yellow-300 shadow-sm'
                : 'text-gray-700 hover:bg-gray-50 border border-transparent'
            }`}
          >
            <Activity className="h-5 w-5" />
            <span className="text-sm">Radar</span>
          </button>
          
          <button
            onClick={() => setActiveView('table')}
            className={`flex flex-col items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
              activeView === 'table'
                ? 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border border-gray-300 shadow-sm'
                : 'text-gray-700 hover:bg-gray-50 border border-transparent'
            }`}
          >
            <Table className="h-5 w-5" />
            <span className="text-sm">Tableau</span>
          </button>
        </div>
      </div>

      {/* Filtres rapides */}
      {staffGroups.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filtres rapides:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={selectedStaff.length === staffGroups.length ? "primary" : "outline"}
                onClick={handleSelectAllStaff}
                className="text-xs"
              >
                {selectedStaff.length === staffGroups.length ? 'Tout désélectionner' : 'Tout sélectionner'}
              </Button>
              
              <Button
                size="sm"
                variant={filters.showOnlyTopPerformers ? "primary" : "outline"}
                onClick={() => setFilters({...filters, showOnlyTopPerformers: !filters.showOnlyTopPerformers})}
                className="text-xs"
              >
                <Star className="h-3 w-3 mr-1" />
                Top performeurs
              </Button>
              
              <select
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
                value={filters.minEfficiency}
                onChange={(e) => setFilters({...filters, minEfficiency: parseInt(e.target.value)})}
              >
                <option value="0">Score min: 0%</option>
                <option value="60">Score min: 60%</option>
                <option value="70">Score min: 70%</option>
                <option value="80">Score min: 80%</option>
              </select>
              
              <span className="text-sm text-gray-500 flex items-center">
                {filteredStaffGroups.length} / {staffGroups.length} employés
              </span>
            </div>
          </div>
          
          {/* Liste des employés */}
          <div className="mt-4 flex flex-wrap gap-2">
            {staffGroups.map((group, index) => (
              <button
                key={group.staff}
                onClick={() => toggleStaffFilter(group.staff)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 shadow-sm ${
                  selectedStaff.includes(group.staff)
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border border-blue-700'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedStaff.includes(group.staff) ? 'white' : COLORS[index % COLORS.length] }}
                />
                {group.staff}
                <span className="text-xs px-1.5 py-0.5 rounded bg-white/20">
                  {group.stats?.avgEfficiency.toFixed(0)}%
                </span>
                {selectedStaff.includes(group.staff) ? (
                  <CheckCircle className="h-3 w-3" />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contenu principal */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96">
            <AlertTriangle className="text-yellow-500" size={48} />
            <p className="mt-4 text-gray-600">Aucune donnée disponible pour cette période.</p>
            <Button
              variant="outline"
              onClick={handleRefresh}
              className="mt-4"
            >
              Réessayer
            </Button>
          </div>
        ) : staffGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96">
            <Users className="text-gray-400" size={48} />
            <p className="mt-4 text-gray-600">Aucun employé trouvé dans les données.</p>
          </div>
        ) : filteredStaffGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96">
            <Filter className="text-gray-400" size={48} />
            <p className="mt-4 text-gray-600">Aucun employé ne correspond aux filtres.</p>
            <Button
              variant="outline"
              onClick={resetFilters}
              className="mt-4"
            >
              Réinitialiser les filtres
            </Button>
          </div>
        ) : (
          <>
            {/* Vue Tendances */}
            {activeView === 'trend' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Évolution des Performances
                    </h3>
                    <p className="text-gray-600 mt-1">
                      Tendances des chambres nettoyées au fil du temps
                    </p>
                  </div>
                  <Badge color="blue" className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    {filteredStaffGroups.length} employés affichés
                  </Badge>
                </div>
                
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => format(parseISO(date), 'dd/MM', { locale: fr })}
                        tick={{ fill: '#4b5563' }}
                        axisLine={{ stroke: '#d1d5db' }}
                      />
                      <YAxis 
                        tick={{ fill: '#4b5563' }}
                        axisLine={{ stroke: '#d1d5db' }}
                        label={{ 
                          value: 'Chambres nettoyées', 
                          angle: -90, 
                          position: 'insideLeft',
                          offset: -10,
                          style: { fill: '#4b5563' }
                        }}
                      />
                      <Tooltip 
                        formatter={(value: any) => [`${value} chambres`, 'Nettoyées']}
                        labelFormatter={(label) => format(parseISO(label), 'dd MMM yyyy', { locale: fr })}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Legend />
                      {filteredStaffGroups.map((group, idx) => (
                        <Line
                          key={group.staff}
                          data={group.data}
                          type="monotone"
                          dataKey="cleaned_rooms"
                          name={group.staff}
                          stroke={COLORS[idx % COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          activeDot={{ r: 6 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                {filteredStaffGroups.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                      <h4 className="font-semibold text-gray-900 mb-4">Taux de Validation</h4>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={filteredStaffGroups.flatMap(group => 
                            group.data.map(d => ({ ...d, staff: group.staff }))
                          )}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
                            <XAxis 
                              dataKey="date"
                              tickFormatter={(date) => format(parseISO(date), 'dd/MM', { locale: fr })}
                              tick={{ fill: '#4b5563' }}
                            />
                            <YAxis 
                              domain={[0, 100]}
                              tickFormatter={(value) => `${value}%`}
                              tick={{ fill: '#4b5563' }}
                            />
                            <Tooltip 
                              formatter={(value: any) => [`${value}%`, 'Taux']}
                              labelFormatter={(label) => format(parseISO(label), 'dd MMM yyyy', { locale: fr })}
                            />
                            <Legend />
                            {filteredStaffGroups.map((group, idx) => (
                              <Area
                                key={group.staff}
                                data={group.data}
                                type="monotone"
                                dataKey="validation_rate"
                                name={group.staff}
                                stroke={COLORS[idx % COLORS.length]}
                                fill={COLORS[idx % COLORS.length]}
                                fillOpacity={0.1}
                                strokeWidth={2}
                              />
                            ))}
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                      <h4 className="font-semibold text-gray-900 mb-4">Score d'Efficacité</h4>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart>
                            <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
                            <XAxis 
                              dataKey="date"
                              tickFormatter={(date) => format(parseISO(date), 'dd/MM', { locale: fr })}
                              tick={{ fill: '#4b5563' }}
                            />
                            <YAxis 
                              domain={[0, 100]}
                              tickFormatter={(value) => `${value}%`}
                              tick={{ fill: '#4b5563' }}
                            />
                            <Tooltip 
                              formatter={(value: any) => [`${value}%`, 'Score']}
                              labelFormatter={(label) => format(parseISO(label), 'dd MMM yyyy', { locale: fr })}
                            />
                            <Legend />
                            {filteredStaffGroups.map((group, idx) => (
                              <Line
                                key={group.staff}
                                data={group.data}
                                type="monotone"
                                dataKey="efficiency_score"
                                name={group.staff}
                                stroke={COLORS[idx % COLORS.length]}
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                activeDot={{ r: 6 }}
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Vue Comparaison */}
            {activeView === 'comparison' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Comparaison des Performances
                    </h3>
                    <p className="text-gray-600 mt-1">
                      Analyse comparative sur toute la période
                    </p>
                  </div>
                  <Badge color="green" className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Score d'efficacité moyen
                  </Badge>
                </div>
                
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={filteredStaffGroups.map(group => ({
                        staff: group.staff,
                        cleaned: group.stats?.totalCleaned || 0,
                        validated: group.stats?.totalValidated || 0,
                        efficiency: group.stats?.avgEfficiency || 0,
                        duration: group.stats?.avgDuration || 0
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="staff" 
                        tick={{ fill: '#4b5563' }}
                        axisLine={{ stroke: '#d1d5db' }}
                      />
                      <YAxis 
                        yAxisId="left"
                        tick={{ fill: '#4b5563' }}
                        axisLine={{ stroke: '#d1d5db' }}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        tick={{ fill: '#4b5563' }}
                        axisLine={{ stroke: '#d1d5db' }}
                        domain={[0, 100]}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value: any, name: string) => {
                          if (name === 'efficiency') return [`${value}%`, 'Score efficacité'];
                          if (name === 'duration') return [`${value} min`, 'Durée moyenne'];
                          return [value, name === 'cleaned' ? 'Nettoyées' : 'Validées'];
                        }}
                      />
                      <Legend />
                      <Bar 
                        yAxisId="left"
                        dataKey="cleaned" 
                        name="Chambres nettoyées" 
                        fill="#34D399"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        yAxisId="left"
                        dataKey="validated" 
                        name="Chambres validées" 
                        fill="#6366F1"
                        radius={[4, 4, 0, 0]}
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone"
                        dataKey="efficiency"
                        name="Score efficacité"
                        stroke="#F59E0B"
                        strokeWidth={3}
                        dot={{ r: 6 }}
                        activeDot={{ r: 8 }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {filteredStaffGroups.length > 0 ? Math.max(...filteredStaffGroups.map(g => g.stats?.avgEfficiency || 0)).toFixed(1) : "0"}%
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Meilleur score</p>
                      <p className="text-xs text-gray-500">
                        {filteredStaffGroups.length > 0 ? filteredStaffGroups.find(g => 
                          g.stats?.avgEfficiency === Math.max(...filteredStaffGroups.map(g => g.stats?.avgEfficiency || 0))
                        )?.staff || 'N/A' : 'N/A'}
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-700">
                        {filteredStaffGroups.length > 0 ? 
                          (filteredStaffGroups.reduce((sum, g) => sum + (g.stats?.avgEfficiency || 0), 0) / filteredStaffGroups.length).toFixed(1) : "0"}%
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Moyenne générale</p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-yellow-600">
                        {filteredStaffGroups.length > 0 ? Math.min(...filteredStaffGroups.map(g => g.stats?.avgEfficiency || 100)).toFixed(1) : "0"}%
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Score le plus bas</p>
                      <p className="text-xs text-gray-500">
                        {filteredStaffGroups.length > 0 ? filteredStaffGroups.find(g => 
                          g.stats?.avgEfficiency === Math.min(...filteredStaffGroups.map(g => g.stats?.avgEfficiency || 100))
                        )?.staff || 'N/A' : 'N/A'}
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {overallStats.mostConsistent?.stats?.consistencyScore.toFixed(1) || 0}%
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Plus constant</p>
                      <p className="text-xs text-gray-500">
                        {overallStats.mostConsistent?.staff || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Vue Efficacité */}
            {activeView === 'efficiency' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Répartition de l'Efficacité
                    </h3>
                    <p className="text-gray-600 mt-1">
                      Distribution des scores d'efficacité par employé
                    </p>
                  </div>
                  <Badge color="purple" className="flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4" />
                    Scores calculés
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={filteredStaffGroups.map(group => ({
                            name: group.staff,
                            value: group.stats?.avgEfficiency || 0,
                            cleaned: group.stats?.totalCleaned || 0
                          }))}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={120}
                          innerRadius={60}
                          label={({ name, percent }) => `${name}: ${((percent as number) * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {filteredStaffGroups.map((_, index) => (
                            <Cell 
                              key={index} 
                              fill={COLORS[index % COLORS.length]}
                              stroke="#ffffff"
                              strokeWidth={2}
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any) => [`${value}%`, 'Score efficacité']}
                          labelFormatter={(label) => label}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Classement par Efficacité</h4>
                      <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                        {filteredStaffGroups
                          .sort((a, b) => (b.stats?.avgEfficiency || 0) - (a.stats?.avgEfficiency || 0))
                          .map((group, index) => {
                            const stats = group.stats;
                            const level = getPerformanceLevel(stats?.avgEfficiency || 0);
                            
                            return (
                              <div 
                                key={group.staff}
                                className="flex items-center justify-between p-3 rounded-lg hover:bg-white transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 flex items-center justify-center rounded-lg"
                                    style={{ backgroundColor: level.color + '20' }}>
                                    <span className="font-bold" style={{ color: level.color }}>
                                      {index + 1}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900">{group.staff}</div>
                                    <div className="text-xs text-gray-500">
                                      {stats?.totalCleaned || 0} chambres • {stats?.avgValidationRate.toFixed(1)}% qualité
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold" style={{ color: level.color }}>
                                    {(stats?.avgEfficiency || 0).toFixed(1)}%
                                  </div>
                                  <div className="text-xs text-gray-500">{level.label}</div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-green-50 to-emerald-100 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <Award className="h-5 w-5 text-green-600" />
                        <div>
                          <h4 className="font-medium text-green-900">Performance Remarquable</h4>
                          <p className="text-sm text-green-700 mt-1">
                            {overallStats.topPerformer?.stats?.staff || 'N/A'} a le meilleur score d'efficacité avec {overallStats.topPerformer?.stats?.avgEfficiency.toFixed(1) || 'N/A'}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Vue Radar */}
            {activeView === 'radar' && filteredStaffGroups.length > 0 && (
              <div className="space-y-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Analyse Multidimensionnelle
                    </h3>
                    <p className="text-gray-600 mt-1">
                      Comparaison des différentes métriques par employé
                    </p>
                  </div>
                  <Badge color="yellow" className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Vue radar
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={filteredStaffGroups.slice(0, 3).flatMap(group => {
                        const stats = group.stats;
                        return {
                          subject: group.staff,
                          Efficacité: stats?.avgEfficiency || 0,
                          Productivité: stats ? (stats.totalCleaned / stats.daysCount) * 5 : 0,
                          Qualité: stats?.avgValidationRate || 0,
                          Rapidité: stats?.avgDuration ? Math.max(0, 100 - stats.avgDuration) : 0,
                          Consistance: stats?.consistencyScore || 0,
                          fullMark: 100
                        };
                      })}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#4b5563' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#4b5563' }} />
                        {filteredStaffGroups.slice(0, 3).map((group, idx) => (
                          <Radar
                            key={group.staff}
                            name={group.staff}
                            dataKey={group.staff}
                            stroke={COLORS[idx % COLORS.length]}
                            fill={COLORS[idx % COLORS.length]}
                            fillOpacity={0.2}
                            strokeWidth={2}
                          />
                        ))}
                        <Legend />
                        <Tooltip 
                          formatter={(value: any) => [`${value}%`, 'Score']}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
                      <h4 className="font-semibold text-gray-900 mb-4">Indicateurs Clés</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {filteredStaffGroups.slice(0, 4).map((group, idx) => (
                          <div key={group.staff} className="bg-white p-4 rounded-lg shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                              <span className="font-medium text-gray-900">{group.staff}</span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Efficacité:</span>
                                <span className="font-semibold">{group.stats?.avgEfficiency.toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Productivité:</span>
                                <span className="font-semibold">{group.stats ? (group.stats.totalCleaned / group.stats.daysCount).toFixed(1) : 0}/jour</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Consistance:</span>
                                <span className="font-semibold">{group.stats?.consistencyScore.toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <Zap className="h-5 w-5 text-purple-600" />
                        <div>
                          <h4 className="font-medium text-purple-900">Analyse des Forces</h4>
                          <p className="text-sm text-purple-700 mt-1">
                            Les meilleurs performeurs combinent efficacité, qualité et consistance
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Vue Tableau */}
            {activeView === 'table' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Tableau des Performances Détaillées
                    </h3>
                    <p className="text-gray-600 mt-1">
                      Vue complète de toutes les métriques par employé
                    </p>
                  </div>
                  <Badge color="gray" className="flex items-center gap-2">
                    <Table className="h-4 w-4" />
                    {filteredStaffGroups.length} employés
                  </Badge>
                </div>
                
                <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Rang
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Employé
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Productivité
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Qualité
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Rapidité
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Score Efficacité
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Consistance
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Statut
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredStaffGroups
                        .sort((a, b) => (b.stats?.avgEfficiency || 0) - (a.stats?.avgEfficiency || 0))
                        .map((group, index) => {
                          const stats = group.stats;
                          const level = getPerformanceLevel(stats?.avgEfficiency || 0);
                          
                          return (
                            <tr key={group.staff} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-center">
                                  <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                                    index === 0 ? 'bg-yellow-100 text-yellow-800' :
                                    index === 1 ? 'bg-gray-100 text-gray-800' :
                                    index === 2 ? 'bg-amber-100 text-amber-800' :
                                    'bg-gray-50 text-gray-700'
                                  }`}>
                                    <span className="font-bold">{index + 1}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="ml-4">
                                    <div className="text-sm font-semibold text-gray-900">
                                      {group.staff}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {stats?.daysCount || 0} jours • {stats?.department || 'N/A'} • {stats?.shift || 'N/A'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 font-semibold">
                                  {stats ? (stats.totalCleaned / Math.max(1, stats.daysCount)).toFixed(1) : 0}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {stats?.totalCleaned || 0} total
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden mr-3">
                                    <div 
                                      className="h-full bg-green-500 rounded-full"
                                      style={{ width: `${Math.min(stats?.avgValidationRate || 0, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium text-gray-700">
                                    {stats?.avgValidationRate.toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className={`text-sm font-semibold ${
                                    (stats?.avgDuration || 0) <= 30 ? 'text-green-600' : 
                                    (stats?.avgDuration || 0) <= 45 ? 'text-yellow-600' : 'text-red-600'
                                  }`}>
                                    {stats?.avgDuration.toFixed(1)} min
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col">
                                  <div className="text-lg font-bold" style={{ color: level.color }}>
                                    {stats?.avgEfficiency.toFixed(1)}
                                  </div>
                                  <div className="text-xs text-gray-500">/100</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden mr-3">
                                    <div 
                                      className="h-full bg-blue-500 rounded-full"
                                      style={{ width: `${Math.min(stats?.consistencyScore || 0, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium text-gray-700">
                                    {stats?.consistencyScore.toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge 
                                  className="inline-flex items-center gap-1"
                                  style={{ 
                                    backgroundColor: level.color + '20',
                                    color: level.color,
                                    borderColor: level.color
                                  }}
                                >
                                  {level.label}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  className="text-blue-600 hover:text-blue-900"
                                  onClick={() => toggleStaffFilter(group.staff)}
                                >
                                  {selectedStaff.includes(group.staff) ? 'Cacher' : 'Afficher'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
                
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {filteredStaffGroups.length} employés affichés sur {staffGroups.length}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span>Excellent</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span>Bon</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span>Moyen</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span>À améliorer</span>
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
        title="Exporter les Performances"
        size="lg"
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Format d'export</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => setExportOptions({...exportOptions, format: 'excel'})}
                className={`p-4 border rounded-xl text-center transition-all ${
                  exportOptions.format === 'excel'
                    ? 'border-green-500 bg-green-50 ring-2 ring-green-100'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <FileSpreadsheet className={`h-8 w-8 ${
                    exportOptions.format === 'excel' ? 'text-green-600' : 'text-gray-600'
                  }`} />
                  <span className="font-medium">Excel (.xlsx)</span>
                  <span className="text-xs text-gray-500">5 feuilles de données</span>
                </div>
              </button>
              
              <button
                onClick={() => setExportOptions({...exportOptions, format: 'pdf'})}
                className={`p-4 border rounded-xl text-center transition-all ${
                  exportOptions.format === 'pdf'
                    ? 'border-red-500 bg-red-50 ring-2 ring-red-100'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <FileText className={`h-8 w-8 ${
                    exportOptions.format === 'pdf' ? 'text-red-600' : 'text-gray-600'
                  }`} />
                  <span className="font-medium">PDF</span>
                  <span className="text-xs text-gray-500">Rapport formaté professionnel</span>
                </div>
              </button>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Contenu de l'export</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">Résumé et analyse</span>
                  <p className="text-xs text-gray-500">Métriques globales et recommandations</p>
                </div>
                <input
                  type="checkbox"
                  checked={exportOptions.includeAnalysis}
                  onChange={(e) => setExportOptions({...exportOptions, includeAnalysis: e.target.checked})}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">Données détaillées</span>
                  <p className="text-xs text-gray-500">Toutes les données jour par jour</p>
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
                  <span className="text-sm font-medium text-gray-700">Statistiques par employé</span>
                  <p className="text-xs text-gray-500">Résumé des performances individuelles</p>
                </div>
                <input
                  type="checkbox"
                  checked={exportOptions.includeTrends}
                  onChange={(e) => setExportOptions({...exportOptions, includeTrends: e.target.checked})}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
              </div>
            </div>
          </div>

          {exportOptions.format === 'pdf' && (
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
                    <option value="A4">A4 (21 x 29.7 cm)</option>
                    <option value="Letter">Letter (21.6 x 27.9 cm)</option>
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

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">Résumé de l'export</h4>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                  <div className="text-blue-700">Format:</div>
                  <div className="font-medium">{exportOptions.format.toUpperCase()}</div>
                  <div className="text-blue-700">Employés:</div>
                  <div className="font-medium">{staffGroups.length} personnes</div>
                  <div className="text-blue-700">Période:</div>
                  <div className="font-medium">
                    {format(parseISO(from), 'dd/MM/yy', { locale: fr })} - {format(parseISO(to), 'dd/MM/yy', { locale: fr })}
                  </div>
                  <div className="text-blue-700">Données:</div>
                  <div className="font-medium">{data.length} enregistrements</div>
                </div>
              </div>
            </div>
          </div>

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
              onClick={handleExport}
              isLoading={exportLoading}
              leftIcon={<Download className="h-4 w-4" />}
              className="px-6"
            >
              {exportLoading ? 'Génération...' : 'Exporter'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Guide d'utilisation */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-100 rounded-2xl p-5 border border-indigo-200">
        <div className="flex items-start gap-4">
          <Target className="h-6 w-6 text-indigo-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-indigo-900 mb-2">Comment analyser les performances</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-indigo-800">
              <div className="bg-white/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <strong>Tendances</strong>
                </div>
                <p>Suivez l'évolution quotidienne des performances de chaque employé</p>
              </div>
              <div className="bg-white/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <strong>Comparaison</strong>
                </div>
                <p>Analysez les performances relatives entre différents employés</p>
              </div>
              <div className="bg-white/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <strong>Filtres</strong>
                </div>
                <p>Utilisez les filtres pour concentrer l'analyse sur des groupes spécifiques</p>
              </div>
            </div>
            <div className="mt-3 text-xs text-indigo-700">
              <strong>Conseil :</strong> Exportez les données pour des analyses approfondies ou pour les partager avec l'équipe de direction
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}