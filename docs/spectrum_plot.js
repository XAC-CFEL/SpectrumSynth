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
            showGaussians: false,
            gaussianWidth: 1.0, // Default 1% of energy
            gaussianFixedWidth: 0.0, // Default 0 eV fixed width
            showAnnotations: true,
            showAuger: true, // Show Auger peaks by default
            gasMultipliers: {},
            energyMultipliers: {}
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
                this.showGaussians = settings.showGaussians !== undefined ? settings.showGaussians : this.defaults.showGaussians;
                this.gaussianWidth = settings.gaussianWidth !== undefined ? settings.gaussianWidth : this.defaults.gaussianWidth;
                this.gaussianFixedWidth = settings.gaussianFixedWidth !== undefined ? settings.gaussianFixedWidth : this.defaults.gaussianFixedWidth;
                this.showAnnotations = settings.showAnnotations !== undefined ? settings.showAnnotations : this.defaults.showAnnotations;
                this.showAuger = settings.showAuger !== undefined ? settings.showAuger : this.defaults.showAuger;
                this.gasMultipliers = settings.gasMultipliers || {};
                this.energyMultipliers = settings.energyMultipliers || {};
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
        this.showGaussians = this.defaults.showGaussians;
        this.gaussianWidth = this.defaults.gaussianWidth;
        this.gaussianFixedWidth = this.defaults.gaussianFixedWidth;
        this.showAnnotations = this.defaults.showAnnotations;
        this.showAuger = this.defaults.showAuger;
        this.gasMultipliers = {};
        this.energyMultipliers = {};
    }
    
    saveToCache() {
        try {
            const settings = {
                elements: this.selectedElements,
                photonEnergies: this.selectedPhotonEnergies,
                ret: this.currentRet,
                logScale: this.logScale,
                showGaussians: this.showGaussians,
                gaussianWidth: this.gaussianWidth,
                gaussianFixedWidth: this.gaussianFixedWidth,
                showAnnotations: this.showAnnotations,
                showAuger: this.showAuger,
                gasMultipliers: this.gasMultipliers,
                energyMultipliers: this.energyMultipliers
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
        
        // Update gaussians toggle buttons
        this.updateGaussiansButtons();
        
        // Update annotations toggle buttons
        this.updateAnnotationsButtons();
        
        // Update Auger toggle buttons
        this.updateAugerButtons();
        
        // Update multiplier inputs
        this.updateGasMultipliers();
        this.updateEnergyMultipliers();
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
            // Initialize multiplier if not set
            if (!this.gasMultipliers[elementKey]) {
                this.gasMultipliers[elementKey] = 1.0;
            }
            this.saveToCache();
            this.updateSelectedElementsDisplay();
            this.updateAddElementDropdown();
            this.updateGasMultipliers();
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
            this.updateGasMultipliers();
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
            // Initialize multiplier if not set
            if (!this.energyMultipliers[energyNum]) {
                this.energyMultipliers[energyNum] = 1.0;
            }
            this.saveToCache();
            this.updateSelectedEnergiesDisplay();
            this.updateEnergyMultipliers();
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
            this.updateEnergyMultipliers();
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
    
    updateGaussiansButtons() {
        const onBtn = document.getElementById('gaussians-on-btn');
        const offBtn = document.getElementById('gaussians-off-btn');
        const widthGroup = document.getElementById('gaussian-width-group');
        const fixedWidthGroup = document.getElementById('gaussian-fixed-width-group');
        
        if (this.showGaussians) {
            onBtn.classList.add('active');
            offBtn.classList.remove('active');
            widthGroup.style.display = 'block';
            fixedWidthGroup.style.display = 'block';
        } else {
            offBtn.classList.add('active');
            onBtn.classList.remove('active');
            widthGroup.style.display = 'none';
            fixedWidthGroup.style.display = 'none';
        }
    }
    
    updateAnnotationsButtons() {
        const onBtn = document.getElementById('annotations-on-btn');
        const offBtn = document.getElementById('annotations-off-btn');
        
        if (this.showAnnotations) {
            onBtn?.classList.add('active');
            offBtn?.classList.remove('active');
        } else {
            offBtn?.classList.add('active');
            onBtn?.classList.remove('active');
        }
    }
    
    updateAugerButtons() {
        const onBtn = document.getElementById('auger-on-btn');
        const offBtn = document.getElementById('auger-off-btn');
        
        if (this.showAuger) {
            onBtn?.classList.add('active');
            offBtn?.classList.remove('active');
        } else {
            offBtn?.classList.add('active');
            onBtn?.classList.remove('active');
        }
    }
    
    updateGasMultipliers() {
        const container = document.getElementById('gas-multipliers');
        if (!container) return;
        
        if (this.selectedElements.length === 0) {
            container.innerHTML = '<p class="no-elements">No elements selected</p>';
            return;
        }
        
        container.innerHTML = this.selectedElements.map(elementKey => {
            const element = ELEMENTS_DATA[elementKey];
            const color = ELEMENT_COLORS[elementKey]?.fill || '#667eea';
            const multiplier = this.gasMultipliers[elementKey] || 1.0;
            
            return `<div class="multiplier-item">
                <label class="multiplier-label">
                    <span class="multiplier-color" style="background-color: ${color}"></span>
                    ${element.name}
                </label>
                <input type="number" class="multiplier-input gas-multiplier" 
                       data-element="${elementKey}" 
                       value="${multiplier}" 
                       min="0" max="100" step="0.1">
            </div>`;
        }).join('');
        
        // Add event listeners
        container.querySelectorAll('.gas-multiplier').forEach(input => {
            input.addEventListener('change', (e) => {
                const elementKey = e.target.dataset.element;
                const value = parseFloat(e.target.value) || 1.0;
                this.gasMultipliers[elementKey] = value;
                this.saveToCache();
                this.plotSpectrum();
            });
        });
    }
    
    updateEnergyMultipliers() {
        const container = document.getElementById('energy-multipliers');
        if (!container) return;
        
        if (this.selectedPhotonEnergies.length === 0) {
            container.innerHTML = '<p class="no-energies">No energies selected</p>';
            return;
        }
        
        container.innerHTML = this.selectedPhotonEnergies.map((energy, index) => {
            const color = ENERGY_COLORS[index % ENERGY_COLORS.length]?.fill || '#667eea';
            const multiplier = this.energyMultipliers[energy] || 1.0;
            
            return `<div class="multiplier-item">
                <label class="multiplier-label">
                    <span class="multiplier-color" style="background-color: ${color}"></span>
                    ${energy} eV
                </label>
                <input type="number" class="multiplier-input energy-multiplier" 
                       data-energy="${energy}" 
                       value="${multiplier}" 
                       min="0" max="100" step="0.1">
            </div>`;
        }).join('');
        
        // Add event listeners
        container.querySelectorAll('.energy-multiplier').forEach(input => {
            input.addEventListener('change', (e) => {
                const energy = parseFloat(e.target.dataset.energy);
                const value = parseFloat(e.target.value) || 1.0;
                this.energyMultipliers[energy] = value;
                this.saveToCache();
                this.plotSpectrum();
            });
        });
    }
    
    init() {
        this.setupTabs();
        this.applySettingsToUI();
        this.setupControls();
        this.updateBindingEnergies();
        this.plotSpectrum();
    }
    
    setupTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                
                // Remove active class from all buttons and contents
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                // Add active class to clicked button and corresponding content
                btn.classList.add('active');
                document.getElementById(`${tabName}-tab`).classList.add('active');
                if (tabName === 'spectrum') {
                    setTimeout(() => {
                        const plotDiv = document.getElementById('spectrum-plot');
                        if (plotDiv && window.Plotly) {
                            Plotly.Plots.resize(plotDiv);
                        }
                    }, 50);
                }
            });
        });
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
            this.gaussianWidth = parseFloat(gaussianWidthInput.value) || 1.0;
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
        
        // Gaussian fixed width input
        const gaussianFixedWidthInput = document.getElementById('gaussian-fixed-width-input');
        gaussianFixedWidthInput.addEventListener('change', () => {
            this.gaussianFixedWidth = parseFloat(gaussianFixedWidthInput.value) || 0.0;
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
        
        // Annotations toggle
        const annotationsOnBtn = document.getElementById('annotations-on-btn');
        const annotationsOffBtn = document.getElementById('annotations-off-btn');
        
        if (annotationsOnBtn && annotationsOffBtn) {
            annotationsOnBtn.addEventListener('click', () => {
                this.showAnnotations = true;
                this.updateAnnotationsButtons();
                this.saveToCache();
                const plotDiv = document.getElementById('spectrum-plot');
                const xaxis = plotDiv.layout?.xaxis;
                const yaxis = plotDiv.layout?.yaxis;
                let xRange = null, yRange = null;
                if (xaxis && xaxis.range) xRange = [...xaxis.range];
                if (yaxis && yaxis.range) yRange = [...yaxis.range];
                this.plotSpectrum(xRange, yRange);
            });
            
            annotationsOffBtn.addEventListener('click', () => {
                this.showAnnotations = false;
                this.updateAnnotationsButtons();
                this.saveToCache();
                const plotDiv = document.getElementById('spectrum-plot');
                const xaxis = plotDiv.layout?.xaxis;
                const yaxis = plotDiv.layout?.yaxis;
                let xRange = null, yRange = null;
                if (xaxis && xaxis.range) xRange = [...xaxis.range];
                if (yaxis && yaxis.range) yRange = [...yaxis.range];
                this.plotSpectrum(xRange, yRange);
            });
        }
        
        // Auger toggle
        const augerOnBtn = document.getElementById('auger-on-btn');
        const augerOffBtn = document.getElementById('auger-off-btn');
        
        if (augerOnBtn && augerOffBtn) {
            augerOnBtn.addEventListener('click', () => {
                this.showAuger = true;
                this.updateAugerButtons();
                this.saveToCache();
                const plotDiv = document.getElementById('spectrum-plot');
                const xaxis = plotDiv.layout?.xaxis;
                const yaxis = plotDiv.layout?.yaxis;
                let xRange = null, yRange = null;
                if (xaxis && xaxis.range) xRange = [...xaxis.range];
                if (yaxis && yaxis.range) yRange = [...yaxis.range];
                this.plotSpectrum(xRange, yRange);
            });
            
            augerOffBtn.addEventListener('click', () => {
                this.showAuger = false;
                this.updateAugerButtons();
                this.saveToCache();
                const plotDiv = document.getElementById('spectrum-plot');
                const xaxis = plotDiv.layout?.xaxis;
                const yaxis = plotDiv.layout?.yaxis;
                let xRange = null, yRange = null;
                if (xaxis && xaxis.range) xRange = [...xaxis.range];
                if (yaxis && yaxis.range) yRange = [...yaxis.range];
                this.plotSpectrum(xRange, yRange);
            });
        }
        
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
            
            Object.entries(element.binding_energies).forEach(([shell, bindingEnergy], shellIndex) => {
                const shellData = element.shell_data[Math.min(shellIndex, element.shell_data.length - 1)];
                
                // Calculate beta for each selected photon energy
                let betaDisplay = 'N/A';
                if (shellData && shellData.beta0 && shellData.beta0.length > 0 && this.selectedPhotonEnergies.length > 0) {
                    if (this.selectedPhotonEnergies.length === 1) {
                        // Single energy: show one beta value
                        const photonEnergy = this.selectedPhotonEnergies[0];
                        const beta = this.getBetaForEnergy(shellData, photonEnergy, bindingEnergy);
                        betaDisplay = beta !== null ? beta.toFixed(2) : 'N/A';
                    } else {
                        // Multiple energies: show color-coded beta values
                        const betaValues = this.selectedPhotonEnergies.map((photonEnergy, energyIndex) => {
                            const beta = this.getBetaForEnergy(shellData, photonEnergy, bindingEnergy);
                            if (beta !== null) {
                                const energyColors = ENERGY_COLORS[energyIndex % ENERGY_COLORS.length];
                                return `<span style="color: ${energyColors.fill}; font-weight: bold;">β${energyIndex + 1} = ${beta.toFixed(2)}</span>`;
                            }
                            return null;
                        }).filter(v => v !== null);
                        
                        betaDisplay = betaValues.length > 0 ? betaValues.join(' | ') : 'N/A';
                    }
                }
                
                html += `<div class="binding-item">
                            <span class="shell">${shell}</span>
                            <span class="energy">${bindingEnergy} eV</span>
                            <span class="beta">${this.selectedPhotonEnergies.length === 1 ? 'β = ' : ''}${betaDisplay}</span>
                         </div>`;
            });
            
            html += '</div></div>';
        });
        
        bindingList.innerHTML = html;
    }
    
    getBetaForEnergy(shellData, photonEnergy, bindingEnergy) {
        // Calculate kinetic energy for this shell at the given photon energy
        const kineticEnergy = photonEnergy - bindingEnergy - this.currentRet;
        
        // Only valid if kinetic energy is positive
        if (kineticEnergy <= 0) {
            return null;
        }
        
        // Find nearest photon energy in shell data using the photon energy directly
        if (!shellData.photon_energy || shellData.photon_energy.length === 0) {
            return null;
        }
        
        let nearestIndex = 0;
        let minDiff = Math.abs(shellData.photon_energy[0] - photonEnergy);
        
        for (let i = 1; i < shellData.photon_energy.length; i++) {
            const diff = Math.abs(shellData.photon_energy[i] - photonEnergy);
            if (diff < minDiff) {
                minDiff = diff;
                nearestIndex = i;
            }
        }
        
        return shellData.beta0[nearestIndex] || null;
    }
    
    calculateSpectrum(elementKey, photonEnergy) {
        const element = ELEMENTS_DATA[elementKey];
        const ret = this.currentRet;
        
        // Get multipliers (default to 1.0 if not set)
        const gasMultiplier = this.gasMultipliers[elementKey] || 1.0;
        const energyMultiplier = this.energyMultipliers[photonEnergy] || 1.0;
        const totalMultiplier = gasMultiplier * energyMultiplier;
        
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
                    let minDiff = Math.abs(shellData.photon_energy[0] - photonEnergy);
                    
                    for (let i = 1; i < shellData.photon_energy.length; i++) {
                        const diff = Math.abs(shellData.photon_energy[i] - photonEnergy);
                        if (diff < minDiff) {
                            minDiff = diff;
                            nearestIndex = i;
                        }
                    }
                    
                    const crossSection = (shellData.cs0[nearestIndex] || 1.0) * totalMultiplier;
                    const beta = shellData.beta0[nearestIndex] || 1.5;
                    
                    spectrumData.push({
                        x: kineticEnergy,
                        y: crossSection,
                        shell: shell,
                        beta: beta,
                        binding_energy: bindingEnergy,
                        element: element.name,
                        isAuger: false
                    });
                }
            }
        });
        
        return spectrumData;
    }
    
    calculateAugerPeaks(elementKey, photonEnergy) {
        const element = ELEMENTS_DATA[elementKey];
        const ret = this.currentRet;
        
        // Get multipliers (default to 1.0 if not set)
        const gasMultiplier = this.gasMultipliers[elementKey] || 1.0;
        const energyMultiplier = this.energyMultipliers[photonEnergy] || 1.0;
        const totalMultiplier = gasMultiplier * energyMultiplier;
        
        const augerData = [];
        
        // Check if element has Auger peaks
        if (!element.auger_peaks || element.auger_peaks.length === 0) {
            return augerData;
        }
        
        // Process each Auger peak
        element.auger_peaks.forEach(augerPeak => {
            const originBindingKey = augerPeak.origin_binding_key;
            const originBindingEnergy = element.binding_energies[originBindingKey];
            
            // Only show Auger peak if photon energy can ionize the origin shell
            if (photonEnergy <= originBindingEnergy + ret) {
                return;
            }
            
            // Find the cross-section of the origin shell at this photon energy
            const shellIndex = Object.keys(element.binding_energies).indexOf(originBindingKey);
            const shellData = element.shell_data[Math.min(shellIndex, element.shell_data.length - 1)];
            
            if (!shellData || !shellData.photon_energy || shellData.photon_energy.length === 0) {
                return;
            }
            
            // Find nearest photon energy in data
            let nearestIndex = 0;
            let minDiff = Math.abs(shellData.photon_energy[0] - photonEnergy);
            
            for (let i = 1; i < shellData.photon_energy.length; i++) {
                const diff = Math.abs(shellData.photon_energy[i] - photonEnergy);
                if (diff < minDiff) {
                    minDiff = diff;
                    nearestIndex = i;
                }
            }
            
            const originCrossSection = shellData.cs0[nearestIndex] || 0;
            
            // Auger peak intensity = origin cross-section * intensity factor from file
            const augerIntensity = originCrossSection * augerPeak.intensity_factor * totalMultiplier;
            
            augerData.push({
                x: augerPeak.kinetic_energy,  // Auger energy is fixed, not dependent on photon energy
                y: augerIntensity,
                shell: augerPeak.channel,  // Use channel name for annotation
                beta: 0,  // Auger electrons don't have a simple beta
                binding_energy: originBindingEnergy,
                element: element.name,
                isAuger: true,
                origin: augerPeak.origin,
                peakName: augerPeak.peak_name
            });
        });
        
        return augerData;
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
                    
                    // ========== STEM LINE WIDTH SETTING ==========
                    // Change this value to adjust the width of the stem lines (in pixels)
                    const stemLineWidth = 2;
                    // ==============================================
                    
                    // Create stem lines (vertical lines from 0 to peak height)
                    spectrumData.forEach((d, idx) => {
                        // Create multiple points along the stem for continuous hover
                        const numStemPoints = 20;
                        const yStart = this.logScale ? 0.0001 : 0;
                        const yEnd = d.y;
                        const xStem = [];
                        const yStem = [];
                        
                        for (let i = 0; i <= numStemPoints; i++) {
                            xStem.push(d.x);
                            if (this.logScale) {
                                // Logarithmic interpolation for log scale
                                const logStart = Math.log10(yStart);
                                const logEnd = Math.log10(yEnd);
                                yStem.push(Math.pow(10, logStart + (logEnd - logStart) * i / numStemPoints));
                            } else {
                                // Linear interpolation for linear scale
                                yStem.push(yStart + (yEnd - yStart) * i / numStemPoints);
                            }
                        }
                        
                        // Add vertical line trace for each peak
                        traces.push({
                            x: xStem,
                            y: yStem,
                            type: 'scatter',
                            mode: 'lines',
                            name: traceName,
                            legendgroup: `${elementKey}_${photonEnergy}`,
                            showlegend: idx === 0,  // Only show legend for first peak
                            line: { color: colors.fill, width: stemLineWidth },
                            hovertemplate: `<b>${element.name} @ ${photonEnergy} eV - ${d.shell}</b><br>` +
                                          `Kinetic Energy: ${d.x.toFixed(1)} eV<br>` +
                                          `Binding Energy: ${d.binding_energy.toFixed(1)} eV<br>` +
                                          `Intensity: ${d.y.toFixed(3)} a.u.<br>` +
                                          `β: ${d.beta.toFixed(2)}<br>` +
                                          '<extra></extra>',
                            meta: { elementKey, photonEnergy, energyIndex, isStemLine: true }
                        });
                    });
                }
                
                // Calculate Auger peaks if enabled
                if (this.showAuger) {
                    const augerData = this.calculateAugerPeaks(elementKey, photonEnergy);
                    
                    // Store Auger data with metadata
                    augerData.forEach(d => allSpectrumData.push({ 
                        ...d, 
                        elementKey,
                        photonEnergy,
                        energyIndex 
                    }));
                    
                    if (augerData.length > 0) {
                        const colors = this.selectedPhotonEnergies.length > 1 
                            ? energyColors 
                            : (ELEMENT_COLORS[elementKey] || { fill: '#667eea', line: '#764ba2' });
                        
                        const traceName = this.selectedPhotonEnergies.length > 1
                            ? `${element.name} Auger @ ${photonEnergy} eV`
                            : `${element.name} Auger`;
                        
                        // ========== AUGER STEM LINE WIDTH SETTING ==========
                        // Change this value to adjust the width of Auger stem lines (in pixels)
                        const augerStemLineWidth = 2;
                        // ====================================================
                        
                        // Create stem lines for Auger peaks
                        augerData.forEach((d, idx) => {
                            // Create multiple points along the stem for continuous hover
                            const numStemPoints = 20;
                            const yStart = this.logScale ? 0.0001 : 0;
                            const yEnd = d.y;
                            const xStem = [];
                            const yStem = [];
                            
                            for (let i = 0; i <= numStemPoints; i++) {
                                xStem.push(d.x);
                                if (this.logScale) {
                                    // Logarithmic interpolation for log scale
                                    const logStart = Math.log10(yStart);
                                    const logEnd = Math.log10(yEnd);
                                    yStem.push(Math.pow(10, logStart + (logEnd - logStart) * i / numStemPoints));
                                } else {
                                    // Linear interpolation for linear scale
                                    yStem.push(yStart + (yEnd - yStart) * i / numStemPoints);
                                }
                            }
                            
                            traces.push({
                                x: xStem,
                                y: yStem,
                                type: 'scatter',
                                mode: 'lines',
                                name: traceName,
                                legendgroup: `${elementKey}_${photonEnergy}_auger`,
                                showlegend: idx === 0,
                                line: { color: colors.fill, width: augerStemLineWidth, dash: 'dot' },
                                hovertemplate: `<b>${element.name} Auger - ${d.shell}</b><br>` +
                                              `Kinetic Energy: ${d.x.toFixed(1)} eV<br>` +
                                              `Origin: ${d.origin}<br>` +
                                              `Cross Section: ${d.y.toFixed(3)} Mb<br>` +
                                              '<extra></extra>',
                                meta: { elementKey, photonEnergy, energyIndex, isAuger: true, isStemLine: true }
                            });
                        });
                    }
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
        
        // Prepare annotations for peak labels
        const annotations = [];
        if (this.showAnnotations && allSpectrumData.length > 0) {
            // Group peaks by position to avoid overlaps
            const annotationMap = new Map();
            
            allSpectrumData.forEach(d => {
                const key = `${d.x.toFixed(1)}`;
                if (!annotationMap.has(key)) {
                    annotationMap.set(key, {
                        x: d.x,
                        y: d.y,
                        shells: [d.shell],
                        element: d.element
                    });
                } else {
                    const existing = annotationMap.get(key);
                    existing.shells.push(d.shell);
                    if (d.y > existing.y) {
                        existing.y = d.y;
                        existing.element = d.element;
                    }
                }
            });
            
            annotationMap.forEach(ann => {
                const label = ann.shells.join(', ');
                annotations.push({
                    x: Math.log10(ann.x),  // Log scale for x-axis
                    y: this.logScale ? Math.log10(ann.y) : ann.y,
                    text: label,
                    showarrow: false,
                    font: {
                        size: 10,
                        color: '#333',
                        family: 'Arial, sans-serif'
                    },
                    bgcolor: 'rgba(255, 255, 255, 0.8)',
                    borderpad: 2,
                    xanchor: 'center',
                    yanchor: 'bottom'
                });
            });
        }
        
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
            legend: {
                orientation: window.innerWidth < 768 ? 'h' : 'v',
                y: window.innerWidth < 768 ? -0.2 : 1,
                x: window.innerWidth < 768 ? 0.5 : 1,
                xanchor: window.innerWidth < 768 ? 'center' : 'left',
                yanchor: window.innerWidth < 768 ? 'top' : 'top'
            },
            annotations: annotations
        };
        
        const config = {
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['select2d', 'lasso2d'],
            displaylogo: false
        };
        
        // Add Gaussian curves if enabled
        if (this.showGaussians && allSpectrumData.length > 0) {
            const widthPercent = this.gaussianWidth; // Percentage of energy (default 1%)
            const fixedWidth = this.gaussianFixedWidth; // Fixed width in eV (default 0)
            
            // Variable step size for better resolution at low energies
            // Define energy regions with different step sizes
            const gaussMin = 0.1;  // Minimum for log scale safety
            const gaussMax = maxPhotonEnergy;
            const xGauss = [];
            
            // Create points with variable step sizes
            // 0.1 to 10 eV: 0.02 eV steps (high resolution for low energies)
            // 10 to 100 eV: 0.1 eV steps
            // 100 to 1000 eV: 0.5 eV steps
            // 1000+ eV: 2.0 eV steps
            let currentEnergy = gaussMin;
            
            while (currentEnergy <= gaussMax) {
                xGauss.push(currentEnergy);
                
                // Determine step size based on current energy
                let stepSize;
                if (currentEnergy < 10) {
                    stepSize = 0.02;
                } else if (currentEnergy < 100) {
                    stepSize = 0.1;
                } else if (currentEnergy < 1000) {
                    stepSize = 0.5;
                } else {
                    stepSize = 2.0;
                }
                
                currentEnergy += stepSize;
            }
            
            // Ensure we include the max energy
            if (xGauss[xGauss.length - 1] < gaussMax) {
                xGauss.push(gaussMax);
            }
            
            const numPoints = xGauss.length;
            
            // Sum of all Gaussians
            const totalY = new Array(numPoints).fill(0);
            
            // Store individual Gaussian curves for recalculation
            this.gaussianCurves = [];
            this.gaussianXValues = xGauss;
            
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
                    // Calculate sigma as percentage of kinetic energy plus fixed width
                    const fwhm = (widthPercent / 100.0) * mu + fixedWidth;
                    const sigma = fwhm / 2.355; // Convert FWHM to sigma
                    
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
                
                // Store this curve for Total recalculation
                this.gaussianCurves.push({
                    yValues: [...elementY],
                    elementKey: combo.elementKey,
                    photonEnergy: combo.photonEnergy
                });
                
                traces.push({
                    x: xGauss,
                    y: elementY,
                    type: 'scatter',
                    mode: 'lines',
                    name: traceName,
                    line: { color: hexToRgba(colors.fill, 0.8), width: 2 },
                    showlegend: false,
                    hoverinfo: 'skip',
                    meta: { elementKey: combo.elementKey, photonEnergy: combo.photonEnergy, isGaussian: true }
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
                connectgaps: false,
                meta: { isTotal: true }
            });
        }
        
        Plotly.newPlot('spectrum-plot', traces, layout, config);
        
        // Store spectrum data for recalculation
        this.currentSpectrumData = allSpectrumData;
        this.currentGaussianXValues = this.showGaussians ? this.gaussianXValues : null;
        this.currentGaussianWidth = this.gaussianWidth;
        this.currentGaussianFixedWidth = this.gaussianFixedWidth;
        
        // Listen for plot changes - use plotly_restyle which fires AFTER visibility changes
        const plotDiv = document.getElementById('spectrum-plot');
        plotDiv.removeAllListeners?.('plotly_restyle');
        
        plotDiv.on('plotly_restyle', (eventData) => {
            // Check if this is a visibility change
            if (eventData && eventData[0] && 'visible' in eventData[0]) {
                // Recalculate Gaussians based on new visibility state
                this.recalculateGaussiansFromVisiblePeaks();
            }
        });
    }
    
    recalculateGaussiansFromVisiblePeaks() {
        if (!this.showGaussians || !this.currentSpectrumData || !this.currentGaussianXValues) {
            return;
        }
        
        const plotDiv = document.getElementById('spectrum-plot');
        if (!plotDiv || !plotDiv.data) {
            return;
        }
        
        const xGauss = this.currentGaussianXValues;
        const numPoints = xGauss.length;
        const widthPercent = this.currentGaussianWidth;
        const fixedWidth = this.currentGaussianFixedWidth || 0.0;
        
        // Build a set of visible (elementKey, photonEnergy, isAuger) combinations from scatter traces
        const visibleCombos = new Set();
        
        plotDiv.data.forEach((trace, index) => {
            // Look at scatter traces with metadata (not Gaussian or Total traces)
            if (trace.type === 'scatter' && trace.meta && !trace.meta.isGaussian && !trace.meta.isTotal) {
                const isVisible = trace.visible === true || trace.visible === undefined;
                // Only check traces that have showlegend (the representative trace for each group)
                if (isVisible && trace.showlegend) {
                    const key = `${trace.meta.elementKey}_${trace.meta.photonEnergy}_${trace.meta.isAuger || false}`;
                    visibleCombos.add(key);
                }
            }
        });
        
        // Group spectrum data by element/energy/auger and only include visible ones
        const combinedPeaks = {};
        this.currentSpectrumData.forEach(d => {
            const key = `${d.elementKey}_${d.photonEnergy}_${d.isAuger || false}`;
            if (!visibleCombos.has(key)) {
                return; // Skip hidden peaks
            }
            
            const comboKey = `${d.elementKey}_${d.photonEnergy}`;
            if (!combinedPeaks[comboKey]) {
                combinedPeaks[comboKey] = {
                    peaks: [],
                    elementKey: d.elementKey,
                    photonEnergy: d.photonEnergy,
                    energyIndex: d.energyIndex
                };
            }
            combinedPeaks[comboKey].peaks.push(d);
        });
        
        // Calculate new Gaussian curves
        const totalY = new Array(numPoints).fill(0);
        const gaussianUpdates = [];  // Store {traceIndex, yValues}
        
        // Find and update each Gaussian trace
        plotDiv.data.forEach((trace, index) => {
            if (trace.meta?.isGaussian) {
                const comboKey = `${trace.meta.elementKey}_${trace.meta.photonEnergy}`;
                const combo = combinedPeaks[comboKey];
                
                const elementY = new Array(numPoints).fill(0);
                
                if (combo && combo.peaks.length > 0) {
                    combo.peaks.forEach(peak => {
                        const mu = peak.x;
                        const amplitude = peak.y;
                        const fwhm = (widthPercent / 100.0) * mu + fixedWidth;
                        const sigma = fwhm / 2.355;
                        
                        for (let i = 0; i < numPoints; i++) {
                            const x = xGauss[i];
                            const gauss = amplitude * Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2));
                            elementY[i] += gauss;
                        }
                    });
                }
                
                // Add to total
                for (let i = 0; i < numPoints; i++) {
                    totalY[i] += elementY[i];
                }
                
                gaussianUpdates.push({ index, y: elementY });
            }
        });
        
        // Find Total trace and update
        const totalIndex = plotDiv.data.findIndex(t => t.meta?.isTotal);
        
        // Apply all updates
        gaussianUpdates.forEach(update => {
            Plotly.restyle('spectrum-plot', { y: [update.y] }, [update.index]);
        });
        
        if (totalIndex !== -1) {
            Plotly.restyle('spectrum-plot', { y: [totalY] }, [totalIndex]);
        }
    }
    
    updateTotalTrace() {
        // Recalculate the Total trace based on currently visible Gaussian traces
        if (!this.gaussianCurves || !this.gaussianXValues) {
            return;
        }
        
        const plotDiv = document.getElementById('spectrum-plot');
        if (!plotDiv || !plotDiv.data) {
            return;
        }
        
        // Sum only visible Gaussian curves
        const numPoints = this.gaussianXValues.length;
        const totalY = new Array(numPoints).fill(0);
        
        // Check actual trace visibility from the plot
        plotDiv.data.forEach((trace, index) => {
            if (trace.meta?.isGaussian) {
                // Check if this trace is actually visible
                const isVisible = trace.visible === true || trace.visible === undefined;
                if (isVisible) {
                    // Find the corresponding curve data
                    const curve = this.gaussianCurves.find(c => 
                        c.elementKey === trace.meta.elementKey && 
                        c.photonEnergy === trace.meta.photonEnergy
                    );
                    if (curve) {
                        for (let i = 0; i < numPoints; i++) {
                            totalY[i] += curve.yValues[i];
                        }
                    }
                }
            }
        });
        
        // Find the Total trace index
        const totalIndex = plotDiv.data.findIndex(t => t.meta?.isTotal);
        
        if (totalIndex !== -1) {
            // Update the Total trace y-values
            Plotly.restyle('spectrum-plot', { y: [totalY] }, [totalIndex]);
        }
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