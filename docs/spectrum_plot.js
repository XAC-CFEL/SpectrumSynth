// Interactive spectrum plotting JavaScript with caching
const CACHE_KEY = 'spectrumSynthSettings';

// Wong colorblind-friendly color palette (8 colors)
// Reference: https://www.nature.com/articles/nmeth.1618
const WONG_PALETTE = [
    { fill: '#0072B2', line: '#005280', name: 'Blue' },        // Blue
    { fill: '#E69F00', line: '#B37A00', name: 'Orange' },      // Orange
    { fill: '#009E73', line: '#006B4D', name: 'Green' },       // Bluish green
    { fill: '#CC79A7', line: '#995C7D', name: 'Pink' },        // Reddish purple
    { fill: '#F0E442', line: '#B8AD30', name: 'Yellow' },      // Yellow
    { fill: '#56B4E9', line: '#3D8DB8', name: 'Sky Blue' },    // Sky blue
    { fill: '#D55E00', line: '#A04700', name: 'Vermillion' },  // Vermillion
    { fill: '#000000', line: '#333333', name: 'Black' }        // Black
];

// Element colors using Wong palette
const ELEMENT_COLORS = {
    neon: WONG_PALETTE[0],      // Blue
    argon: WONG_PALETTE[1],     // Orange
    krypton: WONG_PALETTE[2],   // Green
    xenon: WONG_PALETTE[3],     // Pink
    helium: WONG_PALETTE[4],    // Yellow
    radon: WONG_PALETTE[5]      // Sky blue
};

// Energy colors using Wong palette (cycling through all 8 colors)
const ENERGY_COLORS = WONG_PALETTE;

class SpectrumPlotter {
    constructor() {
        // Default values
        this.defaults = {
            elements: ['neon'],
            photonEnergies: [1486.6],
            ret: 0,
            logScale: false, // Default to linear scale
            showAnnotations: true,
            showGaussians: false,
            gaussianWidth: 2.0
        };
        
        // Load from cache or use defaults
        this.loadFromCache();
        
        this.init();
    }
    
