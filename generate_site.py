#!/usr/bin/env python3
"""
Main script to generate interactive spectrum plots for the GitHub Pages site
"""

import plotly.graph_objects as go
import plotly.offline as pyo
import json
import os
import shutil
from elements import neon, argon, krypton
from interactive_spectrum import generate_all_element_data, create_interactive_plot

def setup_directories():
    """Create necessary directories for output"""
    os.makedirs('docs', exist_ok=True)
    os.makedirs('docs/plots', exist_ok=True)
    print("✓ Created output directories")

def generate_interactive_data():
    """Generate JavaScript data file for interactive plotting"""
    elements_data = generate_all_element_data()
    
    # Create JavaScript file with element data
    js_content = f"""// Element data for interactive plotting
const ELEMENTS_DATA = {json.dumps(elements_data, indent=2)};

// Available photon energies (eV)
const PHOTON_ENERGIES = [1000, 1486.6];

// Default parameters
const DEFAULT_PARAMS = {{
    emax: 800,
    emin: 0,
    ret: 0,
    element: 'neon',
    photon_energy: 1486.6
}};
"""
    
    with open('docs/elements_data.js', 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    print("✓ Generated elements_data.js")

def generate_sample_plots():
    """Generate a few sample static plots for fallback"""
    elements = [neon, argon, krypton]
    
    for element in elements:
        element_name = element[0].lower()
        
        # Create one sample interactive plot
        fig = create_interactive_plot(element, emax=800, emin=0, ret=0)
        
        if fig:
            # Save as HTML
            html_file = f'docs/plots/{element_name}_sample.html'
            fig.write_html(html_file, include_plotlyjs='cdn')
            print(f"✓ Generated {element_name}_sample.html")
    
    return True

def create_html_page():
    """Create the interactive HTML page"""
    
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SpectrumSynth - Interactive XPS Analysis</title>
    <link rel="stylesheet" href="styles.css">
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
</head>
<body>
    <header>
        <div class="container">
            <h1>SpectrumSynth</h1>
            <p class="subtitle">Interactive X-ray Photoelectron Spectroscopy (XPS) Analysis</p>
        </div>
    </header>

    <main class="container">
        <section class="intro">
            <h2>Interactive XPS Analysis</h2>
            <p>Generate and customize XPS spectra in real-time using the controls below. 
            Adjust parameters to see how they affect the spectrum appearance.</p>
        </section>

        <section class="controls">
            <div class="control-panel">
                <div class="control-group">
                    <label for="element-select">Element:</label>
                    <select id="element-select">
                        <option value="neon">Neon (Ne)</option>
                        <option value="argon">Argon (Ar)</option>
                        <option value="krypton">Krypton (Kr)</option>
                    </select>
                </div>
                
                <div class="control-group">
                    <label for="photon-energy-select">X-ray Source:</label>
                    <select id="photon-energy-select">
                        <option value="1000">1000 eV</option>
                        <option value="1486.6" selected>1486.6 eV (Al Kα)</option>
                    </select>
                </div>
                
                <div class="control-group">
                    <label for="ret-slider">Work Function (φ): <span id="ret-value">0</span> eV</label>
                    <input type="range" id="ret-slider" min="0" max="10" value="0" step="0.1">
                </div>
                
                <div class="control-group">
                    <label for="emin-slider">Min Energy: <span id="emin-value">0</span> eV</label>
                    <input type="range" id="emin-slider" min="0" max="200" value="0" step="5">
                </div>
                
                <div class="control-group">
                    <label for="emax-slider">Max Energy: <span id="emax-value">800</span> eV</label>
                    <input type="range" id="emax-slider" min="200" max="1200" value="800" step="10">
                </div>
                
                <button id="update-plot" class="update-btn">Update Spectrum</button>
            </div>
        </section>

        <section class="plot-area">
            <div id="spectrum-plot"></div>
        </section>

        <section class="element-info">
            <div id="binding-energies">
                <h3>Binding Energies</h3>
                <div id="binding-list"></div>
            </div>
        </section>

        <section class="methodology">
            <h2>How It Works</h2>
            <p>The interactive spectrum is calculated using:</p>
            <ul>
                <li><strong>Kinetic Energy</strong>: E_kinetic = E_photon - E_binding - φ</li>
                <li><strong>Cross-sections</strong>: From theoretical atomic physics data</li>
                <li><strong>Asymmetry parameters (β)</strong>: Control peak shapes and intensities</li>
                <li><strong>Interactive ranges</strong>: Zoom and filter the energy range in real-time</li>
            </ul>
        </section>
    </main>

    <footer>
        <div class="container">
            <p>&copy; 2024 SpectrumSynth | Interactive XPS Analysis Tool</p>
        </div>
    </footer>

    <script src="elements_data.js"></script>
    <script src="spectrum_plot.js"></script>
</body>
</html>"""

    with open('docs/index.html', 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print("✓ Created interactive index.html")

def create_css_file():
    """Create the CSS stylesheet for interactive interface"""
    css_content = """/* SpectrumSynth Interactive Styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    line-height: 1.6;
    color: #333;
    background-color: #f8f9fa;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 2rem 0;
    text-align: center;
}

header h1 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
    font-weight: 300;
}

.subtitle {
    font-size: 1.2rem;
    opacity: 0.9;
}

main {
    padding: 2rem 0;
}

section {
    margin-bottom: 2rem;
    background: white;
    padding: 2rem;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

h2 {
    color: #667eea;
    margin-bottom: 1rem;
    font-size: 1.8rem;
}

h3 {
    color: #764ba2;
    margin-bottom: 1rem;
}

/* Control Panel Styles */
.control-panel {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
    align-items: end;
}

.control-group {
    display: flex;
    flex-direction: column;
}

.control-group label {
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: #555;
}

.control-group select {
    padding: 0.75rem;
    border: 2px solid #e0e0e0;
    border-radius: 6px;
    font-size: 1rem;
    background: white;
    transition: border-color 0.3s ease;
}

.control-group select:focus {
    outline: none;
    border-color: #667eea;
}

.control-group input[type="range"] {
    -webkit-appearance: none;
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: #e0e0e0;
    outline: none;
    transition: background 0.3s ease;
}

.control-group input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
    transition: background 0.3s ease;
}

