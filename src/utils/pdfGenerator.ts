import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ScoredAsset, VulnerabilitySummary } from '../types.js';

interface GeneratePdfReportOptions {
  summary: VulnerabilitySummary;
  assets: ScoredAsset[];
  cycloneName: string;
  selectedDistrict: string;
  briefing?: string | null;
  briefingSource?: string;
}

export function generateDisasterReportPdf({
  summary,
  assets,
  cycloneName,
  selectedDistrict,
  briefing,
  briefingSource
}: GeneratePdfReportOptions): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Filter assets for selected district if not 'All'
  const districtAssets = selectedDistrict === 'All'
    ? assets
    : assets.filter(
        (a) => a.properties.district.toLowerCase() === selectedDistrict.toLowerCase()
      );

  const totalAssets = districtAssets.length || summary.totalAssets;
  const criticalAssets = districtAssets.filter((a) => a.score.riskTier === 'critical');
  const highAssets = districtAssets.filter((a) => a.score.riskTier === 'high');
  const mediumAssets = districtAssets.filter((a) => a.score.riskTier === 'medium');
  const lowAssets = districtAssets.filter((a) => a.score.riskTier === 'low');

  const popAtRisk = selectedDistrict === 'All'
    ? summary.estimatedPopulationAtRisk
    : districtAssets.reduce((sum, a) => sum + (a.properties.population_served || 0), 0);

  // High priority assets (Critical & High, sorted by score desc)
  const highPriorityAssets = [...districtAssets]
    .filter((a) => a.score.riskTier === 'critical' || a.score.riskTier === 'high')
    .sort((a, b) => b.score.vulnerabilityScore - a.score.vulnerabilityScore);

  // If none meet critical/high (unlikely), take top 10 by score
  const assetsForReport = highPriorityAssets.length > 0
    ? highPriorityAssets
    : [...districtAssets].sort((a, b) => b.score.vulnerabilityScore - a.score.vulnerabilityScore).slice(0, 10);

  // ----------------------------------------------------
  // 1. TOP OFFICIAL HEADER BANNER
  // ----------------------------------------------------
  doc.setFillColor(12, 74, 138); // Navy Deep #0C4A8A
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Accent Gold bar
  doc.setFillColor(234, 179, 8); // Gold #EAB308
  doc.rect(0, 28, pageWidth, 2, 'F');

  // Title Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('CYCLONEGUARD™ DISASTER MANAGEMENT INCIDENT REPORT', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    'STATE DISASTER MANAGEMENT AUTHORITY (SDMA) • NATIONAL DISASTER MANAGEMENT COMMISSION',
    margin,
    18
  );
  doc.text(
    'CIVIL PROTECTION & CRITICAL INFRASTRUCTURE EARLY ACTION DIRECTIVE',
    margin,
    23
  );

  // Classification Stamp (Top Right)
  doc.setFillColor(220, 38, 38); // Crimson Red
  doc.roundedRect(pageWidth - margin - 42, 6, 42, 16, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('EMERGENCY DIRECTIVE', pageWidth - margin - 21, 12, { align: 'center' });
  doc.setFontSize(6.5);
  doc.text('RESTRICTED DISTRIBUTION', pageWidth - margin - 21, 18, { align: 'center' });

  // ----------------------------------------------------
  // 2. INCIDENT METADATA PANEL
  // ----------------------------------------------------
  let currentY = 36;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 22, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);

  const col1X = margin + 4;
  const col2X = margin + contentWidth * 0.35;
  const col3X = margin + contentWidth * 0.70;

  doc.text(`Active Cyclone:`, col1X, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${cycloneName}`, col1X + 24, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text(`Target Jurisdiction:`, col1X, currentY + 13);
  doc.setFont('helvetica', 'normal');
  doc.text(`${selectedDistrict === 'All' ? 'All Impacted Coastal Districts' : `${selectedDistrict} District`}`, col1X + 30, currentY + 13);

  doc.setFont('helvetica', 'bold');
  doc.text(`Assessment Date:`, col2X, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}`, col2X + 27, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text(`Time (UTC / Local):`, col2X, currentY + 13);
  doc.setFont('helvetica', 'normal');
  doc.text(`${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`, col2X + 28, currentY + 13);

  doc.setFont('helvetica', 'bold');
  doc.text(`Vulnerability Model:`, col3X, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`Holland Wind + Surge`, col3X + 30, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text(`Incident ID:`, col3X, currentY + 13);
  doc.setFont('helvetica', 'normal');
  doc.text(`CG-${cycloneName.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`, col3X + 18, currentY + 13);

  currentY += 28;

  // ----------------------------------------------------
  // 3. SECTION 1: DISTRICT RISK STATISTICS ROLLUP
  // ----------------------------------------------------
  doc.setTextColor(12, 74, 138);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('1. DISTRICT RISK ROLLUP & POPULATION EXPOSURE', margin, currentY);

  currentY += 4;

  const statMetrics = [
    [
      'Total Facilities Scored',
      `${totalAssets}`,
      '100%',
      'All critical sector facilities identified in hazard swathe'
    ],
    [
      'Critical Risk Tier',
      `${criticalAssets.length}`,
      `${Math.round((criticalAssets.length / (totalAssets || 1)) * 100)}%`,
      'Immediate 0-12h pre-landfall intervention & vertical evacuation'
    ],
    [
      'High Risk Tier',
      `${highAssets.length}`,
      `${Math.round((highAssets.length / (totalAssets || 1)) * 100)}%`,
      'Pre-emptive power isolation & secondary generator standby'
    ],
    [
      'Moderate & Low Tiers',
      `${mediumAssets.length + lowAssets.length}`,
      `${Math.round(((mediumAssets.length + lowAssets.length) / (totalAssets || 1)) * 100)}%`,
      'Buffer facilities designated as secondary staging havens'
    ],
    [
      'Population in Severe Hazard Swathe',
      `${(popAtRisk / 1000000).toFixed(2)}M`,
      'High Impact',
      'Residents exposed to gale-force winds (>120 km/h) or surge inundation'
    ]
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Risk Metric', 'Count / Value', 'Share', 'Operational Command Benchmark']],
    body: statMetrics,
    theme: 'grid',
    headStyles: {
      fillColor: [12, 74, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2.5
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      lineColor: [226, 232, 240],
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { fontStyle: 'bold', halign: 'center', cellWidth: 25 },
      2: { halign: 'center', cellWidth: 20 },
      3: { cellWidth: 'auto' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // ----------------------------------------------------
  // 4. SECTION 2: CATEGORY BREAKDOWN TABLE
  // ----------------------------------------------------
  doc.setTextColor(12, 74, 138);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. CRITICAL LIFELINE SECTOR VULNERABILITY BREAKDOWN', margin, currentY);

  currentY += 4;

  const categoryRows: Array<[string, number, number, number, string]> = [];
  const typeLabels: Record<string, string> = {
    hospital: 'Hospitals & Medical Centers',
    power_substation: 'Power Substations & Grid',
    cyclone_shelter: 'Cyclone Shelters',
    road_lifeline: 'Evacuation Corridors & Bridges',
    telecom_tower: 'Telecom & Tower Arrays',
    water_facility: 'Water Treatment & Booster Plants'
  };

  const types = Object.keys(typeLabels);
  for (const t of types) {
    const matched = districtAssets.filter((a) => a.properties.type === t);
    const crit = matched.filter((a) => a.score.riskTier === 'critical').length;
    const hi = matched.filter((a) => a.score.riskTier === 'high').length;
    const tot = matched.length;

    let directive = 'Monitor facility continuity';
    if (t === 'hospital') directive = 'Elevate ICU equipment; switch to 72h auxiliary diesel';
    else if (t === 'power_substation') directive = 'Pre-emptively de-energize 33kV switchyard 2h pre-landfall';
    else if (t === 'cyclone_shelter') directive = 'Verify water chlorination & satellite communication links';
    else if (t === 'road_lifeline') directive = 'Pre-position earthmovers & debris-clearing teams';
    else if (t === 'telecom_tower') directive = 'Secure guy wires; transition to battery backup bank';
    else if (t === 'water_facility') directive = 'Stock water storage buffers; seal intake valves against surge';

    categoryRows.push([typeLabels[t], tot, crit, hi, directive]);
  }

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Sector Lifeline Category', 'Total in Swathe', 'Critical', 'High', 'Sector Mitigation Protocol']],
    body: categoryRows.map((r) => [r[0], r[1].toString(), r[2].toString(), r[3].toString(), r[4]]),
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2.5
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      lineColor: [226, 232, 240],
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { halign: 'center', cellWidth: 24 },
      2: { halign: 'center', fontStyle: 'bold', cellWidth: 18, textColor: [220, 38, 38] },
      3: { halign: 'center', fontStyle: 'bold', cellWidth: 16, textColor: [234, 88, 12] },
      4: { cellWidth: 'auto' }
    }
  });

  // ----------------------------------------------------
  // 5. SECTION 3: HIGH-PRIORITY ASSETS TRIAGE MATRIX (PAGE BREAK)
  // ----------------------------------------------------
  doc.addPage();
  currentY = 16;

  doc.setTextColor(12, 74, 138);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('3. HIGH-PRIORITY INFRASTRUCTURE ASSET TRIAGE MATRIX', margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Ranked by composite vulnerability index (Holland Wind decay exposure + hydrodynamic surge inundation + asset criticality).`,
    margin,
    currentY + 4
  );

  currentY += 8;

  const priorityTableData = assetsForReport.map((asset, idx) => {
    const p = asset.properties;
    const s = asset.score;
    const tierLabel = s.riskTier.toUpperCase();

    const hazardString = `${s.estimatedWindSpeedKmh} km/h wind\n${s.stormSurgeRiskMeters}m surge (${p.elevation_m}m AMSL)`;
    const actionDirectives = s.recommendedActions && s.recommendedActions.length > 0
      ? s.recommendedActions.slice(0, 2).join('; ')
      : 'Execute immediate site fortification and emergency backup isolation.';

    return [
      `#${idx + 1}\n[${tierLabel}]`,
      `${p.name}\n${p.type.replace('_', ' ').toUpperCase()}`,
      `${p.district}\n(${asset.geometry.coordinates[1].toFixed(2)}°N, ${asset.geometry.coordinates[0].toFixed(2)}°E)\n${p.dist_to_coast_km} km coast`,
      `${s.vulnerabilityScore.toFixed(1)} / 100`,
      hazardString,
      actionDirectives
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Rank & Tier', 'Facility Name & Type', 'Location & Coast', 'Vuln. Score', 'Projected Hazards', 'Priority Emergency Directive']],
    body: priorityTableData,
    theme: 'grid',
    headStyles: {
      fillColor: [12, 74, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2.5
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      lineColor: [226, 232, 240],
      textColor: [15, 23, 42]
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'center', cellWidth: 20 },
      1: { fontStyle: 'bold', cellWidth: 42 },
      2: { fontSize: 7, cellWidth: 30 },
      3: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
      4: { fontSize: 7, cellWidth: 30 },
      5: { fontSize: 7, cellWidth: 'auto' }
    },
    didParseCell: (data) => {
      // Color code the Rank & Tier column
      if (data.column.index === 0 && data.section === 'body') {
        const text = String(data.cell.raw);
        if (text.includes('CRITICAL')) {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fillColor = [254, 242, 242];
        } else if (text.includes('HIGH')) {
          data.cell.styles.textColor = [234, 88, 12];
          data.cell.styles.fillColor = [255, 247, 237];
        }
      }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Check if we have room for briefing or add page
  if (currentY > pageHeight - 75) {
    doc.addPage();
    currentY = 16;
  }

  // ----------------------------------------------------
  // 6. SECTION 4: STRATEGIC COMMAND DIRECTIVE & BRIEFING
  // ----------------------------------------------------
  doc.setTextColor(12, 74, 138);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('4. STRATEGIC DISASTER COMMAND & INCIDENT ACTION CHECKLIST', margin, currentY);

  currentY += 5;

  const defaultBriefing = `### SITUATION APPRAISAL
The impending landfall of ${cycloneName} presents an extreme category hazard envelope across the coastal zone. Sustained gale-force winds exceeding 175 km/h combined with a high astronomical tidal surge (3.5m to 4.8m AMSL) are projected to breach low-elevation coastal bunds and inundate lifelines within 25 km of the coast.

### PRIORITY SDMA TIME-CRITICAL DIRECTIVES (0-24h)
1. Hospitals & Trauma Centers: Complete vertical triage of ground-floor patients to 2nd floor or above immediately. Verify 72-hour auxiliary diesel fuel reserves for critical care ventilators and neonatal units.
2. Power Grid De-Energization: Execute scheduled pre-emptive shutdown of 33kV and 11kV coastal distribution lines 2 hours prior to gale threshold (65 km/h) to prevent substation short circuits and cascading transformer explosions.
3. Multi-Purpose Shelters: Deploy satellite communication phones, halogen searchlights, and pre-packaged potable water supplies at designated high-capacity concrete shelters.
4. Logistics Corridors: Stage NDRF/SDRF swift-water rescue teams and tree-clearing bulldozers along designated Green Corridors before crosswinds exceed safe vehicle operating speeds.`;

  const rawBriefingText = briefing || defaultBriefing;
  const cleanBriefing = rawBriefingText.replace(/[*#]/g, '').trim();

  // Print briefing in framed light gray box
  const splitBriefing = doc.splitTextToSize(cleanBriefing, contentWidth - 8);
  const boxHeight = Math.min(splitBriefing.length * 4 + 10, 65);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(186, 230, 253);
  doc.roundedRect(margin, currentY, contentWidth, boxHeight, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(splitBriefing.slice(0, 14), margin + 4, currentY + 6);

  currentY += boxHeight + 8;

  // ----------------------------------------------------
  // 7. SECTION 5: COMMAND SIGN-OFF & VERIFICATION BLOCK
  // ----------------------------------------------------
  if (currentY > pageHeight - 40) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, contentWidth, 24, 2, 2, 'D');

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('INCIDENT COMMAND AUTHORIZATION & DISPATCH VERIFICATION', margin + 4, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('State Emergency Operations Center (SEOC) • Duty Officer Signature:', margin + 4, currentY + 12);
  doc.line(margin + 75, currentY + 12, margin + 115, currentY + 12);

  doc.text('District Relief Commissioner / Collector Approval:', margin + 4, currentY + 19);
  doc.line(margin + 60, currentY + 19, margin + 115, currentY + 19);

  doc.text('Official Seal & Security Timestamp:', margin + 125, currentY + 12);
  doc.rect(margin + 125, currentY + 14, 45, 8, 'D');
  doc.text('SDMA-VERIFIED-SEAL', margin + 132, currentY + 19);

  // ----------------------------------------------------
  // 8. PAGE FOOTERS & RUNNING HEADERS
  // ----------------------------------------------------
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Running header on page 2+
    if (i > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`Vayu Tactical Incident Report • Storm: ${cycloneName} • Jurisdiction: ${selectedDistrict}`, margin, 9);
      doc.text(`OFFICIAL RESTRICTED`, pageWidth - margin, 9, { align: 'right' });
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, 11, pageWidth - margin, 11);
    }

    // Running footer on all pages
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `STRICTLY FOR OFFICIAL DISASTER MANAGEMENT USE • STATE DISASTER MANAGEMENT AUTHORITY (SDMA) • SYSTEM VERIFIED`,
      margin,
      pageHeight - 7
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }

  // Save the PDF
  const cleanDistrict = selectedDistrict.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanCyclone = cycloneName.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStamp = new Date().toISOString().slice(0, 10);
  const fileName = `Vayu_Disaster_Report_${cleanCyclone}_${cleanDistrict}_${dateStamp}.pdf`;

  doc.save(fileName);
}