    loadFromCache() {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const settings = JSON.parse(cached);
                // Handle migration from single element to array
                if (settings.element && !settings.elements) {
                    this.selectedElements = [settings.element];
                } else {
                    this.selectedElements = settings.elements || [...this.defaults.elements];
                }
                // Handle migration from single photon energy to array
                if (settings.photonEnergy && !settings.photonEnergies) {
                    this.selectedPhotonEnergies = [settings.photonEnergy];
                } else {
                    this.selectedPhotonEnergies = settings.photonEnergies || [...this.defaults.photonEnergies];
                }
                this.currentRet = settings.ret || this.defaults.ret;
                this.logScale = settings.logScale !== undefined ? settings.logScale : this.defaults.logScale;
                this.showAnnotations = settings.showAnnotations !== undefined ? settings.showAnnotations : this.defaults.showAnnotations;
                this.showGaussians = settings.showGaussians !== undefined ? settings.showGaussians : this.defaults.showGaussians;
                this.gaussianWidth = settings.gaussianWidth !== undefined ? settings.gaussianWidth : this.defaults.gaussianWidth;
                console.log('Loaded settings from cache:', settings);
            } else {
                this.useDefaults();
            }
        } catch (e) {
            console.warn('Failed to load cache:', e);
            this.useDefaults();
        }
    }
    
    useDefaults() {
        this.selectedElements = [...this.defaults.elements];
        this.selectedPhotonEnergies = [...this.defaults.photonEnergies];
        this.currentRet = this.defaults.ret;
        this.logScale = this.defaults.logScale;
        this.showAnnotations = this.defaults.showAnnotations;
        this.showGaussians = this.defaults.showGaussians;
        this.gaussianWidth = this.defaults.gaussianWidth;
    }
    
    saveToCache() {
        try {
            const settings = {
                elements: this.selectedElements,
                photonEnergies: this.selectedPhotonEnergies,
                ret: this.currentRet,
                logScale: this.logScale,
                showAnnotations: this.showAnnotations,
                showGaussians: this.showGaussians,
                gaussianWidth: this.gaussianWidth
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(settings));
        } catch (e) {
            console.warn('Failed to save cache:', e);
        }
    }
    
    clearCache() {
        try {
            localStorage.removeItem(CACHE_KEY);
            this.useDefaults();
            this.applySettingsToUI();
            this.updateBindingEnergies();
            this.plotSpectrum();
            alert('Settings cleared! Defaults restored.');
        } catch (e) {
            console.warn('Failed to clear cache:', e);
        }
    }
    
    applySettingsToUI() {
        // Apply cached values to UI elements
        document.getElementById('gaussian-width-input').value = this.gaussianWidth;
        
        // Update selected elements display
        this.updateSelectedElementsDisplay();
        this.updateAddElementDropdown();
        
        // Update selected photon energies display
        this.updateSelectedEnergiesDisplay();
        
        // Update scale toggle buttons
        this.updateScaleButtons();
        
        // Update annotations toggle buttons
        this.updateAnnotationsButtons();
        
        // Update gaussians toggle buttons
        this.updateGaussiansButtons();
    }
    
    updateSelectedElementsDisplay() {
        const container = document.getElementById('selected-elements');
        if (!container) return;
        
        if (this.selectedElements.length === 0) {
            container.innerHTML = '<span class="no-elements">No elements selected</span>';
            return;
        }
        
        container.innerHTML = this.selectedElements.map(elementKey => {
            const element = ELEMENTS_DATA[elementKey];
            const color = ELEMENT_COLORS[elementKey]?.fill || '#667eea';
            return `<span class="element-tag" style="background-color: ${color}" data-element="${elementKey}">
                ${element.name}
                <button class="remove-element" data-element="${elementKey}">&times;</button>
            </span>`;
        }).join('');
        
        // Add remove handlers
        container.querySelectorAll('.remove-element').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeElement(e.target.dataset.element);
            });
        });
    }
    
    updateAddElementDropdown() {
        const select = document.getElementById('add-element-select');
        if (!select) return;
        
        // Get available elements (not already selected)
        const availableElements = Object.keys(ELEMENTS_DATA).filter(
            key => !this.selectedElements.includes(key)
        );
        
        select.innerHTML = '<option value="">Select element...</option>' +
            availableElements.map(key => {
                const element = ELEMENTS_DATA[key];
                return `<option value="${key}">${element.name} (${element.symbol || key})</option>`;
            }).join('');
        
        // Disable if no more elements available
        select.disabled = availableElements.length === 0;
    }
    
    addElement(elementKey) {
        if (elementKey && !this.selectedElements.includes(elementKey)) {
            this.selectedElements.push(elementKey);
            this.saveToCache();
            this.updateSelectedElementsDisplay();
            this.updateAddElementDropdown();
            this.updateBindingEnergies();
            this.plotSpectrum();
        }
    }
    
    removeElement(elementKey) {
        const index = this.selectedElements.indexOf(elementKey);
        if (index > -1) {
            this.selectedElements.splice(index, 1);
            this.saveToCache();
            this.updateSelectedElementsDisplay();
            this.updateAddElementDropdown();
            this.updateBindingEnergies();
            this.plotSpectrum();
        }
    }
    
    updateSelectedEnergiesDisplay() {
        const container = document.getElementById('selected-energies');
        if (!container) return;
        
        if (this.selectedPhotonEnergies.length === 0) {
            container.innerHTML = '<span class="no-energies">No energies selected</span>';
            return;
        }
        
        container.innerHTML = this.selectedPhotonEnergies.map((energy, index) => {
            const color = ENERGY_COLORS[index % ENERGY_COLORS.length]?.fill || '#667eea';
            return `<span class="energy-tag" style="background-color: ${color}" data-energy="${energy}">
                ${energy} eV
                <button class="remove-energy" data-energy="${energy}">&times;</button>
            </span>`;
        }).join('');
        
        // Add remove handlers
        container.querySelectorAll('.remove-energy').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removePhotonEnergy(parseFloat(e.target.dataset.energy));
            });
        });
    }
    
    addPhotonEnergy(energy) {
        const energyNum = parseFloat(energy);
        if (!isNaN(energyNum) && energyNum > 0 && !this.selectedPhotonEnergies.includes(energyNum)) {
            this.selectedPhotonEnergies.push(energyNum);
            this.saveToCache();
            this.updateSelectedEnergiesDisplay();
            this.updateBindingEnergies();
            this.plotSpectrum();
        }
    }
    
    removePhotonEnergy(energy) {
        const index = this.selectedPhotonEnergies.indexOf(energy);
        if (index > -1) {
            this.selectedPhotonEnergies.splice(index, 1);
            this.saveToCache();
            this.updateSelectedEnergiesDisplay();
            this.updateBindingEnergies();
            this.plotSpectrum();
        }
    }
    
    updateScaleButtons() {
        const logBtn = document.getElementById('log-scale-btn');
        const linBtn = document.getElementById('lin-scale-btn');
        
        if (this.logScale) {
            logBtn.classList.add('active');
            linBtn.classList.remove('active');
        } else {
            linBtn.classList.add('active');
            logBtn.classList.remove('active');
        }
    }
    
    updateAnnotationsButtons() {
        const onBtn = document.getElementById('annotations-on-btn');
        const offBtn = document.getElementById('annotations-off-btn');
        
        if (this.showAnnotations) {
            onBtn.classList.add('active');
            offBtn.classList.remove('active');
        } else {
            offBtn.classList.add('active');
            onBtn.classList.remove('active');
        }
    }
    
    updateGaussiansButtons() {
        const onBtn = document.getElementById('gaussians-on-btn');
        const offBtn = document.getElementById('gaussians-off-btn');
        const widthGroup = document.getElementById('gaussian-width-group');
        
        if (this.showGaussians) {
            onBtn.classList.add('active');
            offBtn.classList.remove('active');
            widthGroup.style.display = 'block';
        } else {
            offBtn.classList.add('active');
            onBtn.classList.remove('active');
            widthGroup.style.display = 'none';
        }
    }
    
    init() {
        this.applySettingsToUI();
        this.setupControls();
        this.updateBindingEnergies();
        this.plotSpectrum();
    }
    
    setupControls() {
        // Add element selector
        const addElementSelect = document.getElementById('add-element-select');
        if (addElementSelect) {
            addElementSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.addElement(e.target.value);
                    e.target.value = ''; // Reset dropdown
                }
            });
        }
        
        // Add photon energy controls
        const addEnergyInput = document.getElementById('add-energy-input');
        const addEnergyBtn = document.getElementById('add-energy-btn');
        
        if (addEnergyBtn && addEnergyInput) {
            const addEnergyHandler = () => {
                const value = addEnergyInput.value;
                if (value) {
                    this.addPhotonEnergy(value);
                    addEnergyInput.value = ''; // Reset input
                }
            };
            
            addEnergyBtn.addEventListener('click', addEnergyHandler);
            addEnergyInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    addEnergyHandler();
                }
            });
        }
        
        // Work function is fixed at 0 for now (slider removed)
        this.currentRet = 0;
        
        // Log/Lin scale toggle - preserve x-axis range
        document.getElementById('log-scale-btn').addEventListener('click', () => {
            this.logScale = true;
            this.updateScaleButtons();
            this.saveToCache();
            this.updateYAxisOnly();
        });
        
        document.getElementById('lin-scale-btn').addEventListener('click', () => {
            this.logScale = false;
            this.updateScaleButtons();
            this.saveToCache();
            this.updateYAxisOnly();
        });
        
        // Annotations toggle
        document.getElementById('annotations-on-btn').addEventListener('click', () => {
            this.showAnnotations = true;
            this.updateAnnotationsButtons();
            this.saveToCache();
            this.updateAnnotationVisibility();
        });
        
        document.getElementById('annotations-off-btn').addEventListener('click', () => {
            this.showAnnotations = false;
            this.updateAnnotationsButtons();
            this.saveToCache();
            Plotly.relayout('spectrum-plot', { annotations: [] });
        });
        
        // Gaussians toggle
        document.getElementById('gaussians-on-btn').addEventListener('click', () => {
            this.showGaussians = true;
            this.updateGaussiansButtons();
            this.saveToCache();
            // Preserve current axis ranges
            const plotDiv = document.getElementById('spectrum-plot');
            const xaxis = plotDiv.layout?.xaxis;
            const yaxis = plotDiv.layout?.yaxis;
            let xRange = null, yRange = null;
            if (xaxis && xaxis.range) xRange = [...xaxis.range];
            if (yaxis && yaxis.range) yRange = [...yaxis.range];
            this.plotSpectrum(xRange, yRange);
        });
        
        document.getElementById('gaussians-off-btn').addEventListener('click', () => {
            this.showGaussians = false;
            this.updateGaussiansButtons();
            this.saveToCache();
            // Preserve current axis ranges
            const plotDiv = document.getElementById('spectrum-plot');
            const xaxis = plotDiv.layout?.xaxis;
            const yaxis = plotDiv.layout?.yaxis;
            let xRange = null, yRange = null;
            if (xaxis && xaxis.range) xRange = [...xaxis.range];
            if (yaxis && yaxis.range) yRange = [...yaxis.range];
            this.plotSpectrum(xRange, yRange);
        });
        
        // Gaussian width input
        const gaussianWidthInput = document.getElementById('gaussian-width-input');
        gaussianWidthInput.addEventListener('change', () => {
            this.gaussianWidth = parseFloat(gaussianWidthInput.value) || 2.0;
            this.saveToCache();
            if (this.showGaussians) {
                // Get current axis ranges
                const plotDiv = document.getElementById('spectrum-plot');
                const xaxis = plotDiv.layout?.xaxis;
                const yaxis = plotDiv.layout?.yaxis;
                let xRange = null, yRange = null;
                if (xaxis && xaxis.range) xRange = [...xaxis.range];
                if (yaxis && yaxis.range) yRange = [...yaxis.range];
                this.plotSpectrum(xRange, yRange);
            }
        });
        
        // Clear cache button
        document.getElementById('clear-cache-btn').addEventListener('click', () => {
            this.clearCache();
        });
    }
    
    updateBindingEnergies() {
        const bindingList = document.getElementById('binding-list');
        
        if (this.selectedElements.length === 0) {
            bindingList.innerHTML = '<p class="no-elements">No elements selected</p>';
            return;
        }
        
        let html = '';
        
        this.selectedElements.forEach(elementKey => {
            const element = ELEMENTS_DATA[elementKey];
            const color = ELEMENT_COLORS[elementKey]?.fill || '#667eea';
            
            html += `<div class="element-binding-section">
                <h4 style="color: ${color}; border-bottom: 2px solid ${color}; padding-bottom: 5px;">${element.name}</h4>
                <div class="binding-grid">`;
            
            Object.entries(element.binding_energies).forEach(([shell, energy], shellIndex) => {
                // Get beta value from shell data
                const shellData = element.shell_data[Math.min(shellIndex, element.shell_data.length - 1)];
                let beta = 'N/A';
                if (shellData && shellData.beta0 && shellData.beta0.length > 0) {
                    // Use the middle value of beta as representative
                    const midIndex = Math.floor(shellData.beta0.length / 2);
                    beta = shellData.beta0[midIndex].toFixed(2);
                }
                
                html += `<div class="binding-item">
                            <span class="shell">${shell}</span>
                            <span class="energy">${energy} eV</span>
                            <span class="beta">β = ${beta}</span>
                         </div>`;
            });
            
            html += '</div></div>';
        });
        
        bindingList.innerHTML = html;
    }
    
    calculateSpectrum(elementKey, photonEnergy) {
        const element = ELEMENTS_DATA[elementKey];
        const ret = this.currentRet;
        
        const spectrumData = [];
        
        // Calculate kinetic energies for each shell
        Object.entries(element.binding_energies).forEach(([shell, bindingEnergy], shellIndex) => {
            const kineticEnergy = photonEnergy - bindingEnergy - ret;
            
            // Only include positive kinetic energies
            if (kineticEnergy > 0) {
                // Get cross-section data for this shell
                const shellData = element.shell_data[Math.min(shellIndex, element.shell_data.length - 1)];
                
                if (shellData && shellData.photon_energy.length > 0) {
                    // Find nearest photon energy in data
                    let nearestIndex = 0;
                    let minDiff = Math.abs(shellData.photon_energy[0] - kineticEnergy);
                    
                    for (let i = 1; i < shellData.photon_energy.length; i++) {
                        const diff = Math.abs(shellData.photon_energy[i] - kineticEnergy);
                        if (diff < minDiff) {
                            minDiff = diff;
                            nearestIndex = i;
                        }
                    }
                    
                    const crossSection = shellData.cs0[nearestIndex] || 1.0;
                    const beta = shellData.beta0[nearestIndex] || 1.5;
                    
                    spectrumData.push({
                        x: kineticEnergy,
                        y: crossSection,
                        shell: shell,
                        beta: beta,
                        binding_energy: bindingEnergy,
                        element: element.name
                    });
                }
            }
        });
        
        return spectrumData;
    }
    
    plotSpectrum(xRangeOverride = null, yRangeOverride = null) {
        const yAxisType = this.logScale ? 'log' : 'linear';
        
        if (this.selectedElements.length === 0 || this.selectedPhotonEnergies.length === 0) {
            const layout = {
                title: 'XPS Spectrum - Select elements and photon energies',
                xaxis: { 
                    title: 'Kinetic Energy (eV)', 
                    range: [Math.log10(1500), Math.log10(1.0)],  // Reversed: [max, min] in log space
                    type: 'log'
                },
                yaxis: { title: 'Cross Section (Mb)', type: yAxisType },
                height: 500,
                template: 'plotly_white'
            };
            Plotly.newPlot('spectrum-plot', [], layout);
            return;
        }
        
        // Calculate spectrum data for all combinations of elements and energies
        const allSpectrumData = [];
        const traces = [];
        
        // Track visible items for annotations
        this.visibleElements = new Set(this.selectedElements);
        this.visibleEnergies = new Set(this.selectedPhotonEnergies);
        
        // Generate traces for each combination
        this.selectedPhotonEnergies.forEach((photonEnergy, energyIndex) => {
            const energyColors = ENERGY_COLORS[energyIndex % ENERGY_COLORS.length];
            
            this.selectedElements.forEach((elementKey, elemIndex) => {
                const spectrumData = this.calculateSpectrum(elementKey, photonEnergy);
                const element = ELEMENTS_DATA[elementKey];
                
                // Store data with metadata
                spectrumData.forEach(d => allSpectrumData.push({ 
                    ...d, 
                    elementKey,
                    photonEnergy,
                    energyIndex 
                }));
                
                if (spectrumData.length > 0) {
                    // For multiple energies, use energy colors; for single energy, use element colors
                    const colors = this.selectedPhotonEnergies.length > 1 
                        ? energyColors 
                        : (ELEMENT_COLORS[elementKey] || { fill: '#667eea', line: '#764ba2' });
                    
                    const traceName = this.selectedPhotonEnergies.length > 1
                        ? `${element.name} @ ${photonEnergy} eV`
                        : element.name;
                    
                    traces.push({
                        x: spectrumData.map(d => d.x),
                        y: spectrumData.map(d => d.y),
                        type: 'bar',
                        name: traceName,
                        opacity: 0.7,
                        hovertemplate: `<b>${element.name} @ ${photonEnergy} eV - %{customdata.shell}</b><br>` +
                                      'Kinetic Energy: %{x:.1f} eV<br>' +
                                      'Binding Energy: %{customdata.binding_energy:.1f} eV<br>' +
                                      'Cross Section: %{y:.3f} Mb<br>' +
                                      'β: %{customdata.beta:.2f}<br>' +
                                      '<extra></extra>',
                        customdata: spectrumData.map(d => ({
                            shell: d.shell,
                            beta: d.beta,
                            binding_energy: d.binding_energy
                        })),
                        marker: {
                            color: colors.fill,
                            line: { color: colors.line, width: 1 }
                        },
                        // Store metadata for legend click handling
                        meta: { elementKey, photonEnergy, energyIndex }
                    });
                }
            });
        });
        
        // Calculate energy range from all data
        let allBindingEnergies = [];
        this.selectedElements.forEach(elementKey => {
            const element = ELEMENTS_DATA[elementKey];
            allBindingEnergies = allBindingEnergies.concat(Object.values(element.binding_energies));
        });
        
        const minBinding = Math.min(...allBindingEnergies);
        const maxBinding = Math.max(...allBindingEnergies);
        const maxPhotonEnergy = Math.max(...this.selectedPhotonEnergies);
        
        // Set x-axis range: from max photon energy down to 1.0 (for log scale)
        // For reversed log axis, specify range as [max, min]
        let plotMax = maxPhotonEnergy;
        let plotMin = 1.0;  // Minimum for log scale (1 eV)
        let yMin = this.logScale ? 0.0001 : 0;
        let yMax = undefined;
        
        if (xRangeOverride && xRangeOverride.length === 2) {
            // xRangeOverride is in log space [log(max), log(min)]
            // Convert back to linear space
            const val0 = Math.pow(10, xRangeOverride[0]);  // Higher value (left side)
            const val1 = Math.pow(10, xRangeOverride[1]);  // Lower value (right side)
            plotMax = Math.max(val0, val1);
            plotMin = Math.max(1.0, Math.min(val0, val1));
        }
        if (yRangeOverride && yRangeOverride.length === 2) {
            yMin = yRangeOverride[0];
            yMax = yRangeOverride[1];
        }
        
        if (traces.length === 0) {
            const elementNames = this.selectedElements.map(k => ELEMENTS_DATA[k].name).join(', ');
            const energyStr = this.selectedPhotonEnergies.join(', ');
            const layout = {
                title: `${elementNames} XPS Spectrum - No peaks (photon energies: ${energyStr} eV)`,
                xaxis: { 
                    title: 'Kinetic Energy (eV)', 
                    range: [Math.log10(maxPhotonEnergy), Math.log10(1.0)],  // Reversed: [max, min] in log space
                    type: 'log'
                },
                yaxis: { title: 'Cross Section (Mb)', type: yAxisType },
                height: 500,
                template: 'plotly_white'
            };
            
            Plotly.newPlot('spectrum-plot', [], layout);
            return;
        }
        
        const elementNames = this.selectedElements.map(k => ELEMENTS_DATA[k].name).join(', ');
        const energyStr = this.selectedPhotonEnergies.length > 1 
            ? `Multiple energies` 
            : `hν = ${this.selectedPhotonEnergies[0]} eV`;
        
        const layout = {
            title: {
                text: `${elementNames} XPS Spectrum (${energyStr})`,
                font: { size: 16 }
            },
            xaxis: { 
                title: 'Kinetic Energy (eV)',
                range: [Math.log10(plotMax), Math.log10(plotMin)],  // Reversed: [max, min] in log space
                type: 'log'
            },
            yaxis: { 
                title: 'Cross Section (Mb)',
                type: yAxisType,
                min: yMin,
                ...(yMax !== undefined ? { max: yMax } : {})
            },
            height: 500,
            hovermode: 'closest',
            template: 'plotly_white',
            showlegend: true,
            barmode: 'group'
        };
        
        const config = {
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['select2d', 'lasso2d'],
            displaylogo: false
        };
        
        // Add Gaussian curves if enabled
        if (this.showGaussians && allSpectrumData.length > 0) {
            const sigma = this.gaussianWidth / 2.355; // Convert FWHM to sigma
            
            // Fixed 0.1 eV steps from plotMin to plotMax
            const stepSize = 0.1;
            const numPoints = Math.ceil((plotMax - plotMin) / stepSize);
            const xGauss = [];
            for (let i = 0; i <= numPoints; i++) {
                xGauss.push(plotMin + i * stepSize);
            }
            
            // Sum of all Gaussians
            const totalY = new Array(numPoints).fill(0);
            
            // Group peaks by element and energy for coloring
            const combinedPeaks = {};
            allSpectrumData.forEach(d => {
                const key = `${d.elementKey}_${d.photonEnergy}`;
                if (!combinedPeaks[key]) {
                    combinedPeaks[key] = {
                        peaks: [],
                        elementKey: d.elementKey,
                        photonEnergy: d.photonEnergy,
                        energyIndex: d.energyIndex
                    };
                }
                combinedPeaks[key].peaks.push(d);
            });
            
            // Add individual Gaussian traces per combination
            Object.values(combinedPeaks).forEach(combo => {
                const colors = this.selectedPhotonEnergies.length > 1
                    ? ENERGY_COLORS[combo.energyIndex % ENERGY_COLORS.length]
                    : (ELEMENT_COLORS[combo.elementKey] || { fill: '#667eea', line: '#764ba2' });
                const element = ELEMENTS_DATA[combo.elementKey];
                const elementY = new Array(numPoints).fill(0);
                
                combo.peaks.forEach(peak => {
                    const mu = peak.x;
                    const amplitude = peak.y;
                    
                    for (let i = 0; i < numPoints; i++) {
                        const x = xGauss[i];
                        const gauss = amplitude * Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2));
                        elementY[i] += gauss;
                        totalY[i] += gauss;
                    }
                });
                
                const hexToRgba = (hex, alpha) => {
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                };
                
                const traceName = this.selectedPhotonEnergies.length > 1
                    ? `${element.name} @ ${combo.photonEnergy} eV Gaussian`
                    : `${element.name} Gaussian`;
                
                traces.push({
                    x: xGauss,
                    y: elementY,
                    type: 'scatter',
                    mode: 'lines',
                    name: traceName,
                    line: { color: hexToRgba(colors.fill, 0.8), width: 2 },
                    showlegend: false,
                    hoverinfo: 'skip'
                });
            });
            
            // Add total sum trace
            const blackRgba = 'rgba(0,0,0,0.8)';
            traces.push({
                x: xGauss,
                y: totalY,
                type: 'scatter',
                mode: 'lines',
                name: 'Total',
                line: { color: blackRgba, width: 2 },
                showlegend: true,
                hovertemplate: 'Kinetic Energy: %{x:.1f} eV<br>Intensity: %{y:.3f}<extra>Total</extra>',
                connectgaps: false
            });
        }
        
        Plotly.newPlot('spectrum-plot', traces, layout, config);
        
        // Store spectrum data for annotation updates
        this.currentSpectrumData = allSpectrumData;
        
        // Add annotations for shell labels
        this.addShellAnnotations(allSpectrumData);
        
        // Listen for plot changes to recalculate annotations
        const plotDiv = document.getElementById('spectrum-plot');
        plotDiv.removeAllListeners?.('plotly_relayout');
        plotDiv.removeAllListeners?.('plotly_legendclick');
        
        plotDiv.on('plotly_relayout', (eventData) => {
            if (this._updatingAnnotations) return;
            if (eventData && (eventData['xaxis.range[0]'] !== undefined || 
                              eventData['yaxis.range[0]'] !== undefined ||
                              eventData['xaxis.autorange'] !== undefined ||
                              eventData['yaxis.autorange'] !== undefined)) {
                this.repositionAnnotations();
            }
        });
        
        plotDiv.on('plotly_legendclick', (eventData) => {
            const clickedIndex = eventData.curveNumber;
            const trace = eventData.data[clickedIndex];
            
            // Update visibility tracking
            if (trace.meta) {
                const { elementKey, photonEnergy } = trace.meta;
                const isVisible = trace.visible === true || trace.visible === undefined;
                
                if (isVisible) {
                    // Will become hidden
                    this.visibleElements.delete(elementKey);
                    this.visibleEnergies.delete(photonEnergy);
                } else {
                    // Will become visible
                    this.visibleElements.add(elementKey);
                    this.visibleEnergies.add(photonEnergy);
                }
            }
            
            setTimeout(() => this.updateAnnotationVisibility(), 50);
        });
    }
    
    updateAnnotationVisibility() {
        // Don't show annotations if toggle is off
        if (!this.showAnnotations) {
            Plotly.relayout('spectrum-plot', { annotations: [] });
            return;
        }
        // Filter spectrum data to only include visible elements and energies
        const visibleData = this.currentSpectrumData.filter(d => 
            this.visibleElements.has(d.elementKey) && this.visibleEnergies.has(d.photonEnergy)
        );
        this.addShellAnnotations(visibleData);
    }
    
    addShellAnnotations(spectrumData) {
        // Simple annotation placement: just put labels above each bar
        if (spectrumData.length === 0 || !this.showAnnotations) {
            Plotly.relayout('spectrum-plot', { annotations: [] });
            return;
        }
        
        // Filter to only peaks with positive kinetic energy
        const validData = spectrumData.filter(d => d.x >= 1.0);
        
        if (validData.length === 0) {
            Plotly.relayout('spectrum-plot', { annotations: [] });
            return;
        }
        
        // Sort by x position (kinetic energy) descending for overlap handling
        validData.sort((a, b) => b.x - a.x);
        
        // Simple annotations: place each label directly above its bar
        // Use yref='paper' for consistent positioning
        const annotations = validData.map((d, index) => {
            const elementColor = ELEMENT_COLORS[d.elementKey]?.fill || '#333';
            
            // Stagger y position slightly to avoid overlap (alternating heights)
            const yOffset = 1.02 + (index % 3) * 0.04;
            
            return {
                x: d.x,  // Use kinetic energy directly
                xref: 'x',
                y: yOffset,
                yref: 'paper',
                text: d.shell,
                showarrow: true,
                arrowhead: 0,
                arrowsize: 1,
                arrowwidth: 1,
                arrowcolor: elementColor,
                ax: 0,
                ay: 20 + (index % 3) * 15,  // Arrow length varies to stagger
                font: { size: 10, color: elementColor, weight: 'bold' },
                bgcolor: 'rgba(255,255,255,0.8)',
                borderpad: 2
            };
        });
        
        this._updatingAnnotations = true;
        Plotly.relayout('spectrum-plot', { annotations: annotations }).then(() => {
            this._updatingAnnotations = false;
        }).catch(() => {
            this._updatingAnnotations = false;
        });
    }
    
    repositionAnnotations() {
        // Debounce to avoid too many recalculations
        if (this._repositionTimeout) {
            clearTimeout(this._repositionTimeout);
        }
        this._repositionTimeout = setTimeout(() => {
            // Filter by visible elements and energies
            const visibleData = this.currentSpectrumData.filter(d => 
                this.visibleElements.has(d.elementKey) && this.visibleEnergies.has(d.photonEnergy)
            );
            this.addShellAnnotations(visibleData);
        }, 50);
    }
    
    updateYAxisOnly() {
        // Only update the y-axis scale type, preserving the current x-axis range
        const yAxisType = this.logScale ? 'log' : 'linear';
        Plotly.relayout('spectrum-plot', { 'yaxis.type': yAxisType });
    }
}

// Initialize the plotter when page loads
document.addEventListener('DOMContentLoaded', () => {
    new SpectrumPlotter();
});