.control-group input[type="range"]::-webkit-slider-thumb:hover {
    background: #764ba2;
}

.control-group input[type="range"]::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
    border: none;
}

.update-btn {
    padding: 0.75rem 2rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.update-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.update-btn:active {
    transform: translateY(0);
}

/* Plot Area */
.plot-area {
    padding: 1rem;
}

#spectrum-plot {
    width: 100%;
    height: 500px;
}

/* Element Info */
.binding-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
}

.binding-item {
    background: #f8f9fa;
    padding: 0.75rem;
    border-radius: 6px;
    border-left: 4px solid #667eea;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.shell {
    font-weight: 600;
    color: #764ba2;
}

.energy {
    font-family: 'Courier New', monospace;
    background: #e9ecef;
    padding: 0.2rem 0.5rem;
    border-radius: 3px;
}

/* Methodology */
.methodology ul {
    margin-left: 2rem;
}

.methodology li {
    margin-bottom: 0.5rem;
}

code {
    background: #f1f3f4;
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
}

footer {
    background: #343a40;
    color: white;
    text-align: center;
    padding: 1.5rem 0;
    margin-top: 2rem;
}

/* Responsive Design */
@media (max-width: 768px) {
    .control-panel {
        grid-template-columns: 1fr;
    }
    
    .binding-grid {
        grid-template-columns: 1fr;
    }
    
    header h1 {
        font-size: 2rem;
    }
    
    .subtitle {
        font-size: 1rem;
    }
    
    section {
        padding: 1rem;
    }
}

/* Loading animation */
.loading {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* Print styles */
@media print {
    header {
        background: none;
        color: black;
    }
    
    .control-panel, .update-btn {
        display: none;
    }
    
    #spectrum-plot {
        page-break-inside: avoid;
    }
}
"""

    with open('docs/styles.css', 'w', encoding='utf-8') as f:
        f.write(css_content)
    
    print("✓ Created interactive styles.css")

def create_readme():
    """Create a README for the project"""
    readme_content = """# SpectrumSynth

A tool for generating synthetic X-ray Photoelectron Spectroscopy (XPS) spectra for different elements.

## Features

- Generate XPS spectra for Neon, Argon, and Krypton
- Uses theoretical cross-sections and binding energies
- Includes asymmetry parameter (β) calculations
- Static HTML output suitable for GitHub Pages

## Usage

Run the main script to generate all plots and the HTML page:

```bash
python generate_site.py
```

This will create a `docs/` directory with:
- `index.html` - Main webpage
- `styles.css` - Stylesheet  
- `plots/` - Generated spectrum images

## Data Sources

- Binding energies from NIST X-ray Photoelectron Spectroscopy Database
- Cross-sections from theoretical calculations
- Shell data from tabulated atomic physics references

## GitHub Pages

This project is designed to work with GitHub Pages. Simply:
1. Push your code to a GitHub repository
2. Enable GitHub Pages with source set to `/docs` folder
3. Your site will be available at `https://username.github.io/repository-name`

## Requirements

- Python 3.6+
- matplotlib
- pandas

Install dependencies:
```bash
pip install matplotlib pandas
```

## File Structure

```
SpectrumSynth/
├── elements.py          # Element data and binding energies
├── synthSpectrum.py     # Core spectrum generation function
├── generate_site.py     # Main site generation script
├── database/            # CSV files with cross-section data
└── docs/               # Generated website files
    ├── index.html
    ├── styles.css
    └── plots/          # Generated spectrum images
```
"""

    with open('README.md', 'w', encoding='utf-8') as f:
        f.write(readme_content)
    
    print("✓ Created README.md")

def main():
    """Main execution function"""
    print("🚀 Generating Interactive SpectrumSynth GitHub Pages site...\n")
    
    # Setup
    setup_directories()
    
    # Generate interactive data only (all plotting is client-side JS)
    print("\n📊 Generating element data for client-side plotting...")
    generate_interactive_data()
    
    # Create web page
    print("\n🌐 Creating interactive HTML page...")
    create_html_page()
    create_css_file()
    create_readme()
    
    print(f"\n✅ Interactive site generation complete!")
    print(f"📁 Files created in 'docs/' directory:")
    print(f"   - index.html (interactive interface)")
    print(f"   - styles.css (responsive styling)") 
    print(f"   - spectrum_plot.js (client-side plotting)")
    print(f"   - elements_data.js (element data)")
    print(f"\n🔗 Ready for GitHub Pages deployment!")
    print(f"🎮 Features:")
    print(f"   - Element dropdown selector")
    print(f"   - Custom photon energy input field")
    print(f"   - Preset energy buttons (Al Kα, Mg Kα, He I, He II)")
    print(f"   - Work function (ret) slider")
    print(f"   - Interactive emin/emax range controls")

if __name__ == "__main__":
    main()