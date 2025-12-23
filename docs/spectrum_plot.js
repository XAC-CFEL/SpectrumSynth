// Interactive spectrum plotting JavaScript with caching
const CACHE_KEY = 'spectrumSynthSettings';

// Wong colorblind-friendly color palette
const ELEMENT_COLORS = {
    neon: { fill: '#0072B2', line: '#005280' },      // Blue
    argon: { fill: '#E69F00', line: '#B37A00' },     // Orange
    krypton: { fill: '#009E73', line: '#006B4D' },   // Green
    xenon: { fill: '#CC79A7', line: '#995C7D' },     // Pink
    helium: { fill: '#F0E442', line: '#B8AD30' },    // Yellow
    radon: { fill: '#56B4E9', line: '#3D8DB8' }      // Sky blue
};

class SpectrumPlotter {
    constructor() {
        // Default values
        this.defaults = {
            elements: ['neon'],
            photonEnergy: 1486.6,
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
                this.currentPhotonEnergy = settings.photonEnergy || this.defaults.photonEnergy;
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
        this.currentPhotonEnergy = this.defaults.photonEnergy;
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
                photonEnergy: this.currentPhotonEnergy,
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
        document.getElementById('photon-energy-input').value = this.currentPhotonEnergy;
        document.getElementById('gaussian-width-input').value = this.gaussianWidth;
        
        // Update selected elements display
        this.updateSelectedElementsDisplay();
        this.updateAddElementDropdown();
        
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
        
        // Photon energy input field
        const photonInput = document.getElementById('photon-energy-input');
        photonInput.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (!isNaN(value) && value > 0) {
                this.currentPhotonEnergy = value;
                this.saveToCache();
                this.plotSpectrum();
            }
        });
        
