import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import json
from collections import defaultdict

def synthSpectrum_interactive(element, setPhoton, emax=1000, emin=0, ret=0):
    """
    Generate interactive spectrum data that can be plotted with Plotly
    Returns plot data instead of creating matplotlib plot
    """
    plot_data = []
    
    for eV in setPhoton:
        height = []
        betas = []
        cs = []
        pos = eV - element[1].iloc[0,:].values - ret
        mask = pos > 0
        eKin = pos[mask]
        shell = element[1].columns[mask]
        
        for e, orbital in zip(eKin, element[2]):
            if len(orbital) > 0:  # Check if orbital data exists
                nearestIdx = (orbital["Photon Energy"] - e).abs().idxmin()
                nearestRow = orbital.loc[nearestIdx]
                height = nearestRow["cs0"]
                beta = nearestRow["beta0"]
                betas.append(beta)
                cs.append(height)
        
        # Filter data based on energy range
        filtered_data = []
        for i, (x_val, shell_label, cross_section, beta) in enumerate(zip(eKin, shell, cs, betas)):
            if emax > x_val > emin:
                filtered_data.append({
                    'energy': x_val,
                    'shell': shell_label,
                    'cross_section': cross_section,
                    'beta': beta,
                    'photon_energy': eV
                })
        
        plot_data.extend(filtered_data)
    
    return plot_data

def create_interactive_plot(element_data, emax=1000, emin=0, ret=0):
    """Create a Plotly interactive plot"""
    photon_energies = [1000, 1486.6]
    plot_data = synthSpectrum_interactive(element_data, photon_energies, emax, emin, ret)
    
    if not plot_data:
        return None
    
    df = pd.DataFrame(plot_data)
    
    fig = go.Figure()
    
    # Group by photon energy
    for photon_energy in df['photon_energy'].unique():
        subset = df[df['photon_energy'] == photon_energy]
        
        fig.add_trace(go.Bar(
            x=subset['energy'],
            y=subset['cross_section'],
            name=f'{photon_energy} eV X-ray',
            opacity=0.7,
            hovertemplate='<b>%{customdata[0]}</b><br>' +
                         'Energy: %{x} eV<br>' +
                         'Cross Section: %{y:.3f} Mb<br>' +
                         'β: %{customdata[1]:.2f}<br>' +
                         '<extra></extra>',
            customdata=list(zip(subset['shell'], subset['beta']))
        ))
    
    fig.update_layout(
        title=f'{element_data[0]} XPS Spectrum',
        xaxis_title='Kinetic Energy (eV)',
        yaxis_title='Cross Section (Mb)',
        yaxis_type='log',
        xaxis=dict(range=[emin, emax], autorange='reversed'),
        height=500,
        hovermode='closest',
        template='plotly_white'
    )
    
    return fig

def generate_all_element_data():
    """Generate JSON data for all elements for JavaScript access"""
    from elements import neon, argon, krypton
    
    elements_data = {}
    
    for element in [neon, argon, krypton]:
        element_name = element[0].lower()
        
        # Convert element data to JSON-serializable format
        binding_energies = element[1].iloc[0].to_dict()
        
        # Convert shell data to JSON format
        shell_data = []
        for orbital in element[2]:
            if len(orbital) > 0:
                shell_data.append({
                    'photon_energy': orbital['Photon Energy'].tolist(),
                    'cs0': orbital['cs0'].tolist(),
                    'beta0': orbital['beta0'].tolist()
                })
            else:
                shell_data.append({
                    'photon_energy': [],
                    'cs0': [],
                    'beta0': []
                })
        
        elements_data[element_name] = {
            'name': element[0],
            'binding_energies': binding_energies,
            'shell_data': shell_data
        }
    
    return elements_data