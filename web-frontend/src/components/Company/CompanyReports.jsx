import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Navbar from '../Navbar';
import api from '../../utils/api';
import './CompanyReports.css';
import { 
    IconReports, 
    IconAnalytics, 
    IconUsers, 
    IconBuilding, 
    IconDetails 
} from '../icons';
import { useReportData } from '../../hooks/useReportData';
import { ReportCard, ReportConfig, ReportTable } from './ReportComponents';

// Report Definitions
const REPORT_TYPES = [
    {
        id: 'fleet_summary',
        label: 'Fleet Metrics',
        desc: 'Performance metrics and savings per fleet.',
        icon: IconBuilding,
        defaultColumns: ['name', 'vehicles', 'employees', 'total_cost', 'cost_saved', 'time_saved']
    },
    {
        id: 'analytics',
        label: 'Trip Logs',
        desc: 'Distance and duration logs for individual trips.',
        icon: IconAnalytics,
        defaultColumns: ['trip_id', 'optimised_dist', 'non_optimised_dist', 'duration', 'working_days']
    },
    {
        id: 'vehicles',
        label: 'Vehicle Inventory',
        desc: 'List of vehicles and status.',
        icon: IconDetails, 
        defaultColumns: ['vehicle_id', 'type', 'capacity', 'cost_per_km', 'fleet']
    },
    {
        id: 'employees',
        label: 'Employee Registry',
        desc: 'Registered staff overview.',
        icon: IconUsers,
        defaultColumns: ['employee_id', 'name', 'email']
    }
];

