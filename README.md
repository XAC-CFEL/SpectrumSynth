# SpectrumSynth

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