        // Update on Enter key
        photonInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.plotSpectrum();
            }
        });
        
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
            this.plotSpectrum();
        });
        
        document.getElementById('gaussians-off-btn').addEventListener('click', () => {
            this.showGaussians = false;
            this.updateGaussiansButtons();
            this.saveToCache();
            this.plotSpectrum();
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
    
    calculateSpectrum(elementKey) {
        const element = ELEMENTS_DATA[elementKey];
        const ret = this.currentRet;
        const photonEnergy = this.currentPhotonEnergy;
        
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
        
        if (this.selectedElements.length === 0) {
            const layout = {
                title: 'XPS Spectrum - No elements selected',
                xaxis: { title: 'Kinetic Energy (eV)', range: [0, this.currentPhotonEnergy] },
                yaxis: { title: 'Cross Section (Mb)', type: yAxisType },
                height: 500,
                template: 'plotly_white'
            };
            Plotly.newPlot('spectrum-plot', [], layout);
            return;
        }
        
        // Calculate spectrum data for all selected elements
        const allSpectrumData = [];
        const traces = [];
        
        this.selectedElements.forEach(elementKey => {
            const spectrumData = this.calculateSpectrum(elementKey);
            const element = ELEMENTS_DATA[elementKey];
            const colors = ELEMENT_COLORS[elementKey] || { fill: '#667eea', line: '#764ba2' };
            
            spectrumData.forEach(d => allSpectrumData.push({ ...d, elementKey }));
            
            if (spectrumData.length > 0) {
                traces.push({
                    x: spectrumData.map(d => d.x),
                    y: spectrumData.map(d => d.y),
                    type: 'bar',
                    name: element.name,
                    opacity: 0.7,
                    hovertemplate: `<b>${element.name} - %{customdata.shell}</b><br>` +
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
                    }
                });
            }
        });
        
        // Calculate energy range from all elements' binding energies
        let allBindingEnergies = [];
        this.selectedElements.forEach(elementKey => {
            const element = ELEMENTS_DATA[elementKey];
            allBindingEnergies = allBindingEnergies.concat(Object.values(element.binding_energies));
        });
        
        const minBinding = Math.min(...allBindingEnergies);
        const maxBinding = Math.max(...allBindingEnergies);
        
        // Calculate kinetic energy range
        const minKinetic = Math.max(0, this.currentPhotonEnergy - maxBinding - this.currentRet);
        const maxKinetic = this.currentPhotonEnergy - minBinding - this.currentRet;
        const padding = (maxKinetic - minKinetic) * 0.05;
        let plotMin = Math.max(0, minKinetic - padding);
        let plotMax = maxKinetic + padding;
        let yMin = this.logScale ? 0.0001 : 0;
        let yMax = undefined;
        if (xRangeOverride && xRangeOverride.length === 2) {
            plotMin = xRangeOverride[0];
            plotMax = xRangeOverride[1];
        }
        if (yRangeOverride && yRangeOverride.length === 2) {
            yMin = yRangeOverride[0];
            yMax = yRangeOverride[1];
        }
        
        if (traces.length === 0) {
            const elementNames = this.selectedElements.map(k => ELEMENTS_DATA[k].name).join(', ');
            const layout = {
                title: `${elementNames} XPS Spectrum - No peaks (photon energy too low)`,
                xaxis: { title: 'Kinetic Energy (eV)', range: [0, this.currentPhotonEnergy] },
                yaxis: { title: 'Cross Section (Mb)', type: yAxisType },
                height: 500,
                template: 'plotly_white'
            };
            
            Plotly.newPlot('spectrum-plot', [], layout);
            return;
        }
        
        const elementNames = this.selectedElements.map(k => ELEMENTS_DATA[k].name).join(', ');
        
        const layout = {
            title: {
                text: `${elementNames} XPS Spectrum (hν = ${this.currentPhotonEnergy} eV)`,
                font: { size: 16 }
            },
            xaxis: { 
                title: 'Kinetic Energy (eV)',
                range: [plotMin, plotMax],
                autorange: false
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
            showlegend: this.selectedElements.length > 1,
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
            const energyRange = plotMax - plotMin;
            // Use step size of ~0.1 eV, with minimum 200 points and maximum 2000
            const stepSize = 0.1;
            const numPoints = Math.max(200, Math.min(2000, Math.ceil(energyRange / stepSize)));
            const xGauss = [];
            for (let i = 0; i < numPoints; i++) {
                xGauss.push(plotMin + (i / (numPoints - 1)) * energyRange);
            }
            
            // Sum of all Gaussians
            const totalY = new Array(numPoints).fill(0);
            
            // Group peaks by element for coloring
            const elementPeaks = {};
            allSpectrumData.forEach(d => {
                if (!elementPeaks[d.elementKey]) {
                    elementPeaks[d.elementKey] = [];
                }
                elementPeaks[d.elementKey].push(d);
            });
            
            // Add individual Gaussian traces per element
            Object.entries(elementPeaks).forEach(([elementKey, peaks]) => {
                const colors = ELEMENT_COLORS[elementKey] || { fill: '#667eea', line: '#764ba2' };
                const element = ELEMENTS_DATA[elementKey];
                const elementY = new Array(numPoints).fill(0);
                
                peaks.forEach(peak => {
                    const mu = peak.x; // Kinetic energy
                    const amplitude = peak.y; // Cross section
                    
                    for (let i = 0; i < numPoints; i++) {
                        const x = xGauss[i];
                        const gauss = amplitude * Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2));
                        elementY[i] += gauss;
                        totalY[i] += gauss;
                    }
                });
                
                // Add element Gaussian trace with 50% opacity
                // Convert hex color to rgba
                const hexToRgba = (hex, alpha) => {
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                };
                
                traces.push({
                    x: xGauss,
                    y: elementY,
                    type: 'scatter',
                    mode: 'lines',
                    name: `${element.name} Gaussian`,
                    line: { color: hexToRgba(colors.fill, 0.8), width: 2 },
                    showlegend: false,
                    hoverinfo: 'skip'
                });
            });
            
            // Add total sum trace (solid black line)
            // Use same hexToRgba as above for black with alpha
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
        this.visibleElements = new Set(this.selectedElements);
        
        // Add annotations for shell labels
        this.addShellAnnotations(allSpectrumData);
        
        // Listen for plot changes to recalculate annotations
        const plotDiv = document.getElementById('spectrum-plot');
        plotDiv.removeAllListeners?.('plotly_relayout');
        plotDiv.removeAllListeners?.('plotly_legendclick');
        
        plotDiv.on('plotly_relayout', (eventData) => {
            // Don't reposition if we're the ones updating annotations
            if (this._updatingAnnotations) return;
            // Only reposition on actual axis changes, not annotation updates
            if (eventData && (eventData['xaxis.range[0]'] !== undefined || 
                              eventData['yaxis.range[0]'] !== undefined ||
                              eventData['xaxis.autorange'] !== undefined ||
                              eventData['yaxis.autorange'] !== undefined)) {
                this.repositionAnnotations();
            }
        });
        
        // Listen for legend clicks to show/hide annotations
        plotDiv.on('plotly_legendclick', (eventData) => {
            const clickedIndex = eventData.curveNumber;
            const elementKey = this.selectedElements[clickedIndex];
            const trace = eventData.data[clickedIndex];
            
            // Toggle visibility - trace.visible can be true, false, or 'legendonly'
            if (trace.visible === true || trace.visible === undefined) {
                // Will become hidden
                this.visibleElements.delete(elementKey);
            } else {
                // Will become visible
                this.visibleElements.add(elementKey);
            }
            
            // Update annotations after a small delay to let Plotly update
            setTimeout(() => this.updateAnnotationVisibility(), 50);
        });
    }
    
    updateAnnotationVisibility() {
        // Don't show annotations if toggle is off
        if (!this.showAnnotations) {
            Plotly.relayout('spectrum-plot', { annotations: [] });
            return;
        }
        // Filter spectrum data to only include visible elements
        const visibleData = this.currentSpectrumData.filter(d => 
            this.visibleElements.has(d.elementKey)
        );
        this.addShellAnnotations(visibleData);
    }
    
    addShellAnnotations(spectrumData) {
        if (spectrumData.length === 0) {
            Plotly.relayout('spectrum-plot', { annotations: [] });
            return;
        }
        
        // Get plot dimensions for calculating text box sizes
        const plotDiv = document.getElementById('spectrum-plot');
        const xAxis = plotDiv._fullLayout?.xaxis;
        const yAxis = plotDiv._fullLayout?.yaxis;
        
        if (!xAxis || !yAxis) {
            // Fallback if layout not ready
            setTimeout(() => this.addShellAnnotations(spectrumData), 100);
            return;
        }
        
        // Get actual pixel dimensions and ranges
        const plotWidth = xAxis._length || 800;
        const plotHeight = yAxis._length || 400;
        const xDataRange = xAxis.range[1] - xAxis.range[0];
        
        // For log scale, Plotly stores range in log10 space already
        const yMin = yAxis.range[0];
        const yMax = yAxis.range[1];
        const yDataRange = yMax - yMin;
        
        // Conversion functions
        const dataToPixelX = (dataX) => ((dataX - xAxis.range[0]) / xDataRange) * plotWidth;
        const dataToPixelY = (dataY) => {
            // In log scale, convert data to log10, then map to pixels
            // In linear scale, use data directly
            const yVal = this.logScale ? Math.log10(Math.max(dataY, 1e-10)) : dataY;
            return plotHeight - ((yVal - yMin) / yDataRange) * plotHeight;
        };
        const pixelToDataX = (px) => xAxis.range[0] + (px / plotWidth) * xDataRange;
        const pixelToDataY = (px) => {
            const yVal = yMin + ((plotHeight - px) / plotHeight) * yDataRange;
            return this.logScale ? Math.pow(10, yVal) : yVal;
        };
        
        // Measure text using canvas for accurate width
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const fontSize = 10;
        ctx.font = `bold ${fontSize}px "Open Sans", verdana, arial, sans-serif`;
        
        const boxPadding = 4;
        
        // Build annotation boxes with measured dimensions
        const boxes = spectrumData.map(d => {
            const text = d.shell;
            const measuredWidth = ctx.measureText(text).width;
            // Box dimensions in pixels
            const w = measuredWidth + boxPadding * 2 + 10;
            const h = fontSize + boxPadding * 2 + 8;
            
            return {
                text,
                elementKey: d.elementKey,
                // Anchor position (center x, bar top for y reference)
                x: dataToPixelX(d.x),
                barTop: dataToPixelY(d.y),
                w,
                h,
                // Final position (will be set during placement)
                y: null
            };
        });
        
        // Sort by x position
        boxes.sort((a, b) => a.x - b.x);
        
        // Placed boxes list
        const placed = [];
        
        // Helper: check if box intersects with any placed box
        const intersectsAny = (box, testY) => {
            const left = box.x - box.w / 2;
            const right = box.x + box.w / 2;
            const top = testY - box.h / 2;
            const bottom = testY + box.h / 2;
            
            for (const p of placed) {
                const pLeft = p.x - p.w / 2;
                const pRight = p.x + p.w / 2;
                const pTop = p.y - p.h / 2;
                const pBottom = p.y + p.h / 2;
                
                // Check overlap: if NOT (no overlap), then they intersect
                const noOverlap = right <= pLeft || left >= pRight || bottom <= pTop || top >= pBottom;
                if (!noOverlap) {
                    return true;
                }
            }
            return false;
        };
        
        // Place each annotation
        boxes.forEach(box => {
            // Start just above the bar (y decreases going up in pixel coords)
            let y = box.barTop - box.h / 2 - 3;
            
            // Move up until no intersection
            let maxAttempts = 50;
            while (intersectsAny(box, y) && maxAttempts > 0) {
                y -= box.h + 3; // Move up by box height + gap
                maxAttempts--;
            }
            
            // Don't go above plot area
            if (y - box.h / 2 < 0) {
                y = box.h / 2 + 2;
            }
            
            box.y = y;
            placed.push(box);
        });
        
        // Create Plotly annotations using paper coordinates for y to avoid log scale issues
        const annotations = boxes.map(box => {
            const elementColor = ELEMENT_COLORS[box.elementKey]?.fill || '#333';
            // Convert pixel y to paper coordinates (0 = bottom, 1 = top)
            const yPaper = 1 - (box.y / plotHeight);
            return {
                x: pixelToDataX(box.x),
                y: yPaper,
                yref: 'paper',
                text: box.text,
                showarrow: false,
                font: { size: fontSize, color: elementColor, weight: 'bold' }
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
            // Filter by visible elements
            const visibleData = this.currentSpectrumData.filter(d => 
                this.visibleElements.has(d.elementKey)
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