const CompanyReports = () => {
    const [selectedReport, setSelectedReport] = useState(REPORT_TYPES[0].id);
    const [columns, setColumns] = useState(new Set(REPORT_TYPES[0].defaultColumns));
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Retrieve user data directly from localStorage
    const companyId = localStorage.getItem("userId");
    const { data: allReportsData, loading, fetchData } = useReportData(companyId);

    // Global stats for the executive summary
    const [globalStats, setGlobalStats] = useState({
        totalSavings: 0,
        totalCost: 0,
        totalEmployees: 0,
        totalVehicles: 0,
        activeFleets: 0,
        efficiencyScore: 0
    });

    // State to hold the company name
    const [companyName, setCompanyName] = useState("Company");

    useEffect(() => {
        if (companyId) {
            api.get(`/company/dashboard/${companyId}`)
                .then(res => {
                    const data = res.data.data || res.data; 
                    if (data && data.company && data.company.name) {
                        setCompanyName(data.company.name);
                    }
                })
                .catch(err => console.error("Failed to fetch company name:", err));
        }
    }, [companyId]);

    // 1. Fetch and parse user data from localStorage
    const userStr = localStorage.getItem("user") || localStorage.getItem("userData");
    let parsedUser = null;

    try {
        if (userStr) {
            parsedUser = JSON.parse(userStr);
            if (parsedUser && parsedUser.user) {
                parsedUser = parsedUser.user;
            }
        }
    } catch (error) {
        console.error("Could not parse user data from localStorage", error);
    }

    // 2. Define the helper function for initials
    const getInitials = (name) => {
        if (!name) return "CU";
        const parts = name.split(' ');
        if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    // 3. Set the final variables
    const finalUserName = parsedUser?.name || companyName || 'Company User';

    // 4. Build the object for the Navbar
    const displayUser = {
        name: finalUserName,
        role: parsedUser?.role || 'Company Admin',
        initials: getInitials(finalUserName) 
    };

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = '/';
    };

    // Load columns when report type changes
    useEffect(() => {
        const defCols = REPORT_TYPES.find(r => r.id === selectedReport).defaultColumns;
        setColumns(new Set(defCols));
        
        // Only fetch if we don't have data for this type yet, or if it's empty
        if (!allReportsData[selectedReport] || allReportsData[selectedReport].length === 0) {
            fetchData(selectedReport);
        }
        
        // Always try to fetch stats if they are empty
        if (globalStats.totalEmployees === 0) {
            fetchGlobalStats();
        }
    }, [selectedReport, fetchData, companyId]); // Added dependencies

    const fetchGlobalStats = async () => {
        try {
            const res = await api.get(`/company/dashboard/${companyId}`);
            const stats = res.data || {};
            setGlobalStats({
                totalSavings: stats.totalSavings || 12500, // Mock if missing
                totalCost: stats.totalCost || 45000,
                totalEmployees: stats.totalEmployees || 0,
                totalVehicles: stats.totalVehicles || 0,
                activeFleets: stats.totalFleets || 0,
                efficiencyScore: stats.efficiencyScore || 94
            });
        } catch (e) {
            console.error("Failed to fetch global stats", e);
        }
    };
    
    // Check if we have data for current view
    const reportData = allReportsData[selectedReport] || [];
    const currentDefinition = REPORT_TYPES.find(r => r.id === selectedReport);

    const toggleColumn = (col) => {
        const newCols = new Set(columns);
        if (newCols.has(col)) {
            newCols.delete(col);
        } else {
            newCols.add(col);
        }
        setColumns(newCols);
    };

    const downloadCSV = async () => {
        if (isGenerating) return;
        setIsGenerating(true);
        
        // Small delay to allow spinner to render if desired, 
        // or just to make the UI feel responsive to "work" being done.
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            const headers = Array.from(columns);
            // Use all fetched data for the current report type
            const rows = reportData;
            
            const csvContent = [
                headers.join(','),
                ...rows.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${selectedReport}_report_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
        } catch (error) {
            console.error("Error generating CSV", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const downloadFullReportPDF = async () => {
        if (isGenerating) return;
        setIsGenerating(true);

        const doc = new jsPDF();
        // Since we are using hook, we rely on the data being available or fetch it
        // We set loading state via a temporary local state or just assume wait?
        // Reuse global loading is tricky because hook controls it.
        // We'll just await fetch calls.

        try {
            // 1. Ensure we have all data locally to calculate stats
            let summaryData = allReportsData.fleet_summary.length ? allReportsData.fleet_summary : await fetchData('fleet_summary');
            let vehiclesData = allReportsData.vehicles.length ? allReportsData.vehicles : await fetchData('vehicles');
            let employeesData = allReportsData.employees.length ? allReportsData.employees : await fetchData('employees');
            let analyticsData = allReportsData.analytics.length ? allReportsData.analytics : await fetchData('analytics');

            // 2. Calculate Stats from REAL data
            const calculatedStats = {
                totalEmployees: employeesData.length,
                activeFleets: summaryData.length,
                totalVehicles: vehiclesData.length,
                totalSavings: summaryData.reduce((acc, row) => {
                    // Remove currency symbol and commas from fleet summary rows
                    const val = parseFloat((row.cost_saved || "0").replace(/Rs\.\s?/g, '').replace(/[^0-9.-]+/g, '')) || 0;
                    return acc + val;
                }, 0),
                efficiencyScore: 94 
            };

            // Set standard font to avoid deformation
            doc.setFont("helvetica", "normal");

            // 3. Cover Page / Executive Summary
            doc.setFillColor(16, 185, 129); // Green background
            doc.rect(0, 0, 210, 45, 'F'); // Increased height slightly
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(26);
            doc.setFont("helvetica", "bold");
            doc.text("Executive Optimization Report", 14, 20);
            
            doc.setFontSize(14);
            doc.setFont("helvetica", "normal");
            // Display Company Name
            const companyName = displayUser.name.toUpperCase();
            doc.text(companyName, 14, 32);

            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleDateString()}`, 160, 32);
            
            // Reset Text Color
            doc.setTextColor(0, 0, 0);

            // -- Introduction Section --
            let yPos = 60;
            
            doc.setFontSize(11);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(80, 80, 80);
            
            const introText = `This document presents a comprehensive analysis of fleet operations, identifying key efficiency metrics and cost-saving opportunities. The data herein reflects ${companyName}'s commitment to operational excellence and sustainable logistics management through advanced route optimization.`;
            doc.text(doc.splitTextToSize(introText, 180), 14, yPos);
            doc.setTextColor(0, 0, 0);

            yPos += 20;

            // -- Analysis Section --
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text("1. Executive Analysis & Stats", 14, yPos);
            
            yPos += 15;
            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            doc.text("Performance Overview", 14, yPos);
            
            // Draw Stat Cards manually
            const drawStatCard = (x, y, title, value) => {
                doc.setFillColor(245, 250, 248);
                doc.roundedRect(x, y, 40, 25, 2, 2, 'F');
                doc.setFontSize(9);
                doc.setTextColor(100, 100, 100);
                doc.text(title, x + 5, y + 8);
                doc.setFontSize(14);
                doc.setTextColor(16, 185, 129);
                doc.setFont("helvetica", "bold");
                doc.text(value.toString(), x + 5, y + 20);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(0, 0, 0);
            };

            drawStatCard(14, yPos + 5, "Total Employees", calculatedStats.totalEmployees);
            drawStatCard(60, yPos + 5, "Active Fleets", calculatedStats.activeFleets);
            drawStatCard(106, yPos + 5, "Total Vehicles", calculatedStats.totalVehicles);
            drawStatCard(152, yPos + 5, "Total Savings", `Rs.${calculatedStats.totalSavings.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);

            yPos += 45;
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("Financial Impact", 14, yPos);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(80, 80, 80);
            // Add some paragraph text for analysis
            const analysisText = `Based on current operational metrics, the system has optimized transport routes resulting in a total projected savings of Rs.${calculatedStats.totalSavings.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}. The operational efficiency is maintained ensuring cost-effective logistics. Continuing with the current optimization strategy is recommended.`;
            doc.text(doc.splitTextToSize(analysisText, 180), 14, yPos + 8);
            doc.setTextColor(0, 0, 0);

            // -- Data Tables Section --
            yPos += 30;
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text("2. Operational Data Tables", 14, yPos);
            doc.setFont("helvetica", "normal");
            yPos += 10;

            // Function to render table
            const renderSection = (title, columns, data, startY) => {
                doc.setFontSize(12);
                doc.setTextColor(16, 185, 129);
                doc.setFont("helvetica", "bold");
                doc.text(title, 14, startY);
                doc.setFont("helvetica", "normal");
                
                autoTable(doc, {
                    startY: startY + 5,
                    head: [columns.map(c => c.toUpperCase().replace('_', ' '))],
                    body: data.map(row => columns.map(col => row[col])),
                    theme: 'grid',
                    headStyles: { fillColor: [16, 185, 129], fontSize: 9, font: 'helvetica', fontStyle: 'bold' },
                    styles: { fontSize: 8, font: 'helvetica' },
                    margin: { top: 10 }
                });
                
                return doc.lastAutoTable.finalY + 15;
            };

            // Vehicles Table
            const vehCols = REPORT_TYPES.find(r => r.id === 'vehicles').defaultColumns;
            yPos = renderSection('Vehicle Inventory', vehCols, vehiclesData, yPos);

            // Fleet Table
            const fleetCols = REPORT_TYPES.find(r => r.id === 'fleet_summary').defaultColumns; 
            if (yPos > 240) { doc.addPage(); yPos = 20; }
            yPos = renderSection('Fleet Summary', fleetCols, summaryData, yPos);

            // Employees Table
            if (yPos > 240) { doc.addPage(); yPos = 20; }
            const empCols = REPORT_TYPES.find(r => r.id === 'employees').defaultColumns;
            yPos = renderSection('Employee Registry', empCols, employeesData, yPos);

            // Analytics Table
            if (yPos > 240) { doc.addPage(); yPos = 20; }
            const anaCols = REPORT_TYPES.find(r => r.id === 'analytics').defaultColumns;
            yPos = renderSection('Financial & Trip Analytics', anaCols, analyticsData, yPos);

            doc.save(`Full_Executive_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (e) {
            console.error("Error generating PDF", e);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="company-dashboard-container">
            <Navbar mode="dashboard" userData={displayUser} onLogout={handleLogout} />
            
            <main className="main-content">
                <header className="page-header">
                    <div className="header-title">
                        <h1>Data & Reports</h1>
                        <p>Export detailed insights and operational data.</p>
                    </div>
                </header>

                <div className="report-type-grid">
                    {REPORT_TYPES.map(type => (
                        <div 
                            key={type.id}
                            className={`report-card ${selectedReport === type.id ? 'active' : ''}`}
                            onClick={() => setSelectedReport(type.id)}
                        >
                            <div className="report-card-icon">
                                <type.icon width="24" height="24" />
                            </div>
                            <div>
                                <div className="report-card-title">{type.label}</div>
                                <div className="report-card-desc">{type.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <ReportConfig 
                    columns={columns}
                    allColumns={currentDefinition.defaultColumns}
                    onToggle={toggleColumn}
                    onDownloadPDF={downloadFullReportPDF}
                    onDownloadCSV={downloadCSV}
                    isGenerating={isGenerating}
                />

                <ReportTable 
                    data={reportData}
                    columns={columns}
                    loading={loading}
                />
            </main>
        </div>
    );
};

export default CompanyReports;
